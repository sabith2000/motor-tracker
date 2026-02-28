# Motor Tracker ⚡

A modern, production-ready full-stack application to track and monitor home water pump motor usage.

![Version](https://img.shields.io/badge/version-v0.4.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

🔗 **Live**: [motor-tracker-serverless.vercel.app](https://motor-tracker-serverless.vercel.app/)

---

## ✨ Features

- **Real-time Monitoring** - Live status (ON/OFF) and duration timer
- **History & Analytics** - Scrollable session history, daily breakdowns, and summary stats
- **Multi-Device Sync** - Control from phone, view on PC instantly
- **MongoDB Persistence** - Cloud-ready storage that survives restarts
- **Google Sheets Export** - Auto daily export + manual export with professional formatting
- **Modern UI** - Dark mode, glassmorphism, glow effects
- **Mobile-First** - Fully responsive design

---

## 🛠️ Tech Stack

| Frontend | Backend | Database | Deployment |
|----------|---------|----------|------------|
| React 19 + Vite | Vercel Serverless Functions | MongoDB Atlas | Vercel |
| TailwindCSS v4 | Google Sheets API | Mongoose ODM | |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- Google Cloud Service Account (optional, for Sheets export)
- Vercel account + CLI (`npm i -g vercel`)

### Installation

```bash
git clone https://github.com/sabith2000/motor-tracker.git
cd motor-tracker
npm install
```

### Configuration

Set environment variables via Vercel CLI:

```bash
vercel env add MONGODB_URI
vercel env add GOOGLE_SHEET_ID
vercel env add GOOGLE_CREDENTIALS
vercel env add CRON_SECRET
vercel env pull .env.local
```

### Run Locally

```bash
vercel dev    # Frontend + Serverless API at localhost:3000
```

---

## 🌍 Deployment

### Vercel

1. `vercel login` → `vercel link`
2. Set environment variables (see above)
3. `vercel --prod`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `GOOGLE_SHEET_ID` | ❌ | Sheet ID for export |
| `GOOGLE_CREDENTIALS` | ❌ | Service account JSON as string |
| `CRON_SECRET` | ❌ | Protects the daily cron endpoint |

---

## 📁 Project Structure

```
├── api/                     # Vercel serverless functions
│   ├── cron/
│   │   └── daily-export.js  # Scheduled midnight IST export
│   ├── health.js            # GET health check
│   ├── heartbeat.js         # GET server time + motor state
│   ├── status.js            # GET motor running state
│   ├── start.js             # POST start motor (atomic)
│   ├── stop.js              # POST stop motor (atomic)
│   ├── logs.js              # GET all logs
│   ├── export.js            # POST manual export
│   ├── export-stats.js      # GET export statistics
│   └── debug.js             # GET debug info
├── lib/                     # Shared server-side utilities
│   ├── db.js                # Serverless MongoDB connection
│   ├── mongoStore.js        # Data access layer
│   ├── sheets.js            # Google Sheets export
│   └── time.js              # IST time utilities
├── models/                  # Mongoose schemas
│   ├── Status.js
│   ├── Log.js
│   └── Archive.js
├── src/                     # React frontend
│   ├── components/
│   ├── hooks/
│   ├── api.js               # Frontend API client
│   ├── App.jsx
│   └── index.css
├── vercel.json              # Vercel config + cron
└── package.json
```

---

## 📊 Google Sheets Export

Motor Tracker exports run logs to Google Sheets with professional formatting:

- **Frozen header row** — stays visible while scrolling
- **Auto-sized columns** — no truncated data
- **Alternating row colors** — easy-to-read zebra stripes
- **Summary row** — total sessions and duration per export batch
- **Duration precision** — 1 decimal place (e.g., `2.5 min`)
- **Auto daily export** — midnight IST via Vercel Cron

---

## 🗺️ Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v0.2.x | MongoDB + SaaS UI + Sheets Export | ✅ Done |
| v0.3.0 | Serverless Migration (Vercel) | ✅ Done |
| v0.4.0 | History View | 🔜 Next |
| v1.0.0 | Stable Release | 🎯 Target |

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)
