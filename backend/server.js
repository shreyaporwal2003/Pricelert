const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
    console.error("FATAL ERROR: MONGO_URI and JWT_SECRET environment variables are required.");
    process.exit(1);
}

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
            }
        } catch (err) {
            console.log('Invalid token for socket registration');
        }
    });
    socket.on('disconnect', () => {
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
        user: process.env.GMAIL_USER, // It's better to use environment variables
        pass: process.env.GMAIL_APP_PASS 
    }
});

async function scrapePrice(url) {
    console.log(`Scraping URL: ${url}`);
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

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

// ... the rest of your API routes and cron job remain the same ...
// (I have omitted them for brevity but they should be in your file)

// --- API Routes (abbreviated) ---
// Your /api/auth/register, /api/auth/login, etc. routes go here

// --- Start Server ---
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));