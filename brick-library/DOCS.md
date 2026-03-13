# Brick Library – Home Assistant Add-on Documentation

This document describes how the **Brick Library** add-on metadata in this directory is used and how to package or run the add-on.

## Directory role

The `brick-library/` folder in the repo root contains only add-on **metadata and assets**, not the application itself:

- The web app is built from `frontend/` (Vue/Vite) and served with the API from `backend/` (Node/Express).
- The Docker image (and any add-on container) builds the frontend, runs the backend, and uses the options defined here.

## config.yaml

- **Identification:** `name`, `slug`, `description`, `version`, `url`, `image` (e.g. `ghcr.io/nikolausstoll/brick-library`).
- **Platform:** `arch` (amd64, aarch64, armv7), `startup: application`, `init: false`.
- **Network:** `ingress: true`, `ingress_port: 8098`, `ports: 8098/tcp` with description for the Web UI.
- **Options/schema:** Defines configurable options (port, db_path, static_dir, upload_dir, image_quality, image_max_dimension) and their types for the Home Assistant UI.

When running as an add-on, the supervisor passes these options as environment variables or config to the container; the backend reads them (e.g. via `process.env` or a mounted config file) to set port, DB path, upload directory, and image processing settings.

## Using this metadata for packaging

1. **Build the app**  
   Build the frontend (`npm run build` in `frontend/`) and place the output where the backend serves static files (e.g. `backend/public` or the path given by `static_dir`).

2. **Build the image**  
   Use a Dockerfile that installs the backend, copies the built frontend, and runs the Node server. The image name should match `image` in `config.yaml` if you publish to a registry.

3. **Add-on structure**  
   For Home Assistant, the add-on repo typically includes:
   - `config.yaml` (you can base it on this directory’s `config.yaml`).
   - `DOCS.md` (or similar) for end-user documentation.
   - `icon.png` (and optionally `logo.png`) in `static/` or the path your add-on build expects.

4. **Options → runtime**  
   Map the options from `config.yaml` to the container (env vars or config file) so the backend uses the correct port, `db_path`, `upload_dir`, `image_quality`, and `image_max_dimension`.

## Connecting during development

The add-on exposes the backend on **port 8098**. With ingress enabled, the UI is reached through Home Assistant’s ingress URL. When running the container directly (e.g. `docker run -p 8098:8098 ...`), use `http://<host>:8098` for the Brick Library Web UI.

## static/ assets

- Replace placeholder files in `static/` with real assets (e.g. `icon.png` for the add-on store).
- Home Assistant may expect specific names or sizes; refer to the [Home Assistant add-on documentation](https://developers.home-assistant.io/docs/add-ons) for current requirements.
