# Server Architecture

Domain: `eling.pipdev.net` — berjalan bareng `mood-tracker.pipdev.net` di VPS yang sama.

## Port Map

| Port | Service | Bind | Akses |
|------|---------|------|-------|
| 80 | Host Nginx | `0.0.0.0` | Publik (HTTP → redirect HTTPS) |
| 443 | Host Nginx | `0.0.0.0` | Publik (HTTPS + SSL) |
| 3000 | eling-api | `127.0.0.1` | Host Nginx proxy |
| 3001 | mood-tracker-backend | `127.0.0.1` | Host Nginx proxy |
| 3002 | mood-tracker-frontend | `127.0.0.1` | Host Nginx proxy |
| 8080 | eling-caddy (→ web) | `127.0.0.1` | Host Nginx proxy |

## Topology

```
                          Internet
                             │
                   80/443    │
                  ┌──────────▼──────────────────────────┐
                  │         Host Nginx                  │
                  │  /etc/nginx/conf.d/                  │
                  │  ├── mood-tracker.conf               │
                  │  └── eling.conf                      │
                  │                                     │
                  │  server_name:                        │
                  │  mood-tracker.pipdev.net             │
                  │  eling.pipdev.net                    │
                  └──┬──────────┬──────────┬─────────────┘
                     │          │          │
              /api/  │    /*    │   /api/  │   /*
          tell-story │          │   eling  │
             :3001   │   :3002  │   :3000  │  :8080 (caddy)
                     │          │          │
              ┌──────▼──┐ ┌────▼─────┐ ┌──▼──────┐ ┌────▼──────┐
              │ backend │ │ frontend │ │ api     │ │ caddy     │
              │ Express │ │ Nginx    │ │ NestJS  │ │ (reverse  │
              │ :3001   │ │ :3002    │ │ :3000   │ │  proxy)   │
              └──────┬───┘ └─────────┘ └──┬───┬───┘ └──┬───────┘
                     │                     │   │        │
              ┌──────▼───┐        ┌───────▼┐  │   ┌────▼──────┐
              │ postgres │        │postgres│  │   │ web       │
              │(mood-    │        │(eling) │  │   │ Angular   │
              │ tracker) │        └────────┘  │   │ :80       │
              └──────────┘                    │   └───────────┘
                                      /api/ langsung ke api
                                      (bypass Caddy)
```

## Nginx Config

Config eling disimpan di `/etc/nginx/conf.d/eling.conf` — isi referensi ada di `nginx/conf.d/eling.conf` project ini.

```nginx
server {
    listen 80;
    server_name eling.pipdev.net;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name eling.pipdev.net;

    ssl_certificate     /etc/letsencrypt/live/eling.pipdev.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eling.pipdev.net/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
    }
    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

## Deploy Path

| Project | VPS Path | Docker Compose |
|---------|----------|----------------|
| eling | `/opt/eling` | `docker compose up --build -d` |
| tell-your-story | `/opt/tell-your-story` | `docker compose up --build -d` |

## CI/CD

GitHub Actions push ke `main` → SSH ke VPS → `git pull` → `docker compose up --build -d` → `systemctl reload nginx`.
