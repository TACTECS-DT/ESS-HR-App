# ESS HR App — Project Plan

Three-stage delivery plan. Each stage is a separate file.

| File | Stage | Description |
|---|---|---|
| [stage-1-mobile-mock.md](stage-1-mobile-mock.md) | Stage 1 | React Native mobile app with mock JSON responses |
| [stage-2-odoo-module.md](stage-2-odoo-module.md) | Stage 2 | Custom Odoo addon that exposes all HR data via RPC |
| [stage-3-django-backend.md](stage-3-django-backend.md) | Stage 3 | Django REST Framework middleware — connects mobile to Odoo |

---

## Stages Overview

```
Stage 1 — Mobile App (Mock)
  Full React Native app, all screens and modules working
  against static mock JSON — no backend needed.
  Deliverable: complete, navigable mobile app.

Stage 2 — Odoo Custom Module
  Build the ess_hr_mobile Odoo addon inside the existing
  Odoo instance. Exposes all required HR data and actions
  as callable RPC methods for Django to consume.
  Deliverable: tested Odoo module installable on any Odoo instance.

Stage 3 — Django Backend
  Build the Django DRF middleware server. Calls the Odoo
  module via RPC, adds JWT auth, license system, file handling,
  push notifications, offline sync, and serves the mobile app.
  Deliverable: production-ready API server + mobile app fully integrated.
```

Stages 1 and 2 can be developed in parallel.
Stage 3 depends on Stage 2 being available on a staging Odoo instance.
