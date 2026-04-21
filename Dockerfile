FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies (with Playwright system deps for headless Chromium)
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcb1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
 && rm -rf /var/lib/apt/lists/* \
 && npm ci \
 && npx playwright install chromium

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx tsx src/lib/db/migrate.ts && npm start"]
