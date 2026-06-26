# Kids Collection Module

Separate, optional feature for tracking children's LEGO sets with a reduced data model.

## Scope

- **Fields:** manufacturer, set name, set number, piece count, brick size, instructions URL, images
- **No:** wishlist, prices, status, themes, or other collection metadata
- **UI:** card/list layout, compact stats (sets + pieces), full image tooling (upload, URL, HTML scrape, reorder, delete)

## Architecture

| Layer | Location |
|-------|----------|
| Backend API | `/api/kids/*` in `backend/src/kids/` |
| Shared image helpers | `backend/src/lib/images.js`, `backend/src/lib/scrapeFromHtml.js` |
| Frontend UI | `frontend/src/kids/` |
| Integration point (main app) | `frontend/src/App.vue` — Kids tab + `<KidsApp />` |
| Server mount | `backend/src/server.js` — `app.use('/api/kids', …)` |

### Database (separate tables)

- `kids_sets` — id, manufacturer, setName, setNumber, pieceCount, brickSize, instructionsUrl, timestamps
- `kids_set_images` — same shape as `set_images`, FK to `kids_sets`

### Uploads

Files live under `{UPLOAD_DIR}/kids/{setId}/` and are served at `/uploads/kids/{setId}/…`.

---

## Removal guide

Use this checklist to remove the Kids Collection feature. Update this document whenever you add new kids-related files or integration points.

### 1. Backend

- [ ] Delete directory `backend/src/kids/`
- [ ] In `backend/src/server.js`, remove:
  - `import { ensureKidsSchema } from './kids/kidsSchema.js'`
  - `import { createKidsRouter } from './kids/kidsRoutes.js'`
  - `ensureKidsSchema(db)`
  - `app.use('/api/kids', createKidsRouter({ db, uploadDir: UPLOAD_DIR }))`
- [ ] Delete kids tests: `backend/test/kids/`
- [ ] Optional — if nothing else uses them, delete `backend/src/lib/images.js` and `backend/src/lib/scrapeFromHtml.js` (only after confirming main `server.js` does not import them)

### 2. Frontend

- [ ] Delete directory `frontend/src/kids/`
- [ ] In `frontend/src/App.vue`, remove:
  - `import KidsApp from './kids/KidsApp.vue'`
  - Kids tab button in `.page-tabs`
  - `<KidsApp v-if="activeTab === 'kids'" />` and the surrounding `<template v-else>` wrapper (restore original structure)
  - `'kids'` from the `ListType` union
- [ ] Delete `frontend/src/kids/KidsApp.test.ts` (if present)

### 3. Tests & CI

- [ ] Remove or update any test files referencing `/api/kids` or `KidsApp`
- [ ] Run `npm test` to confirm the main app still passes

### 4. Documentation

- [ ] Delete this file (`docs/KIDS_COLLECTION.md`)
- [ ] Remove Kids mentions from `README.md` and `AGENTS.md` (if added)

### 5. Data cleanup (optional)

```sql
DROP TABLE IF EXISTS kids_set_images;
DROP TABLE IF EXISTS kids_sets;
```

- [ ] Remove upload files: `{UPLOAD_DIR}/kids/`

### 6. Verify

- [ ] App starts without errors
- [ ] Collection and Wishlist tabs work unchanged
- [ ] No remaining references: `rg -i 'kids' --glob '!docs/KIDS_COLLECTION.md'`

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/kids/sets` | List all kids sets |
| POST | `/api/kids/sets` | Create (`setName` required) |
| GET | `/api/kids/sets/:id` | Get one |
| PUT | `/api/kids/sets/:id` | Update |
| DELETE | `/api/kids/sets/:id` | Delete set and images |
| GET/POST | `/api/kids/sets/:setId/images` | List / upload |
| POST | `/api/kids/sets/:setId/images/url` | Add from URL |
| POST | `/api/kids/sets/:setId/images/scrape` | Scrape from HTML or page |
| PUT | `/api/kids/sets/:setId/images/order` | Reorder |
| DELETE | `/api/kids/sets/:setId/images/:imageId` | Delete one image |
| DELETE | `/api/kids/sets/:setId/images` | Delete all images |
| GET | `/api/kids/sets/:setId/images/:imageId/file` | Serve file |

---

## Change log (integration points)

| Date | Change |
|------|--------|
| 2026-06-26 | Added manufacturer; card layout aligned with Collection |
| 2026-06-26 | Added brickSize and instructionsUrl fields |
| 2026-06-26 | Initial module: backend `kids/`, frontend `kids/`, App tab, removal guide |

*Add a row here when new kids-related files, env vars, or mount points are introduced.*
