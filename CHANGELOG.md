# Changelog

All notable changes to Motor Tracker are documented here.

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
