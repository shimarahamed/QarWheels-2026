# QarWheel module locations

This file maps module locations. Application routes and source paths stay in place. The earlier safety fixes and Firebase release configuration have been retained separately, as requested.

| Module | Existing location |
| --- | --- |
| Business website | `QarWheel-Unified-Website/` |
| Customer web portal | `src/app/dashboard/`, `src/components/dashboard/` |
| Vendor web portal | `src/app/vendor/`, `src/components/vendor/` |
| Master admin portal | `src/app/admin/`, `src/components/admin/` |
| Backend APIs | `src/app/api/` |
| Backend support and AI | Server modules in `src/lib/`, `src/ai/` |
| Customer mobile | `mobile/app/(tabs)/` and related screens |
| Vendor mobile | `mobile/app/vendor/` |
| Shared UI and utilities | `src/components/ui/`, `src/lib/`, `src/firebase/` |
| Shared design tokens | `packages/tokens/` |
| Firebase policies and indexes | Root `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json` |
| Historical website packages | `archive/websites/` |
| Extracted UI reference | `archive/references/lgtb/` |

Open `qarwheel.code-workspace` for named module folders in the IDE. `systems.json` is a location inventory; it is not loaded by the application.

Customer, vendor and admin web modules remain inside the same Next.js application. Mobile is tracked in this repository at `mobile/` and contains both mobile experiences. Its executable paths are preserved so imports, routes and existing commands keep their current locations.

The two older websites and extracted UI reference were moved as whole folders into `archive/`; their file contents were preserved. The maintained business website stays at its existing path.
