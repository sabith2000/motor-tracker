# Motor Tracker ⚡

A modern, production-ready full-stack application to track and monitor home water pump motor usage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.2.0-green.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)

## 🆕 What's New in v0.2.0

### 🗄️ MongoDB Persistent Storage
- **Migrated** from JSON files to MongoDB Atlas for reliable data persistence
- **Works on cloud platforms** like Render without data loss on restart
- **New files**: `db.js` (connection manager), `mongoStore.js` (CRUD operations)
- **Retry logic** with auto-reconnect for network resilience

### 🐛 Bug Fixes (v0.1.11)
- Fixed React Rules of Hooks violation in ConfirmationModal
- Removed duplicate utility functions
- Fixed timer cleanup on remote stop detection

---

## ✨ Features

- **Real-time Monitoring**: Live status (ON/OFF) and duration timer
- **Multi-Device Sync**: Control from phone, view on PC instantly (3s heartbeat when running)
- **MongoDB Persistence**: Cloud-ready storage that survives server restarts
- **Google Sheets Integration**: 
  - 🕛 Automatic daily export at midnight (IST)
  - 📊 Manual export button
  - 📝 Formatted logs with duration calculations
- **Smart Error Handling**:
  - 🔄 Auto-retry on network failure
  - 📡 Offline detection
  - 🛡️ Session recovery after browser close/refresh
- **Modern UI**:
  - 🎨 Dark mode with glassmorphism effects
  - ⚡ React 19 + Vite for lightning speed
  - 📱 Fully responsive mobile-first design

---

## 🛠️ Tech Stack

| Frontend | Backend | Database | Deployment |
|----------|---------|----------|------------|
| React 19 | Node.js + Express | MongoDB Atlas | Render |
| Vite | Google Sheets API | Mongoose ODM | |
| TailwindCSS v4 | Node-Cron | | |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Google Cloud Service Account (for Sheets export)

### Installation

```bash
# Clone & Install
git clone https://github.com/yourusername/motor-tracker.git
cd motor-tracker
npm install
```

### Configuration

Create a `.env` file:

```env
# MongoDB (required)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/motor-tracker

# Google Sheets (optional, for export feature)
GOOGLE_SHEET_ID=your_sheet_id_here

# Server port
PORT=3001
```

### Run Locally

```bash
npm run dev:all    # Frontend + Backend
npm run dev        # Frontend only
npm run server     # Backend only
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 🌍 Deployment (Render)

1. **Create Web Service** → Connect GitHub repo
2. **Build Command**: `npm install`
3. **Start Command**: `node server.js`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `GOOGLE_SHEET_ID` | ❌ | Sheet ID for export (from URL) |
| `GOOGLE_CREDENTIALS` | ❌ | Entire `credentials.json` content |

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
│   │   ├── controllers/     # API logic (motorController.js)
│   │   ├── routes/          # Express routes
│   │   └── utils/           # db.js, mongoStore.js, sheets.js
│   ├── api.js               # Frontend API client
│   └── App.jsx              # Main app
├── server.js                # Express entry point
└── data/                    # Legacy JSON files (deprecated)
```

---

## 🗺️ Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v0.2.0 | MongoDB Integration | ✅ Done |
| v0.3.0 | PWA & Offline Support | 🔜 Planned |
| v0.4.0 | History View | 🔜 Planned |

---

## 📝 License

MIT License - see [LICENSE](LICENSE)
