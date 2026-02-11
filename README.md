# Motor Tracker ⚡

A modern, production-ready full-stack application to track and monitor home water pump motor usage.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://motor-tracker.onrender.com/)
![Version](https://img.shields.io/badge/version-v0.2.6--dev-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

🔗 **Live Demo**: [motor-tracker.onrender.com](https://motor-tracker.onrender.com/)

---

## ✨ Features

- **Real-time Monitoring** - Live status (ON/OFF) and duration timer
- **Multi-Device Sync** - Control from phone, view on PC instantly
- **MongoDB Persistence** - Cloud-ready storage that survives restarts
- **Google Sheets Export** - Auto daily export + manual export with professional formatting
- **Modern UI** - Dark mode, glassmorphism, glow effects
- **Mobile-First** - Fully responsive design

---

## 🛠️ Tech Stack

| Frontend | Backend | Database | Deployment |
|----------|---------|----------|------------|
| React 19 + Vite | Node.js + Express | MongoDB Atlas | Render |
| TailwindCSS v4 | Google Sheets API | Mongoose ODM | |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- Google Cloud Service Account (optional, for Sheets export)

### Installation

```bash
git clone https://github.com/sabith2000/motor-tracker.git
cd motor-tracker
npm install
```

### Configuration

Create a `.env` file:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/motor-tracker
GOOGLE_SHEET_ID=your_sheet_id_here
GOOGLE_CREDENTIALS={"type":"service_account",...}
PORT=3001
```

### Run Locally

```bash
npm run dev:all    # Frontend + Backend
npm run dev        # Frontend only
npm run server     # Backend only
```

---

## 🌍 Deployment

### Render

1. **Create Web Service** → Connect GitHub repo
2. **Build Command**: `npm install`
3. **Start Command**: `node server.js`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `GOOGLE_SHEET_ID` | ❌ | Sheet ID for export |
| `GOOGLE_CREDENTIALS` | ❌ | Entire `credentials.json` content as a string |

---

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── layout/          # Header, Footer
│   │   ├── modals/          # Settings, Confirmation
│   │   └── motor/           # ControlPanel, MotorStatus
│   ├── hooks/               # Custom React hooks
│   ├── server/
│   │   ├── controllers/     # API route handlers
│   │   ├── models/          # Mongoose schemas (Status, Log, Archive)
│   │   ├── routes/          # Express route definitions
│   │   └── utils/           # db.js, mongoStore.js, sheets.js, time.js
│   ├── api.js               # Frontend API client with retry logic
│   ├── App.jsx              # Main app component
│   └── index.css            # Global styles & animations
├── server.js                # Express entry point
├── render.yaml              # Render deployment config
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
- **Auto daily export** — midnight IST via cron

---

## 🗺️ Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v0.2.x | MongoDB + SaaS UI + Sheets Export | ✅ Done |
| v0.2.5 | History View | 🔜 Next |
| v0.3.0 | PWA & Offline | 🔜 Planned |
| v1.0.0 | Stable Release | 🎯 Target |

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)
