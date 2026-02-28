# Motor Tracker — Roadmap

> Last updated: 2026-02-28 | Current version: **v0.4.4**

---

## ✅ v0.1.x — Foundation (Completed)

- [x] Express + React (Vite) full-stack setup
- [x] Motor start/stop with server-side timer
- [x] JSON file-based persistence
- [x] Basic UI with start/stop button and elapsed timer
- [x] Multi-device sync via heartbeat polling
- [x] Google Sheets export (manual + cron)
- [x] MVC backend refactor (controllers, routes, utils)
- [x] Confirmation modals, error handling, offline detection

---

## ✅ v0.2.x — MongoDB + Premium UI (Completed)

- [x] **v0.2.0** — MongoDB Atlas migration (replaced JSON files with Mongoose ODM)
- [x] **v0.2.1** — Logs persist after export (kept for future history view)
- [x] **v0.2.2** — Premium UI overhaul (glassmorphism, glow effects, branded header/footer)
- [x] **v0.2.3** — Header layout fixes (z-index, settings button)
- [x] **v0.2.4** — Sheets formatting (frozen headers, zebra stripes, auto-resize, error classification), model extraction, bug fixes
- [x] **v0.2.5** — Batch summary moved to column F for clean data rows
- [x] **v0.2.6** — Re-export all, export stats dashboard, export history tracking
- [x] **v0.2.7** — Re-export bug fix (only re-exports previously exported logs)

---

## ✅ v0.3.0-serverless — Vercel Migration (Completed)

- [x] Migrated Express monolith → 9 Vercel serverless functions (`api/`)
- [x] Shared library layer (`lib/db.js`, `mongoStore.js`, `sheets.js`, `time.js`)
- [x] Mongoose models with serverless recompilation guards (`models/`)
- [x] Atomic `startMotor`/`stopMotor` using `findOneAndUpdate` (race-condition safe)
- [x] Serverless MongoDB connection caching (`global._mongooseCache`)
- [x] Replaced `node-cron` with Vercel Cron Job (midnight IST daily export)
- [x] `CRON_SECRET` protection on cron endpoint
- [x] Frontend API switched to same-origin `/api` (no CORS)
- [x] Removed: `express`, `cors`, `node-cron`, `concurrently`, `server.js`, `render.yaml`
- [x] Deployed to `motor-tracker-serverless.vercel.app`

---

## ✅ v0.4.0 — History & Analytics (Completed)

**Goal:** Full-screen history view showing all motor sessions with filtering and usage stats.

### Backend
- [x] Add `getLogsPaginated(filter, page, limit)` to `mongoStore.js`
- [x] Add `getUsageStats(days)` aggregation pipeline to `mongoStore.js`
- [x] Update `api/logs.js` — add `?page=`, `?limit=`, `?date=` query params
- [x] Create `api/stats.js` — daily usage breakdown, totals, averages

### Frontend
- [x] Add `getLogsPage()` and `getUsageStats()` to `src/api.js`
- [x] Create `HistoryModal.jsx`:
  - Summary stats bar (total sessions, total runtime, avg duration, longest)
  - Session list grouped by date (`Today`, `Yesterday`, `25 Feb 2026`)
  - Color-coded duration badges (green/amber/red)
  - Date filter chips (Today / 7 Days / 30 Days / All)
  - "Load more" pagination
  - Empty state
- [x] Add history button (clock icon) to `Header.jsx`
- [x] Wire `HistoryModal` into `App.jsx`
- [x] Add CSS for duration badges, date dividers, filter chips

### Deliverables
- Pagination and date filtering on logs API
- New `/api/stats` endpoint
- History modal accessible from header
- Mobile responsive

---

## 🔜 v0.5.0 — PWA & Offline Support (Next)

**Goal:** Installable app with offline resilience.

### Tasks
- [ ] Add service worker (cache app shell, static assets)
- [ ] Create `manifest.json` (app name, icons, theme color, start URL)
- [ ] Add "Install app" prompt / banner
- [ ] Offline indicator with graceful degradation (show cached data)
- [ ] Queue start/stop actions when offline, sync when back online (background sync)
- [ ] Cache last-known status for instant load

### Notes
- Use Workbox or vanilla service worker
- PWA score target: 90+ on Lighthouse
- Test on Android Chrome + iOS Safari

---

