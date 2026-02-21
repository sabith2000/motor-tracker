# Changelog

All notable changes to Motor Tracker are documented here.

---

## [0.3.0-serverless] - 2026-02-21

### Added
- **Vercel Serverless Functions**: 9 API endpoints as individual serverless handlers (`api/`)
- **Vercel Cron Job**: Daily export at midnight IST via `api/cron/daily-export.js`
- **Atomic Operations**: `atomicStart()`/`atomicStop()` using `findOneAndUpdate` for race-condition safety
- **Serverless DB Connection**: Global connection caching pattern in `lib/db.js`
- **CRON_SECRET**: Security token protecting the scheduled export endpoint
- `vercel.json`: Framework config, cron schedule, function timeout settings

### Changed
- **Architecture**: Migrated from Express monolith to Vercel serverless functions
- **Frontend API**: Switched from cross-origin (Render URL) to same-origin (`/api`)
- **Project Structure**: Extracted `lib/`, `models/` to project root (from `src/server/`)
- **Models**: Added `mongoose.models` recompilation guards for serverless
- **Version**: Bumped to `0.3.0-serverless`

### Removed
- `server.js` (Express entry point)
- `render.yaml` (Render deployment config)
- `src/server/` directory (controllers, routes, utils)
- Dependencies: `express`, `cors`, `node-cron`, `concurrently`

---

## [0.2.7-dev] - 2026-02-12

### Fixed
- **Re-export Logic**: Fixed bug where re-export included unexported logs. Now only includes logs that were previously exported.
- **Re-export UX**: Simplified re-export confirmation to a single dialog (removed double confirmation).

---

## [0.2.6-dev] - 2026-02-11

### Added
- **Re-export All**: Force re-export of all logs with stubborn double confirmation
- **Export Stats**: Dashboard showing Total / Pending / Exported log counts
- **Export History Tracking**: `exportCount` and `lastExportedAt` fields on Log model
- **Export Stats API**: New `GET /api/export-stats` endpoint

### Changed
- **Export endpoint** now supports `?force=true` query param for re-exporting
- **SettingsModal** redesigned with dual export buttons (Export New + Re-export All)
- **Frontend API** auto-detects dev vs production backend URL

---

## [0.2.5-dev] - 2026-02-11

### Changed
- **Google Sheets**: Moved batch summary from separate row to column F ("Batch Info") on last data row
- Keeps data rows clean and filterable as the sheet grows
- Batch info styled as bold italic gray text (clearly metadata, not data)

---

## [0.2.4-dev] - 2026-02-11

### Added
- **Models layer**: Extracted Mongoose schemas into `src/server/models/` (`Status.js`, `Log.js`, `Archive.js`)
- **Google Sheets**: Frozen header row, auto-resized columns, zebra-stripe rows
- **Google Sheets**: Summary row per export batch with total sessions & duration
- **Google Sheets**: Duration column formatted to 1 decimal precision
- **Google Sheets**: Specific error classification (auth/permission/rate-limit/network)
- **Deployment**: Added `MONGODB_URI` and `GOOGLE_CREDENTIALS` to `render.yaml`

### Fixed
- **Bug**: Stale closure in `syncWithServer` — remote stop detection could miss state changes
- **Bug**: Elapsed time not resetting to 0 after stopping motor
- **Bug**: Duration precision — changed from whole-minute rounding to 1 decimal (e.g. `2.5 min`)
- **Bug**: `SettingsModal` useEffect missing dependency causing lint warnings
- **Bug**: Google Sheets dates appearing as serial numbers (e.g. "46328") — switched to RAW input
- **Bug**: Google Sheets data overwriting existing rows — now writes at explicit row position

### Changed
- Refactored `motorController.js` — extracted shared `exportAndArchiveLogs()` helper (removed ~25 lines of duplication)
- Refactored `ControlPanel.jsx` — grouped 14 individual props into `motorState`/`motorActions` objects
- Refactored `mongoStore.js` — imports models from `models/` directory instead of defining inline

### Removed
- Deleted `src/server/utils/fileStore.js` (legacy JSON storage, unused)
- Deleted `data/` directory (`status.json`, `logs.json`, `archive.json` — replaced by MongoDB)
- Deleted `src/assets/react.svg` and `public/vite.svg` (unused Vite defaults)

---

## [0.2.3] - 2026-02-01

### Fixed
- Header layout overlap between connection status pill and settings button
- Settings button not clickable (z-index issue)
- Moved settings button into Header component

---

## [0.2.2] - 2026-02-01

### Added
- **Header**: Connection status indicator with dot on logo
- **Header**: "Home Automation" subtitle branding
- **Footer**: Mobile connection status pill
- **Settings**: Quick Stats (total sessions, last run)
- **Settings**: About section with version info
- **ControlPanel**: Premium glow effects on button
- **CSS**: New animations (fade-in-up, pulse-glow)
- **CSS**: Stat card glass morphism styling

### Changed
- Improved loading screen with animated branded logo
- Enhanced error state UI
- Cleaner button text (removed emoji)

---

## [0.2.1] - 2026-02-01

### Changed
- Logs now persist in MongoDB after Google Sheets export
- Removed `deleteExportedLogs` function (kept for history view)

---

## [0.2.0] - 2026-01-29

### Added
- **MongoDB Integration**: Migrated from JSON files to MongoDB Atlas
- `db.js`: Connection manager with retry logic and auto-reconnect
- `mongoStore.js`: CRUD operations for status, logs, archive
- Graceful shutdown handling

### Changed
- `motorController.js`: Rewritten for async MongoDB operations
- `sheets.js`: Updated to read from MongoDB for exports
- `server.js`: Initialize MongoDB before starting Express

---

## [0.1.11] - 2026-01-28

### Fixed
- React Rules of Hooks violation in ConfirmationModal
- Duplicate utility functions removed
- Timer cleanup on remote stop detection

---

## [0.1.10] - 2026-01-28

### Fixed
- "Motor was stopped" message position above controls

---

## [0.1.9] - 2026-01-27

### Fixed
- Google Sheets credentials.json path regression
- Restored detailed API endpoint logging

### Changed
- Full codebase refactor: MVC Backend + Component-based Frontend
