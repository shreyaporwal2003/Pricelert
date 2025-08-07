const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-core'); // Changed from 'puppeteer'
const chromium = require('chrome-aws-lambda'); // Added for server compatibility
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Use the port provided by the hosting service, or 5000 for local development
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Socket.IO Setup ---
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"]
    }
});

// --- Config from Environment Variables ---
// These will be set in the Render dashboard, not in the code.
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;


// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error("MongoDB Connection ERROR:", err));

// --- Mongoose Schemas & Models ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MonitorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    email: { type: String, required: true },
    targetPrice: { type: Number, required: true },
    currentPrice: { type: Number, default: 0 },
    priceHistory: [{
        price: Number,
        date: { type: Date, default: Date.now }
    }],
    lastChecked: { type: Date, default: Date.now }
});
const Monitor = mongoose.model('Monitor', MonitorSchema);


// --- Auth Middleware ---
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};


// --- Real-time Socket Logic ---
const userSockets = new Map();
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('registerUser', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.user) {
                userSockets.set(decoded.user.id, socket.id);
                console.log(`User ${decoded.user.id} registered with socket ${socket.id}`);
            }
        } catch (err) {
            console.log('Invalid token for socket registration');
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (let [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }
    });
});


// --- Nodemailer, Scraper, and Cron Job ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shreyaporwal167@gmail.com', // Best to use environment variables for these, too!
        pass: 'ztcwkurqrfrnziqq' // This is an app password, which is correct.
    }
});

async function scrapePrice(url) {
    console.log(`Scraping URL: ${url}`);
    let browser = null;
    try {
        // --- THIS IS THE KEY CHANGE FOR RENDER DEPLOYMENT ---
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });
        // --- END OF KEY CHANGE ---

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        const priceElement = await page.$('.a-price-whole');
        if (priceElement) {
            const priceText = await page.evaluate(el => el.textContent, priceElement);
            const cleanedPrice = parseFloat(priceText.replace(/[₹$,]/g, ''));
            console.log(`Successfully scraped price: ${cleanedPrice}`);
            return cleanedPrice;
        } else {
            console.log(`Could not find price selector for URL: ${url}`);
            return null;
        }
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
}

async function sendPriceAlert(monitor, newPrice) {
    console.log(`Attempting to send email to: ${monitor.email}`);
    const mailOptions = {
        from: 'shreyaporwal167@gmail.com',
        to: monitor.email,
        subject: `Price Drop Alert for your product!`,
        html: `<p>Good news! The price for your monitored product has dropped to <strong>₹${newPrice.toLocaleString('en-IN')}</strong>.</p><p>Check it out here: <a href="${monitor.url}">Product Link</a></p>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Price alert email sent successfully to ${monitor.email}`);
    } catch (error) {
        console.error(`Failed to send email:`, error);
    }
}

cron.schedule('0 */4 * * *', async () => {
    console.log('Running scheduled price check for all users...');
    const monitors = await Monitor.find({});
    for (const monitor of monitors) {
        const newPrice = await scrapePrice(monitor.url);
        if (newPrice !== null && newPrice !== monitor.currentPrice) {
            monitor.currentPrice = newPrice;
            monitor.priceHistory.push({ price: newPrice, date: new Date() });
            monitor.lastChecked = new Date();
            const updatedMonitor = await monitor.save();

            const userId = updatedMonitor.user.toString();
            if (userSockets.has(userId)) {
                const socketId = userSockets.get(userId);
                io.to(socketId).emit('priceUpdate', updatedMonitor);
                console.log(`Emitted priceUpdate to user ${userId}`);
            }

            if (newPrice <= monitor.targetPrice) {
                await sendPriceAlert(monitor, newPrice);
            }
        }
    }
    console.log('Scheduled price check finished.');
});


// --- API Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User({ email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const payload = { user: { id: user.id } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/api/monitors', auth, async (req, res) => {
    try {
        const monitors = await Monitor.find({ user: req.user.id }).sort({ date: -1 });
        res.json(monitors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.post('/api/monitors', auth, async (req, res) => {
    const { url, email, targetPrice } = req.body;
    try {
        const initialPrice = await scrapePrice(url);
        if (initialPrice === null) {
            return res.status(400).json({ message: 'Could not scrape initial price.' });
        }
        const newMonitor = new Monitor({
            user: req.user.id,
            url,
            email,
            targetPrice,
            currentPrice: initialPrice,
            priceHistory: [{ price: initialPrice }]
        });
        const monitor = await newMonitor.save();
        if (monitor.currentPrice <= monitor.targetPrice) {
            await sendPriceAlert(monitor, monitor.currentPrice);
        }
        res.json(monitor);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

app.delete('/api/monitors/:id', auth, async (req, res) => {
    try {
        let monitor = await Monitor.findById(req.params.id);
        if (!monitor) return res.status(404).json({ msg: 'Monitor not found' });
        if (monitor.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        await Monitor.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Monitor removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Start Server ---
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));