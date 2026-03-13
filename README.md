# Brick Library

Personal brick set tracker: manage a **Collection** and a **Wishlist** of sets, with images, status, prices, and optional details.

## Features

- **Collection & Wishlist** – Tabs for owned sets and wishlist items; move items from wishlist to collection with purchase price.
- **Set management** – Add/edit/delete sets; fields: manufacturer, name, set number, piece count, purchase price (or price-per-piece for wishlist), status, brick size, and optional details (box, instructions URL, theme, year, etc.).
- **Status cycle** – Click the status badge on a card to cycle: New → Building → Built → Disassembled → Sold.
- **Images** – Upload (file), add by image URL, or paste HTML to scrape multiple images; images are optimized (WebP, max dimension, configurable quality) and can be reordered or deleted.
- **Filters & sort** – Filter by manufacturer, theme, status, and detail chips (box, retired, photo, instructions); sort by name, price, pieces, etc.
- **Stats** – Aggregated totals for filtered sets (count, price, pieces, average price per piece, new/built counts).
- **Dark mode** – Toggle with persistence; respects system preference.
- **Version** – App version from `brick-library/config.yaml` shown in the UI.

## Tech stack

- **Frontend:** Vue 3, Vite
- **Backend:** Node.js, Express
- **Database:** SQLite (better-sqlite3)
- **Images:** Sharp (resize, WebP), Multer (upload)

## Project structure

```
brick-library/
├── frontend/          # Vue 3 + Vite app (single App.vue)
├── backend/           # Express API (src/server.js)
├── brick-library/     # Home Assistant add-on metadata (config.yaml, DOCS.md)
├── .env.example       # Example environment variables
├── run-local.sh       # Run via Docker (build + run on port 8098)
└── README.md
```

## Setup

1. Copy environment file and adjust if needed:
   ```bash
   cp .env.example .env
   ```
   Variables: `BACKEND_PORT`, `DB_PATH`, `UPLOAD_DIR`, `STATIC_DIR`, `IMAGE_QUALITY`, `IMAGE_MAX_DIMENSION`.

2. **Backend**
   ```bash
   cd backend && npm install && npm start
   ```
   Serves API on `BACKEND_PORT` (default 8098) and creates SQLite DB at `DB_PATH` if missing.

3. **Frontend** (dev)
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Build for production: `npm run build`; output goes to `backend/public` or path set by `STATIC_DIR`.

4. **Run with Docker**
   ```bash
   ./run-local.sh
   ```
   Expects `.env`; mounts `./data` for DB and uploads; app on http://localhost:8098.

## API overview

- `GET/POST /api/sets` – List sets, create set
- `GET/PUT/DELETE /api/sets/:id` – Get, update, delete set
- `PUT /api/sets/:id/move` – Move set between collection/wishlist (body: `listType`, optional `purchasePrice`)
- `GET/POST/DELETE /api/sets/:setId/images` – List images, upload files
- `POST /api/sets/:setId/images/url` – Add one image from URL (body: `imageUrl`)
- `POST /api/sets/:setId/images/scrape` – Scrape images from pasted HTML (body: `rawHtml`, optional `baseUrl`)
- `PUT /api/sets/:setId/images/order` – Reorder images
- `DELETE /api/sets/:setId/images/:imageId` – Delete one image

## License

Private / as per repository.
