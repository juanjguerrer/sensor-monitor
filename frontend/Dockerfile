# Build stage
FROM node:22-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Final stage — nginx serves the static build and proxies /graphql to the API,
# so the browser sees a single origin and CORS never enters the picture.
FROM nginx:alpine
COPY --from=builder /usr/src/app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
