# BeeBeeBee

Pictochat-inspired drawing chat app.

## Prerequisites

- **Node.js** 22+ — [install via nvm](https://github.com/nvm-sh/nvm)
- **Redis** 6+ — running on default port 6379

### Install Redis (Linux)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Arch
sudo pacman -S redis
sudo systemctl start redis

# Verify
redis-cli ping
# Should print: PONG
```

## Setup

```bash
git clone https://github.com/n8Develop/BeeBeeBee.git
cd BeeBeeBee
npm install
cp .env.example .env
```

Edit `.env` and set a random `JWT_SECRET`:

```
JWT_SECRET=some-random-string-here
```

The other defaults are fine for local use. `RESEND_API_KEY` is only needed for email verification/password reset — the app works without it, you just can't verify your email.

## Run (development)

```bash
npm run dev
```

This starts both the frontend (Vite on `:5173`) and backend (Express on `:3069`).

Open **http://localhost:5173** in your browser.

## Run (production)

```bash
npm run build
npm start
```

The app serves on port **3069**. Open **http://localhost:3069**.

## LAN play

To let someone else on the same network use it, find your local IP and have them open it in their browser:

```bash
# Find your IP
hostname -I | awk '{print $1}'
```

They open `http://<your-ip>:3069` (production) or `http://<your-ip>:5173` (dev mode).

If they can't connect, open the port in your firewall:

```bash
sudo ufw allow 3069
```
