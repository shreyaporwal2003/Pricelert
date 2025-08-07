# Use an official Node.js runtime
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Install dependencies needed by @sparticuz/chromium
# This is a smaller, more specific list than before
RUN apt-get update && apt-get install -yq \
    libgconf-2-4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnss3 \
    libxss1 \
    --no-install-recommends

# Copy package files
COPY package.json ./
COPY package-lock.json ./

# Install project dependencies
RUN npm ci

# Copy the rest of your app's source code
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Run the app
CMD [ "node", "server.js" ]