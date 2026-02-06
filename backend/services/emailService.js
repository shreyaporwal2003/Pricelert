const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendPriceAlert(monitor, newPrice) {
    try {
        console.log("📧 Attempting to send email...");
        console.log("To:", monitor.email);

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: monitor.email,
            subject: "Price Drop Alert!",
            html: `
                <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; padding:20px;">
                    
                    <h2 style="margin-bottom:10px;">Price Drop Alert</h2>

                    <p>The price of your monitored product has changed.</p>

                    <p>
                        <strong>Current Price:</strong> ₹${newPrice.toLocaleString("en-IN")} <br />
                        <strong>Your Target Price:</strong> ₹${monitor.targetPrice.toLocaleString("en-IN")}
                    </p>

                    <p>
                        You can view the product here:<br />
                        <a href="${monitor.url}" target="_blank">${monitor.url}</a>
                    </p>

                    <p style="margin-top:20px; font-size:12px; color:#777;">
                        This is an automated message from your Price Monitor app.
                    </p>

                </div>
            `,
        });

        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Email sending failed:");
        console.error(error.message);
    }
}

module.exports = sendPriceAlert;