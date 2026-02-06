const cron = require("node-cron");
const Monitor = require("../models/Monitor");
const scrapePrice = require("../services/scraper");
const sendPriceAlert = require("../services/emailService");
const { emitPriceUpdate } = require("../services/socketManager");

const startPriceChecker = (io) => {
    cron.schedule("0 */4 * * *", async () => {
        const monitors = await Monitor.find({});

        for (const monitor of monitors) {
            const newPrice = await scrapePrice(monitor.url);

            if (newPrice !== null && newPrice !== monitor.currentPrice) {
                monitor.currentPrice = newPrice;
                monitor.priceHistory.push({ price: newPrice });
                monitor.lastChecked = new Date();

                const updated = await monitor.save();

                emitPriceUpdate(io, updated);

                if (newPrice <= monitor.targetPrice) {
                    await sendPriceAlert(updated, newPrice);
                }
            }
        }
    });
};

module.exports = startPriceChecker;
