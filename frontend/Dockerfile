# ---------- 1) Build stage ----------
FROM node:20-slim AS builder

WORKDIR /app

# Don't copy package-lock.json here – let Linux resolve its own deps
COPY package.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm run build

# ---------- 2) Runtime stage ----------
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Here you *can* use the lockfile for prod deps if you want
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next .next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
