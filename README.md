# AI Avatars — D-ID Streaming с обходом блокировок

## RU

### Что это

Next.js-приложение с интерактивным AI-аватаром на базе [D-ID Streaming API](https://docs.d-id.com). Аватар говорит и реагирует в реальном времени через WebRTC-видеопоток.

### Проблема

D-ID использует WebRTC для доставки видео. В России прямые подключения к медиа-серверам D-ID блокируются на уровне DPI (глубокая инспекция пакетов) и по IP-адресам. Пользователи из РФ видят чёрный экран или не могут подключиться без VPN.

### Решение

Весь трафик маршрутизируется через собственный сервер в Нидерландах. Реализованы два уровня защиты:

**1. API-прокси** — все REST-запросы к D-ID идут не напрямую на `api.d-id.com`, а через прокси на нашем сервере. Клиент никогда не обращается к D-ID напрямую, API-ключ хранится только на сервере.

**2. TURN-сервер (coturn)** — WebRTC-медиапоток (видео/аудио) принудительно ретранслируется через наш TURN-сервер. Используется `iceTransportPolicy: 'relay'`, что гарантирует: IP-адреса D-ID никогда не попадают в браузер пользователя, весь трафик выглядит как HTTPS-соединение с нашим сервером.

### Как это работает

```
[Браузер пользователя в РФ]
        │
        │ 1. GET /api/turn-credentials
        │    ← временные HMAC-SHA1 credentials (TTL 24ч)
        │
        │ 2. Все REST-запросы к D-ID
        │    → /did-proxy/api/* (через прокси на сервере)
        │
        │ 3. WebRTC видеопоток
        │    → TURNS :8443/TCP (выглядит как HTTPS)
        │
        ▼
[Сервер NL — 72.56.123.8]
        │
        ├── Next.js (pm2)         — фронт + API-роуты
        ├── Nginx                 — reverse proxy, SSL
        ├── coturn (TURN-сервер)  — WebRTC relay на порту 8443
        └── D-ID прокси           — проброс API-запросов
        │
        ▼
[D-ID API + Media Servers]
```

### Структура проекта

```
app/
├── api/
│   └── turn-credentials/
│       └── route.ts        # Генерация временных TURN credentials (HMAC-SHA1)
├── components/
│   └── didagent.tsx        # D-ID SDK + monkey-patch RTCPeerConnection
server/
└── turnserver.conf         # Конфиг coturn для Ubuntu 22.04
.env.local                  # TURN_HOST, TURN_PORT, TURN_SECRET
```

### Настройка сервера

#### 1. Установка coturn

```bash
sudo apt update && sudo apt install -y coturn

# Создать директорию логов
sudo mkdir -p /var/log/coturn
sudo chown turnserver:turnserver /var/log/coturn

# Дать доступ к сертификатам Let's Encrypt
sudo chmod 750 /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chgrp turnserver /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chmod g+rx /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chgrp -R turnserver /etc/letsencrypt/live/YOUR_DOMAIN
sudo chgrp -R turnserver /etc/letsencrypt/archive/YOUR_DOMAIN
sudo chmod g+r /etc/letsencrypt/archive/YOUR_DOMAIN/*

# Скопировать конфиг
sudo cp server/turnserver.conf /etc/turnserver.conf

# Запустить
sudo systemctl enable coturn
sudo systemctl restart coturn
```

#### 2. Firewall (ufw)

```bash
sudo ufw allow 8443/tcp    # TURNS/TLS — основной порт
sudo ufw allow 8443/udp
sudo ufw allow 3478/udp    # TURN/UDP — fallback
sudo ufw allow 49152:65535/udp  # Relay диапазон
```

#### 3. Переменные окружения (.env.local)

```env
TURN_HOST=IP_или_домен_сервера
TURN_PORT=8443
TURN_SECRET=сгенерировать_через_openssl_rand_-hex_32
```

### Переменные окружения

| Переменная    | Описание                                                   |
|---------------|------------------------------------------------------------|
| `TURN_HOST`   | IP или домен TURN-сервера                                  |
| `TURN_PORT`   | Порт TURNS/TLS (по умолчанию `8443`)                       |
| `TURN_SECRET` | Секрет для HMAC-SHA1 генерации credentials (совпадает с `static-auth-secret` в coturn) |

### Проверка работы

1. Открой `https://your-domain/api/turn-credentials` — должен вернуть JSON с `iceServers`
2. Открой `chrome://webrtc-internals` → запусти стрим → в **ICE candidate pairs** убедись что тип = `relay` и адрес = IP твоего сервера

---

## EN

### What is this

A Next.js application featuring an interactive AI avatar powered by the [D-ID Streaming API](https://docs.d-id.com). The avatar speaks and responds in real time via a WebRTC video stream.

### The Problem

D-ID uses WebRTC to deliver video. In Russia, direct connections to D-ID media servers are blocked at the DPI (deep packet inspection) level and by IP address ranges. Russian users see a black screen or cannot connect without a VPN.

### The Solution

All traffic is routed through a dedicated server in the Netherlands. Two layers of protection are implemented:

**1. API Proxy** — all REST requests to D-ID go through a proxy on our server instead of directly to `api.d-id.com`. The client never contacts D-ID directly, and the API key is stored server-side only.

**2. TURN Server (coturn)** — the WebRTC media stream (video/audio) is forcibly relayed through our TURN server. `iceTransportPolicy: 'relay'` is enforced, which guarantees: D-ID IP addresses never reach the user's browser, and all traffic appears as a standard HTTPS connection to our server.

### How it Works

```
[User's Browser in Russia]
        │
        │ 1. GET /api/turn-credentials
        │    ← temporary HMAC-SHA1 credentials (TTL 24h)
        │
        │ 2. All REST calls to D-ID
        │    → /did-proxy/api/* (proxied through our server)
        │
        │ 3. WebRTC video stream
        │    → TURNS :8443/TCP (looks like HTTPS to ISP)
        │
        ▼
[Netherlands Server — 72.56.123.8]
        │
        ├── Next.js (pm2)         — frontend + API routes
        ├── Nginx                 — reverse proxy, SSL termination
        ├── coturn (TURN server)  — WebRTC relay on port 8443
        └── D-ID proxy            — forwards API requests
        │
        ▼
[D-ID API + Media Servers]
```

### Project Structure

```
app/
├── api/
│   └── turn-credentials/
│       └── route.ts        # Generates temporary TURN credentials (HMAC-SHA1)
├── components/
│   └── didagent.tsx        # D-ID SDK + RTCPeerConnection monkey-patch
server/
└── turnserver.conf         # coturn config for Ubuntu 22.04
.env.local                  # TURN_HOST, TURN_PORT, TURN_SECRET
```

### Server Setup

#### 1. Install coturn

```bash
sudo apt update && sudo apt install -y coturn

# Create log directory
sudo mkdir -p /var/log/coturn
sudo chown turnserver:turnserver /var/log/coturn

# Grant access to Let's Encrypt certificates
sudo chmod 750 /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chgrp turnserver /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chmod g+rx /etc/letsencrypt/live /etc/letsencrypt/archive
sudo chgrp -R turnserver /etc/letsencrypt/live/YOUR_DOMAIN
sudo chgrp -R turnserver /etc/letsencrypt/archive/YOUR_DOMAIN
sudo chmod g+r /etc/letsencrypt/archive/YOUR_DOMAIN/*

# Copy config
sudo cp server/turnserver.conf /etc/turnserver.conf

# Start
sudo systemctl enable coturn
sudo systemctl restart coturn
```

#### 2. Firewall (ufw)

```bash
sudo ufw allow 8443/tcp    # TURNS/TLS — primary port
sudo ufw allow 8443/udp
sudo ufw allow 3478/udp    # TURN/UDP — fallback
sudo ufw allow 49152:65535/udp  # Media relay range
```

#### 3. Environment Variables (.env.local)

```env
TURN_HOST=your_server_ip_or_domain
TURN_PORT=8443
TURN_SECRET=generate_with_openssl_rand_-hex_32
```

### Environment Variables

| Variable      | Description                                                        |
|---------------|--------------------------------------------------------------------|
| `TURN_HOST`   | IP address or domain of the TURN server                            |
| `TURN_PORT`   | TURNS/TLS port (default: `8443`)                                   |
| `TURN_SECRET` | Secret for HMAC-SHA1 credential generation — must match `static-auth-secret` in coturn config |

### Verifying it Works

1. Open `https://your-domain/api/turn-credentials` — should return a JSON with `iceServers`
2. Open `chrome://webrtc-internals` → start a stream → in **ICE candidate pairs** confirm the type is `relay` and the address is your server's IP
