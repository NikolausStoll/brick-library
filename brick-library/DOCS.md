# Brick Library Home Assistant Add-on

This directory stores the metadata necessary whenever the Brick Library project is packaged as a Home Assistant add-on.

- `config.yaml` defines the add-on slug, startup requirements, and exposed ports.
- `static/` holds assets (SVG/icon) that Home Assistant can display in the add-on browser.

To connect to the project during add-on development, the container exposes the backend on port 8098.
