# AutoDeploy.live 🚀

> Paste a GitHub URL. Get a live app. No config. No DevOps knowledge needed.

AutoDeploy.live is a self-built mini version of Vercel/Railway. It automatically clones any public GitHub repository, detects the language, generates a Dockerfile, builds a Docker image, runs the container, and returns a live URL — all in under 60 seconds, with build logs streaming to the browser in real time.

---

## ⚡ Demo

```
Input:  https://github.com/heroku/node-js-getting-started
Output: http://localhost:35975  ← live running app
```

The entire pipeline runs automatically:

```
$ Cloning repository...
$ Clone complete!
$ Detected language: node
$ Dockerfile written!
$ Building Docker image...
$ Step 1/7 : FROM node:18-alpine
$ ...
$ Image built successfully!
$ Starting container on port 35975...
$ App running at http://localhost:35975
```

---

## 🔧 How It Works

When someone clicks **Deploy**, the platform does this automatically:

1. **Clones** the GitHub repo to the server
2. **Detects** the language by reading repo files
3. **Auto-generates** a Dockerfile — zero user configuration needed
4. **Builds** the Docker image and streams every log line to the browser via WebSocket
5. **Runs** the container on a random available port
6. **Returns** a clickable live URL

> This is architecturally identical to what Vercel and Railway do internally — just on one server instead of hundreds.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Real-time logs | WebSockets |
| Containerisation | Docker |
| Database | lowdb (JSON file) |
| Process manager | pm2 (production) |
| Reverse proxy | Nginx (production) |
| SSL | Let's Encrypt via certbot |

---

## 🌐 Supported Languages

| Language | Detected by | Entry point |
|----------|------------|-------------|
| Node.js | `package.json` or `.js` files | `index.js` → `server.js` → `app.js` → `main.js` |
| Python | `requirements.txt` or `.py` files | `app.py` → `main.py` → `wsgi.py` → `run.py` |
| Go | `go.mod` or `.go` files | compiled binary |
| Ruby | `Gemfile` or `.rb` files | `app.rb` → `main.rb` → `server.rb` |

> **Note:** Only web apps that listen on an HTTP port can be deployed. Desktop apps using pygame, tkinter, or any GUI library will not work inside a Docker container.

---

## 📁 Project Structure

```
autodeploy/
├── backend/
│   ├── server.js        ← Express server + WebSocket + deploy pipeline
│   ├── detector.js      ← language detection from repo files
│   ├── dockerfile.js    ← Dockerfile template generator per language
│   ├── runner.js        ← Docker container management
│   ├── db.js            ← deploy history database
│   └── package.json
└── frontend/
    └── src/
        ├── App.jsx      ← full React UI (deploy page + history page)
        ├── main.jsx     ← Vite entry point
        └── index.css    ← minimal reset
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v20+
- Docker Desktop (must be running)
- Git

### Installation

**1. Clone the repo**

```bash
git clone https://github.com/YOURUSERNAME/autodeploy.git
cd autodeploy
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

### Running Locally

**Terminal 1 — start the backend**

```bash
cd backend
node server.js
# Backend running on port 4000
```

**Terminal 2 — start the frontend**

```bash
cd frontend
npm run dev
# Local: http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### Test It

Paste this into the input and click Deploy:

```
https://github.com/heroku/node-js-getting-started
```

Watch the logs stream live. Click the URL when it appears. Your app is running inside a Docker container.

---

## ✨ Features

- ✅ Real-time build log streaming via WebSocket
- ✅ Automatic language detection — no config files needed
- ✅ Auto-generated Dockerfiles per language
- ✅ Deploy history page with live / failed / stopped status badges
- ✅ Stop running containers directly from the UI
- ✅ Production mode with Nginx subdomain routing (`abc123.yourdomain.com`)

---

## 🌍 Production Deployment

In production the platform runs on a Linux VPS with:

- Nginx routing wildcard subdomains to containers (`*.yourdomain.com`)
- Free SSL via Let's Encrypt
- pm2 keeping the backend alive across reboots
- Each deploy gets a unique public URL

**Environment variables for your VPS:**

```env
NODE_ENV=production
DOMAIN=yourdomain.com
PORT=4000
```

---

## 🗺️ Roadmap

- [ ] React / Vite static site deployment
- [ ] Next.js support
- [ ] Django and FastAPI support
- [ ] Static HTML support
- [ ] GitHub Actions CI/CD — platform redeploys itself on every push
- [ ] Prometheus metrics + Grafana monitoring dashboard
- [ ] Webhook auto-deploy on every git push to user repos
- [ ] Authentication and user accounts
- [ ] Deploy timeout and concurrent deploy limits
- [ ] Automatic cleanup of old images and build directories

---

## 📚 What I Learned Building This

- How Docker actually works — images, layers, containers, port mapping
- What a reverse proxy does and how Nginx routes subdomains to running processes
- Why WebSockets exist and how real-time log streaming works
- How CI/CD pipelines work under the hood
- How platforms like Vercel detect languages and auto-configure deployments
- Linux server administration — Nginx config, pm2, systemctl, certbot, DNS

---

## ⚠️ Known Limitations

- No authentication on the `/deploy` endpoint
- No concurrent deploy limit
- Build directories not cleaned up after builds
- Docker images accumulate and are never deleted
- Single server — no auto-scaling

---

## 💡 Why I Built This

Most DevOps courses teach you to use managed services. I wanted to understand what those services actually do under the hood. Building AutoDeploy.live meant I had to deeply understand Docker, Nginx, WebSockets, CI/CD, and Linux server management — not just how to configure them, but why they exist and what problem each one solves.

The result: a platform where anyone can paste a GitHub link and have a live app in 30 seconds. Built from scratch. No Heroku, no Vercel, no magic.

---

## 📄 License

MIT — feel free to fork, modify, and build on this.
