# Build stage
FROM node:22-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Final stage
FROM node:22-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --omit=dev
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]