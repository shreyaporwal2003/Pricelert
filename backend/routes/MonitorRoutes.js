const express = require("express");
const router = express.Router();

const Monitor = require("../models/Monitor");
const scrapePrice = require("../services/scraper");
const sendPriceAlert = require("../services/emailService");
const auth = require("../middleware/auth");

// ---------------- GET all monitors ----------------
router.get("/", auth, async (req, res) => {
    try {
        const monitors = await Monitor.find({ user: req.user.id }).sort({
            lastChecked: -1,
        });

        res.json(monitors);
    } catch (err) {
        console.error("Fetch monitors error:", err.message);
        res.status(500).send("Server Error");
    }
});

// ---------------- CREATE new monitor ----------------
router.post("/", auth, async (req, res) => {
    const { url, email, targetPrice } = req.body;

    try {
        // scrape initial price
        const initialPrice = await scrapePrice(url);

        if (initialPrice === null) {
            return res.status(400).json({ message: "Could not scrape initial price" });
        }

        // create monitor in DB
        const monitor = await Monitor.create({
            user: req.user.id,
            url,
            email,
            targetPrice,
            currentPrice: initialPrice,
            priceHistory: [{ price: initialPrice }],
            lastChecked: new Date(),
        });

        // ---------- EMAIL TRIGGER ON CREATION ----------
        if (initialPrice <= targetPrice) {
            console.log("📧 Triggering email on monitor creation...");
            await sendPriceAlert(monitor, initialPrice);
        }

        res.json(monitor);
    } catch (err) {
        console.error("Create monitor error:", err.message);
        res.status(500).send("Server Error");
    }
});

// ---------------- DELETE monitor ----------------
router.delete("/:id", auth, async (req, res) => {
    try {
        const monitor = await Monitor.findById(req.params.id);

        if (!monitor) {
            return res.status(404).json({ msg: "Monitor not found" });
        }

        // ensure user owns this monitor
        if (monitor.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: "Not authorized" });
        }

        await monitor.deleteOne();

        res.json({ msg: "Monitor removed" });
    } catch (err) {
        console.error("Delete monitor error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;