## 📋 v0.6.0 — Notifications & Safety Alerts

**Goal:** Proactive alerts and safety features.

### Tasks
- [ ] Push notification permission request (Web Push API)
- [ ] Alert if motor running > configurable max duration (e.g. 30 min)
- [ ] Auto-stop safety: optional automatic stop after max duration
- [ ] Daily summary notification (today's usage stats)
- [ ] Notification preferences in SettingsModal (enable/disable, max duration threshold)
- [ ] Server-side: Vercel Cron to check for long-running sessions

### Notes
- Web Push requires VAPID keys (new env vars)
- Auto-stop is a safety feature, not just a notification
- Consider SMS fallback via Twilio for critical alerts (stretch goal)

---

## 📋 v0.7.0 — Authentication & Multi-User

**Goal:** Secure access and user-scoped data.

### Tasks
- [ ] Simple PIN/password protection (no full auth service needed for personal use)
- [ ] JWT token-based sessions (stored in httpOnly cookie or localStorage)
- [ ] Login screen with branded UI
- [ ] Protected API routes (middleware to verify token)
- [ ] User model in MongoDB (username, hashed password, role)
- [ ] Role-based access: `admin` (full control) vs `viewer` (read-only)
- [ ] Activity log: track who started/stopped the motor
- [ ] Logout functionality

### Notes
- Start simple (single-user PIN), expand to multi-user later
- bcrypt for password hashing
- Consider Vercel Edge Middleware for auth checks

---

## 📋 v0.8.0 — Dashboard & Data Visualization

**Goal:** Rich analytics dashboard with charts.

### Tasks
- [ ] Usage chart: daily/weekly motor runtime (bar chart)
- [ ] Session frequency chart: sessions per day (line chart)
- [ ] Peak usage times: heatmap or time-of-day breakdown
- [ ] Monthly comparison view
- [ ] Export analytics as PDF/image (stretch goal)
- [ ] Chart library: lightweight option (Chart.js or Recharts)

### Notes
- Depends on v0.4.0 stats API as data source
- Keep charts minimal and mobile-friendly
- Dark theme chart styling

---

## 📋 v0.9.0 — Polish & Performance

**Goal:** Production hardening before stable release.

### Tasks
- [ ] Comprehensive error boundaries in React
- [ ] API rate limiting (Vercel Edge or middleware)
- [ ] Input validation on all API endpoints
- [ ] Lighthouse audit: performance, accessibility, SEO, PWA
- [ ] Bundle size optimization (code splitting, lazy loading)
- [ ] API response caching headers (SWR/stale-while-revalidate)
- [ ] Sentry or similar error tracking (free tier)
- [ ] Automated health monitoring

### Notes
- Target: 90+ Lighthouse scores across all categories
- Test on slow 3G connections
- Cross-browser testing (Chrome, Safari, Firefox)

---

## 🎯 v1.0.0-stable — Production Release

**Goal:** Fully polished, reliable, production-ready release.

### Tasks
- [ ] Final UI/UX review and polish
- [ ] Complete README with screenshots and GIFs
- [ ] API documentation (endpoints, request/response formats)
- [ ] User guide / getting started walkthrough
- [ ] All known bugs fixed
- [ ] Version badge, changelog, and release notes finalized
- [ ] GitHub release tag
- [ ] Consider custom domain setup

### Release Criteria
- All v0.4–v0.9 features implemented and tested
- Zero critical bugs
- Mobile + desktop fully responsive
- Lighthouse 90+ in all categories
- Clean git history with semantic versioning

---

## Quick Reference

| Version | Status | Summary |
|---------|--------|---------|
| v0.1.x | ✅ Done | Foundation: Express, React, JSON storage, basic UI |
| v0.2.x | ✅ Done | MongoDB, premium UI, Google Sheets export |
| v0.3.0 | ✅ Done | Serverless migration to Vercel |
| v0.4.0 | ✅ Done | History & Analytics view |
| v0.5.0 | 🔜 Next | PWA & offline support |
| v0.6.0 | 📋 Planned | Notifications & safety alerts |
| v0.7.0 | 📋 Planned | Authentication & multi-user |
| v0.8.0 | 📋 Planned | Dashboard & data visualization |
| v0.9.0 | 📋 Planned | Polish & performance |
| v1.0.0 | 🎯 Target | Stable production release |
