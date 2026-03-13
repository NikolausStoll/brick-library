# Agent Guidelines (AGENTS.md)

This file gives AI agents (and humans) clear rules for working on the **Brick Library** project. Always follow these guidelines when editing code or docs.

## Project goal

Help the user iterate on the **Brick Library** tracker: a personal app to manage a **Collection** and a **Wishlist** of brick sets, with images, status, prices, filters, and optional details. Avoid adding features that the user has not asked for.

## Structure and stack

- **Frontend:** Vue 3 + Vite, in `frontend/`. Main UI lives in `frontend/src/App.vue` (single-file component). Use the existing patterns (ref, computed, reactive, CSS variables for theming).
- **Backend:** Node.js + Express, in `backend/`. Entry point: `backend/src/server.js`. Uses **better-sqlite3** for SQLite, **Sharp** for image processing, **Multer** for uploads, **Cheerio** for HTML scraping.
- **Add-on metadata:** `brick-library/` holds Home Assistant add-on metadata (`config.yaml`, `DOCS.md`, `static/`). Refer to it when documenting or changing options (port, db_path, image quality, etc.); do not put application source code there.

## Data and API

- **Sets:** Stored in a `sets` table. Preserve the **schema and naming** from the user’s brief (e.g. `manufacturer`, `setName`, `setNumber`, `legoReferenceNumber`, `brickSize`, `purchasePrice` in cents, `pieceCount`, `status`, `hasOriginalBox`, `hasPrintedPhoto`, `notes`, `instructionsUrl`, `retiredProduct`, `theme`, `year`, `listType`, timestamps). Use internal **set id** (integer) in API paths and DB; use **setNumber** only for display.
- **List types:** `listType` is either `'collection'` or `'wishlist'`. Filtering and tabs in the UI are based on this.
- **Prices:** Backend stores `purchasePrice` in **cents** (integer). API responses use euros (decimal). When building payloads for PUT/PATCH, merge with **API-format** data (e.g. `mapRow(current)`) before calling `preparePayload` so prices are not double-converted (see backend PUT and move handlers).
- **Images:** Stored in `set_images`; files under `UPLOAD_DIR/<setId>/`. Support upload (file), single URL, and scrape-from-HTML. Optimize with Sharp (WebP, max dimension, quality from env).

## Code and conventions

- **Naming:** Keep existing naming (e.g. `BrickSet`, `FormPayload`, `activeTab`, `filteredSets`, `cycleSetStatus`). Use kebab-case for CSS classes and data attributes.
- **Styling:** Prefer CSS custom properties (`--accent`, `--accent-border`, `--bg-surface`, etc.) for colors and theming; support light/dark. Overlay buttons should follow the same size/style as the delete-all style (e.g. padding, border-radius, font-size) when the user requested consistency.
- **i18n:** UI is in English (and partially German in the conversation history). Do not introduce a full i18n system unless asked.
- **Dependencies:** Add new dependencies only when the user asks for a feature that requires them. Prefer the existing stack (Vue 3, Express, better-sqlite3, Sharp, Multer, Cheerio).

## What to avoid

- **Scope creep:** No extra features (e.g. auth, sync, extra integrations) unless the user explicitly requests them.
- **Breaking the schema:** Do not rename or drop columns in `sets` / `set_images` without explicit instruction; if the user says “no migration,” they may reset the DB manually.
- **Ignoring AGENTS.md:** When in doubt, re-read this file and the root README; keep behavior aligned with the described data model and API.

## References

- **CLAUDE.md** – Points to this file for workspace guidance.
- **README.md** (root) – Overview, setup, API summary, project structure.
- **brick-library/README.md** and **brick-library/DOCS.md** – Add-on metadata and packaging notes.
