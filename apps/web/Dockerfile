# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm exec nx build web -- --configuration=production

# ---- runner ----
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist/apps/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
