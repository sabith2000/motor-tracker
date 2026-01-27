# Motor Tracker ⚡

A modern, production-ready full-stack application to track and monitor home water pump motor usage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.1.4-green.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)

## ✨ Features

- **Real-time Monitoring**: Live status (ON/OFF) and duration timer
- **Multi-Device Sync**: Control from phone, view on PC instantly (WebSocket-like 30s heartbeat)
- **Data Persistence**: Json-based storage system with auto-archiving
- **Google Sheets Integration**: 
  - 🕛 Automatic daily export at midnight (IST)
  - 📊 Manual export button
  - 📝 formatted logs with duration calculations
- **Smart Error Handling**:
  - 🔄 Auto-retry on network failure
  - 📡 Offline detection & queueing
  - 🛡️ Session recovery after browser close/refresh
- **Modern UI**:
  - 🎨 Glassmorphism & dark mode aesthetics
  - ⚡ React + Vite for lightning speed
  - 📱 Fully responsive mobile-first design

## 🛠️ Tech Stack

**Frontend**
- React 19 + Vite
- TailwindCSS v4
- React Hot Toast
- Google Fonts (Inter + Russo One)
- Lucide React Icons

**Backend**
- Node.js + Express
- Google Sheets API v4
- Node-Cron (Scheduling)
- File-based JSON Database

**Deployment**
- Render (Web Service)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Google Cloud Service Account (credentials.json)

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/yourusername/motor-tracker.git
   cd motor-tracker
   npm install
   ```

2. **Setup Credentials**
   - Place your Google Service Account key as `credentials.json` in the root folder.
   - Create a `.env` file:
     ```env
     PORT=3001
     GOOGLE_SHEET_ID=your_sheet_id_here
     ```

3. **Run Locally**
   ```bash
   npm run dev:all
   ```
   This runs both Frontend (http://localhost:5173) and Backend (http://localhost:3001).

## 🌍 Deployment

### Deploy to Render

1. **Create Web Service**
   - Connect GitHub repo
   - Build Command: `npm install`
   - Start Command: `node server.js`

2. **Environment Variables**
   - `GOOGLE_SHEET_ID`: Just the ID string (not URL)
   - `GOOGLE_CREDENTIALS`: Paste the **entire content** of `credentials.json`

## 📁 Project Structure

```
├── data/               # Persistent JSON storage
│   ├── status.json     # Current motor state
│   ├── logs.json       # Active logs
│   └── archive.json    # Archive stats
├── public/             # Static assets (favicons)
├── src/
│   ├── components/     # React components
│   ├── api.js          # API client with retry logic
│   ├── App.jsx         # Main application logic
│   └── index.css       # Global styles & fonts
├── server.js           # Express API server
└── sheets.js           # Google Sheets integration
```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
