# Use a small Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
# Prefer CI install; fall back to npm install for environments without lockfile
RUN npm ci --only=production || npm install --omit=dev

# Bundle app source
COPY . .

# Set environment
ENV NODE_ENV=production
# Let platforms set PORT; default stays 3000 inside the app
# EXPOSE is informational; many PaaS ignore it
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]