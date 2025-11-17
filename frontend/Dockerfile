# ---------- 1) Build stage ----------
# Use latest LTS on glibc so Tailwind oxide binary is available
FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV NPM_CONFIG_OPTIONAL=true
# Force npm to resolve for linux/x64 so Tailwind oxide optional deps install
ENV npm_config_platform=linux
ENV npm_config_arch=x64

# Keep base packages patched to remove scanner findings
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --include=optional
# Ensure Tailwind native binary for linux/x64 is present
RUN npm install @tailwindcss/oxide-linux-x64-gnu@4.0.9 --no-save

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# ---------- 2) Runtime stage ----------
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_OPTIONAL=true
ENV npm_config_platform=linux
ENV npm_config_arch=x64
ENV PORT=3000

# Keep base packages patched to remove scanner findings
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Copy only what's needed at runtime
COPY package.json package-lock.json* ./

# Install prod deps only
RUN npm ci --omit=dev --include=optional
# Ensure Tailwind native binary for linux/x64 is present
RUN npm install @tailwindcss/oxide-linux-x64-gnu@4.0.9 --no-save

# Copy built app from builder
COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public
# If you have next.config.* or other config, copy them too:
COPY --from=builder /app/next.config.* ./ 2>/dev/null || true

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
