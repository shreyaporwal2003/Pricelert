# PriceAlert: A Full-Stack Price Monitoring App

PriceAlert is a full-stack web application that allows users to monitor the prices of products from E-commerce websites. Users can register, submit product URLs, and set a target price. The backend server periodically scrapes the product pages and notifies the user via email and real-time dashboard updates when the price drops below their target.

***

## Technology Stack

* **Frontend:** React, Tailwind CSS, Axios, Recharts, Socket.io-client
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (with Mongoose)
* **Web Scraping:** Puppeteer
* **Real-time Communication:** Socket.IO
* **Authentication:** JSON Web Tokens (JWT)
* **Scheduled Jobs:** node-cron

***

## Features

* ✅ User registration and login system.
* ✅ Dashboard to add and view monitored products.
* ✅ Automated web scraping to track product prices.
* ✅ Real-time price updates on the dashboard using WebSockets.
* ✅ Email notifications for price drops.
* ✅ Price history visualization with charts.

***


