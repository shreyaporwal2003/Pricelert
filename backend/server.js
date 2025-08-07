const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Config ---
// In a real app, use environment variables for these
const MONGO_URI = 'mongodb+srv://shreyaporwal167:shreya167@cluster0.8mljwgq.mongodb.net/price-monitor?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = 'your_jwt_secret_key_12345'; // Replace with a long, random string for production

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully!'))
    .catch(err => console.error("MongoDB Connection ERROR:", err));

// --- Mongoose Schemas ---

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const MonitorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true },
    email: { type: String, required: true }, // Email for alerts
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


// --- Nodemailer, Scraper, and Cron Job (No changes here) ---

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shreyaporwal167@gmail.com',
        pass: 'ztcwkurqrfrnziqq'
    }
});

async function scrapePrice(url) {
    console.log(`Scraping URL: ${url}`);
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const priceElement = await page.$('.a-price-whole');
        
        if (priceElement) {
            const priceText = await page.evaluate(el => el.textContent, priceElement);
            const cleanedPrice = parseFloat(priceText.replace(/[₹$,]/g, ''));
            
            await browser.close();
            console.log(`Successfully scraped price: ${cleanedPrice}`);
            return cleanedPrice;
        } else {
            console.log(`Could not find price selector for URL: ${url}`);
            await browser.close();
            return null;
        }
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    }
}

async function sendPriceAlert(monitor, newPrice) {
    console.log(`Attempting to send email to: ${monitor.email}`);
    const mailOptions = {
        from: 'shreyaporwal167@gmail.com',
        to: monitor.email,
        subject: `Price Drop Alert for your product!`,
        html: `
            <p>Good news!</p>
            <p>The price for the product you are monitoring has dropped to <strong>₹${newPrice.toLocaleString('en-IN')}</strong>.</p>
            <p>Your target price was ₹${monitor.targetPrice.toLocaleString('en-IN')}.</p>
            <p>Check it out here: <a href="${monitor.url}">Product Link</a></p>
        `
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
        if (newPrice !== null) {
            monitor.currentPrice = newPrice;
            monitor.priceHistory.push({ price: newPrice });
            monitor.lastChecked = Date.now();
            await monitor.save();

            console.log(`Checked ${monitor.url}. New price: ${newPrice}`);

            if (newPrice <= monitor.targetPrice) {
                await sendPriceAlert(monitor, newPrice);
            }
        }
    }
    console.log('Scheduled price check finished.');
});


// --- API Routes ---

// ++ Auth Routes ++
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


// ++ Monitor Routes (Now Protected) ++

// GET all monitored items for the logged-in user
app.get('/api/monitors', auth, async (req, res) => {
    try {
        const monitors = await Monitor.find({ user: req.user.id }).sort({ date: -1 });
        res.json(monitors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new item to monitor
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

// DELETE a monitored item
app.delete('/api/monitors/:id', auth, async (req, res) => {
    try {
        let monitor = await Monitor.findById(req.params.id);
        if (!monitor) return res.status(404).json({ msg: 'Monitor not found' });
        
        // Make sure user owns the monitor
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
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
