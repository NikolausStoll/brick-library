# Brick Library Add-on Assets

This directory holds **Home Assistant add-on metadata** when Brick Library is shipped as an add-on. It is not the main application code (that lives in `frontend/` and `backend/` at repo root).

## Contents

| Item        | Purpose |
|------------|---------|
| `config.yaml` | Add-on definition: name, slug, description, version, URL, supported architectures (`amd64`, `aarch64`, `armv7`), startup type, ingress, ports (8098), and options/schema for port, DB path, static dir, upload dir, image quality, and max image dimension. |
| `DOCS.md`     | Documentation for add-on packaging and usage. |
| `static/`     | Placeholder assets for Home Assistant (e.g. icon). Replace with real `icon.png` (and optional logo) when packaging. |

## Version

The add-on version is read from `config.yaml` (`version`) and exposed by the backend at `GET /api/version`; the frontend shows it in the UI.

## Options (config.yaml)

- **port** – HTTP port (default 8098).
- **db_path** – SQLite database path (e.g. `/data/brick-library.db`).
- **static_dir** – Directory for built frontend (e.g. `/app/public`).
- **upload_dir** – Directory for uploaded/scraped images (e.g. `/data/uploads`).
- **image_quality** – WebP quality (e.g. 80).
- **image_max_dimension** – Longest side in pixels for images (e.g. 2400).

See `DOCS.md` for how to use this metadata when building or packaging the add-on.
