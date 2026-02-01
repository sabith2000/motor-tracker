# Motor Tracker ⚡

A modern, production-ready full-stack application to track and monitor home water pump motor usage.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://motor-tracker.onrender.com/)
![Version](https://img.shields.io/badge/version-v0.2.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

🔗 **Live Demo**: [motor-tracker.onrender.com](https://motor-tracker.onrender.com/)

---

## ✨ Features

- **Real-time Monitoring** - Live status (ON/OFF) and duration timer
- **Multi-Device Sync** - Control from phone, view on PC instantly
- **MongoDB Persistence** - Cloud-ready storage that survives restarts
- **Google Sheets Export** - Automatic daily export + manual export
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
│   │   ├── controllers/     # API logic
│   │   ├── routes/          # Express routes
│   │   └── utils/           # db.js, mongoStore.js, sheets.js
│   ├── api.js               # Frontend API client
│   └── App.jsx              # Main app
└── server.js                # Express entry point
```

---

## 🗺️ Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v0.2.x | MongoDB + SaaS UI | ✅ Done |
| v0.2.5 | History View | 🔜 Next |
| v0.3.0 | PWA & Offline | 🔜 Planned |

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)
