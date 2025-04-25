# Use official Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install dependencies for building native modules (if needed)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy rest of the code
COPY . .

# Install TypeScript globally
RUN npm install -g typescript

# Build the TypeScript code (optional – remove if using ts-node for runtime)
RUN npm run build

# Default command (change based on how you run your app)
CMD ["npm", "start"]
