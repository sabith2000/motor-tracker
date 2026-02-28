# Changelog

All notable changes to Motor Tracker are documented here.

---

## [0.4.5] - 2026-02-28

### Fixed
- **AM/PM Casing**: `formatTimeIST` now produces uppercase "AM/PM" instead of lowercase "am/pm" (affects Settings modal, Google Sheets, and all time displays)

---

## [0.4.4] - 2026-02-28

### Fixed
- **Export Crash**: Removed undefined `formatDateIST`/`formatTimeIST` references in `export.js` (would crash on every manual export)
- **Cron Duplication**: `daily-export.js` now uses shared `exportAndArchiveLogs` helper instead of duplicating 4 manual calls
- **Atomicity**: `exportHelper.js` wraps `markLogsAsExported` in try/catch — if marking fails after successful Sheets write, logs a warning but doesn't throw
- **Concurrent Exports**: `markLogsAsExported` now only marks logs still flagged `exportedToSheets: false`, preventing double-marking from race conditions
- **`lastExportDate`**: Changed from `String` to `Date` in MongoDB for accurate time storage and formatting

### Added
- **"Not Configured" Banner**: Settings modal shows amber warning with env var names when Google Sheets isn't set up; export buttons are hidden
- **Export Time Display**: Last export date now shows date AND time (e.g., "28/02/2026, 12:00 am")
- **`configured` Field**: `/api/export-stats` response includes `configured: true/false` for frontend state management
- **Sheet Tab Constant**: `SHEET_TAB_NAME` in `sheets.js` replaces 5 hardcoded `'Sheet1'` references

### Improved
- **Auto-archive Logging**: `stop.js` logs the count of failing logs for better traceability

---

## [0.4.3] - 2026-02-28

### Added
- **Delete Session**: Trash icon on each session row with single confirmation dialog
- **Clear All Sessions**: Red button at bottom of history with double confirmation (must type `DELETE`)
- **Delete API**: New `DELETE /api/logs-delete` endpoint (`?id=<logId>` or `?all=true`)
- `deleteLog()` and `deleteAllLogs()` data layer functions in `mongoStore.js`
- `deleteSession()` and `clearAllSessions()` frontend API functions
- Typed confirmation support in `ConfirmationModal` (`requireTypedConfirmation` prop)

### Fixed
- **Today Filter**: Now uses IST midnight as cutoff instead of `now - 24h`
- **Heartbeat Optimization**: Only writes `lastHeartbeat` to DB when motor is running (eliminates ~90% unnecessary writes)
- **HTTP Method Guards**: Added `GET`-only guards to `logs`, `stats`, `heartbeat`, and `export-stats` endpoints

### Improved
- **Code Deduplication**: Extracted shared `exportAndArchiveLogs()` into `lib/exportHelper.js`
- **Accessibility**: Added `aria-label` to all interactive elements in History modal
- **Focus Management**: `ConfirmationModal` now auto-focuses cancel button on open

---

## [0.4.2] - 2026-02-28

### Fixed
- **History Modal Glitch**: Filter chip changes no longer flash skeleton loaders — old data stays visible at 50% opacity during refetch (stale-while-revalidate pattern)
- **Division by Zero**: Daily breakdown chart width calculation now guards against `longestSession` being zero

### Improved
- **Loading UX**: Separated "Load More" loading from filter-change loading; added proper skeleton rows for session list on first load
- **Filter Bar**: Chips are disabled during transitions with a subtle spinner indicator
- **Transitions**: All data sections fade smoothly via CSS `transition-opacity`

---

## [0.4.1] - 2026-02-28

### Fixed
- **Blank Screen Bug**: Added missing `getLogsPaginated` import in `api/logs.js` — the root cause of the production crash
- **History Button**: Added missing `onHistoryClick` prop destructuring in `Header.jsx`
- **Dead Code**: Removed unused `dailyPipeline` variable from `mongoStore.js`

---

## [0.4.0] - 2026-02-28

### Added
- **Analytics API**: New `/api/stats` endpoint returning daily usage breakdown, averages, and totals
- **History API**: Modified `/api/logs` endpoint with pagination (`page`, `limit`) and date filtering
- **History View**: New full-screen `HistoryModal` accessible via header clock icon
- **Usage Stats**: Display of total sessions, total runtime, avg duration, and longest session
- **Daily Breakdown**: Visual text-graph of daily motor runtime and session count
- **Session List**: Scrollable paginated list of all motor events grouped by date, color-coded by duration (green/amber/red)
- **Filters**: Quick filter chips to view 'Today', 'Last 7 Days', 'Last 30 Days' or 'All Time'
- **Data Layer**: Extended `mongoStore.js` with `getLogsPaginated` and `getUsageStats` aggregation pipelines

### Changed
- **Header UI**: Added a dedicated history button next to the settings gear
- **Architecture**: No external charting libraries needed, keeping bundle size minimal

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
