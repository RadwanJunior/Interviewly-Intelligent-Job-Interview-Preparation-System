# ---------- 1) Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# ---------- 2) Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy only what's needed at runtime
COPY package.json package-lock.json* ./

# Install prod deps only
RUN npm ci --omit=dev

# Copy built app from builder
COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public
# If you have next.config.* or other config, copy them too:
COPY --from=builder /app/next.config.* ./ 2>/dev/null || true

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
