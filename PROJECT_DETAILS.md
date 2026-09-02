# QarWheel Project Details

## 1. Project Overview

QarWheel is an AI-powered automotive service platform for car owners and garage operators in Qatar. The application helps users manage their vehicles, maintain digital service records, receive AI-assisted maintenance guidance, discover trusted garages, and book services. It also provides a vendor portal where garage owners can manage bookings, services, inventory, customers, staff, promotions, reviews, and analytics.

The repository contains:

- A Next.js web application for customers and vendors.
- Firebase Authentication and Firestore integration.
- Genkit AI flows using Google Gemini.
- A separate Expo mobile application under `mobile/`.
- Firestore security rules, indexes, seed scripts, migration scripts, and production planning documents.

## 2. Product Goals

- Replace paper-based vehicle service history with a digital car passport.
- Help car owners understand upcoming maintenance needs before problems become expensive.
- Provide a marketplace-style garage discovery and booking experience.
- Give garage owners a lightweight operational dashboard.
- Use AI for VIN lookup, vehicle diagnosis, service history summaries, predictive maintenance, and vendor business insights.

## 3. Main User Roles

### Customer

- Signs up and logs in with Firebase Authentication.
- Adds vehicles using VIN details.
- Tracks car mileage, service records, and upcoming bookings.
- Uses AI-powered maintenance and diagnosis tools.
- Finds garages, views garage details, and books services.

### Vendor Owner

- Signs up and logs in through the vendor portal.
- Manages garage profile and settings.
- Views and updates bookings.
- Manages services, inventory, staff, customers, promotions, reviews, and analytics.
- Uses AI-generated business insights.

### Admin

The current codebase is primarily focused on customer and vendor workflows. Architecture documents describe future admin capabilities for vendor approvals, review moderation, audit logs, and marketplace governance.

## 4. Technology Stack

| Area | Technology |
| --- | --- |
| Web framework | Next.js 15 with App Router |
| UI runtime | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | ShadCN-style components using Radix UI primitives |
| Icons | lucide-react |
| Forms | React Hook Form |
| Validation | Zod |
| Charts | Recharts |
| Maps | Leaflet and React Leaflet |
| Backend services | Firebase Authentication and Firestore |
| AI framework | Firebase Genkit |
| AI model provider | Google Gemini via `@genkit-ai/google-genai` |
| Rate limiting | In-memory fallback, optional Upstash Redis |
| Mobile app | Expo, React Native, Expo Router |
| Hosting target | Firebase App Hosting |

## 5. Key Features

### Customer Web Portal

- Customer sign up and login.
- Protected dashboard under `/dashboard`.
- Vehicle list and car detail pages.
- Add car flow with VIN-assisted vehicle details.
- Digital service history.
- Add service record workflow.
- Mileage update support.
- AI symptom checker.
- AI maintenance prediction.
- AI service history summary.
- Garage directory and garage detail pages.
- Booking creation and booking detail pages.
- User profile page.

### Vendor Web Portal

- Vendor sign up and login.
- Protected dashboard under `/vendor/dashboard`.
- Booking management.
- Service management.
- Inventory management.
- Customer directory.
- Staff management.
- Promotions management.
- Reviews page.
- Analytics page.
- Settings page.
- AI business insights.

### Mobile App

The `mobile/` directory contains a separate Expo application. It includes:

- Expo Router navigation.
- Authentication screens.
- Tab-based customer experience.
- Cars, bookings, marketplace search, account, notifications, and detail screens.
- Firebase integration.
- Shared mobile utilities for theme, API calls, marketplace data, haptics, Firestore operations, and auth context.

## 6. Important Routes

### Public Web Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing/home page |
| `/login` | Customer login |
| `/signup` | Customer sign up |
| `/vendor/login` | Vendor login |
| `/vendor/signup` | Vendor sign up |

### Customer Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Customer dashboard |
| `/dashboard/my-cars` | Customer vehicle list |
| `/dashboard/my-cars/add` | Add a vehicle |
| `/dashboard/my-cars/[carId]` | Vehicle detail |
| `/dashboard/my-cars/[carId]/add-record` | Add service record |
| `/dashboard/service-history` | Service history overview |
| `/dashboard/garages` | Garage directory |
| `/dashboard/garages/[garageId]` | Garage detail |
| `/dashboard/book` | Book a service |
| `/dashboard/bookings` | Booking list |
| `/dashboard/bookings/[bookingId]` | Booking detail |
| `/dashboard/profile` | User profile |

### Vendor Routes

| Route | Purpose |
| --- | --- |
| `/vendor/dashboard` | Vendor dashboard |
| `/vendor/dashboard/analytics` | Vendor analytics |
| `/vendor/dashboard/bookings` | Vendor bookings |
| `/vendor/dashboard/customers` | Customer management |
| `/vendor/dashboard/inventory` | Inventory management |
| `/vendor/dashboard/promotions` | Promotions |
| `/vendor/dashboard/reviews` | Reviews |
| `/vendor/dashboard/services` | Services |
| `/vendor/dashboard/settings` | Vendor settings |
| `/vendor/dashboard/staff` | Staff management |

### AI API Routes

| Route | Purpose |
| --- | --- |
| `/api/ai/vin` | VIN lookup and enrichment |
| `/api/ai/diagnose` | Symptom diagnosis |
| `/api/ai/maintenance` | Predictive maintenance |
| `/api/ai/summarize` | Service history summary |
| `/api/ai/insights` | Vendor business insights |

## 7. AI Flows

AI functionality is implemented under `src/ai/flows/` and configured through `src/ai/genkit.ts`.

| Flow file | Purpose |
| --- | --- |
| `get-vin-details.ts` | Returns vehicle make, model, and year from a VIN-like input |
| `diagnose-car-problem.ts` | Produces an AI diagnosis from vehicle symptoms |
| `predictive-maintenance-suggestions.ts` | Predicts maintenance needs from vehicle data and service history |
| `summarize-service-history.ts` | Summarizes service history and potential issues |
| `vendor-business-insights.ts` | Generates business insights for vendors |

The Genkit setup uses `googleai/gemini-1.5-flash` and reads `GEMINI_API_KEY` from the environment.

Additional safeguards in `src/ai/genkit.ts` include:

- Input sanitization.
- Prompt text length limits.
- Retry handling for transient AI failures.
- 30-second timeout protection.

## 8. Firebase and Data Layer

The project uses Firebase for authentication and Firestore for application data.

Important files:

- `src/firebase/config.ts` - Firebase client configuration from environment variables.
- `src/firebase/provider.tsx` - Firebase provider integration.
- `src/firebase/client-provider.tsx` - Client-side Firebase provider.
- `src/firebase/firestore/use-doc.tsx` - Firestore document hook.
- `src/firebase/firestore/use-collection.tsx` - Firestore collection hook.
- `src/firebase/safe-writes.ts` - Safe write helpers.
- `firestore.rules` - Firestore security rules.
- `firestore.indexes.json` - Firestore index definitions.

Core domain data includes:

- Users
- Cars
- Service records
- Vendors
- Vendor services
- Bookings
- Reviews
- Inventory
- Staff
- Promotions
- AI prediction results

Current domain types are defined in `src/lib/types.ts`.

## 9. Authentication and Route Protection

Route protection is handled by `middleware.ts`.

Protected areas:

- Customer dashboard routes: `/dashboard/*`
- Vendor dashboard routes: `/vendor/dashboard/*`

Unauthenticated users are redirected to the correct login page. Authenticated users visiting login or signup pages are redirected back to their relevant dashboard.

The middleware also forwards verified user context through request headers:

- `x-user-id`
- `x-sign-in-provider`

## 10. Environment Variables

Create a local environment file from `.env.example`.

Required Firebase client variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

AI variable:

```env
GEMINI_API_KEY=
```

Application URL:

```env
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

Optional production rate limiting:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 11. Installation and Local Development

### Prerequisites

- Node.js
- npm
- Firebase project
- Google Gemini API key for AI features

### Install dependencies

```bash
npm install
```

### Start the web app

```bash
npm run dev
```

The Next.js app runs on:

```text
http://localhost:9002
```

### Start Genkit for AI development

```bash
npm run genkit:dev
```

For watch mode:

```bash
npm run genkit:watch
```

### Start the mobile app

```bash
npm run mobile:start
```

Android:

```bash
npm run mobile:android
```

iOS:

```bash
npm run mobile:ios
```

## 12. Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts Next.js dev server on port 9002 |
| `npm run genkit:dev` | Starts Genkit with `src/ai/dev.ts` |
| `npm run genkit:watch` | Starts Genkit in watch mode |
| `npm run build` | Builds the Next.js app |
| `npm run start` | Starts the production Next.js server |
| `npm run lint` | Runs Next lint |
| `npm run typecheck` | Runs TypeScript checks for the web app |
| `npm run mobile:start` | Starts Expo from the `mobile/` directory |
| `npm run mobile:android` | Starts Expo Android workflow |
| `npm run mobile:ios` | Starts Expo iOS workflow |
| `npm run mobile:typecheck` | Type-checks the mobile app |
| `npm run mobile:export:web` | Exports mobile app for web |
| `npm run check:all` | Runs web typecheck, web build, mobile typecheck, and mobile web export |
| `npm run seed:demo` | Runs demo data seed script |
| `npm run migrate:vendors:dry` | Dry-runs vendor owner ID migration |
| `npm run migrate:vendors:write` | Runs vendor owner ID migration with writes |

## 13. Project Structure

```text
.
|-- docs/
|   |-- architecture/
|   |-- production-runbook.md
|   |-- production-data-architecture.md
|   `-- mvp-launch.md
|-- mobile/
|   |-- app/
|   |-- components/
|   |-- constants/
|   `-- lib/
|-- scripts/
|   |-- seed-demo.mjs
|   `-- migrate-vendors-to-owner-id.mjs
|-- src/
|   |-- ai/
|   |   |-- flows/
|   |   `-- genkit.ts
|   |-- app/
|   |   |-- api/
|   |   |-- dashboard/
|   |   `-- vendor/
|   |-- components/
|   |   |-- dashboard/
|   |   |-- ui/
|   |   `-- vendor/
|   |-- config/
|   |-- firebase/
|   |-- hooks/
|   `-- lib/
|-- firestore.rules
|-- firestore.indexes.json
|-- middleware.ts
|-- next.config.ts
|-- package.json
`-- tailwind.config.ts
```

## 14. UI and Styling

The app uses Tailwind CSS and component primitives inspired by ShadCN UI. Shared UI components live in `src/components/ui/`, while feature-specific components live in:

- `src/components/dashboard/`
- `src/components/vendor/`

Global styles are defined in:

- `src/app/globals.css`
- `tailwind.config.ts`

The app uses `lucide-react` for icons and Recharts for charts.

## 15. Security Notes

Implemented or partially implemented security measures include:

- Firebase Authentication.
- Middleware route protection.
- Firestore rules.
- Firestore indexes.
- Security headers in `next.config.ts`.
- Content Security Policy.
- AI endpoint rate-limit utilities.
- Optional Upstash Redis support for production rate limiting.
- AI prompt input sanitization.

Important production recommendations documented under `docs/architecture/` include:

- Use server-side auth enforcement with session cookies.
- Enable Firebase App Check.
- Add stronger admin controls for vendor approval.
- Add booking-gated review submission.
- Add pagination to large Firestore queries.
- Add production observability.
- Add complete automated testing.

## 16. Deployment Notes

The project is configured for Firebase App Hosting through `apphosting.yaml`.

Current App Hosting setting:

```yaml
runConfig:
  maxInstances: 1
```

Before deployment:

- Configure all required environment variables.
- Deploy Firestore rules from `firestore.rules`.
- Deploy Firestore indexes from `firestore.indexes.json`.
- Verify Firebase Authentication providers are enabled.
- Confirm `GEMINI_API_KEY` is configured for AI routes.
- Run `npm run check:all`.
- Review production checklist in `docs/architecture/06-deployment-checklist.md`.

## 17. Testing and Quality Checks

Current available checks:

```bash
npm run typecheck
npm run build
npm run mobile:typecheck
npm run mobile:export:web
npm run check:all
```

The architecture documents recommend adding:

- Unit tests.
- Firebase emulator integration tests.
- Playwright end-to-end tests.
- CI pipeline with lint, test, build, and deploy steps.

## 18. Existing Documentation

Important documentation files:

- `README.md` - Main project introduction and basic setup.
- `docs/mvp-launch.md` - MVP launch summary.
- `docs/mvp_launch_guide.md` - MVP guide.
- `docs/production-runbook.md` - Production operations notes.
- `docs/production-data-architecture.md` - Production data design.
- `docs/mobile-marketplace-migration.md` - Mobile marketplace migration notes.
- `docs/blueprint.md` - Project blueprint.
- `docs/architecture/00-overview.md` - Architecture review overview.
- `docs/architecture/01-folder-structure.md` - Target folder structure.
- `docs/architecture/02-implementation-roadmap.md` - Implementation roadmap.
- `docs/architecture/03-technical-debt.md` - Technical debt report.
- `docs/architecture/04-migration-strategy.md` - Migration plan.
- `docs/architecture/05-security-audit.md` - Security audit.
- `docs/architecture/06-deployment-checklist.md` - Deployment checklist.
- `docs/architecture/07-schemas.md` - Recommended Firestore schemas.
- `docs/architecture/08-api-architecture.md` - Recommended API architecture.
- `docs/architecture/09-ai-workflow.md` - AI workflow architecture.

## 19. Known Risks and Future Improvements

- Some production architecture work is documented but not fully implemented.
- Admin workflows need stronger implementation before marketplace launch.
- AI endpoints should use robust production rate limiting and monitoring.
- Firestore reads should be reviewed for pagination and cost control.
- Vendor approval and review moderation should be locked behind admin-only workflows.
- Production observability should be added before public scale.
- Automated tests should be expanded across web, mobile, Firebase, and AI routes.
- VIN lookup should be connected to a real production VIN data provider.

## 20. Quick Handover Summary

QarWheel is a full-stack automotive marketplace and vehicle management system. The web app is built with Next.js, React, TypeScript, Tailwind CSS, Firebase, Firestore, and Genkit AI. The mobile app is built with Expo and React Native. Customers can manage cars, service history, AI diagnostics, garage discovery, and bookings. Vendors can manage their garage operations through a dedicated dashboard. The project is ready for local development and MVP iteration, with production hardening guidance already documented in the `docs/architecture/` folder.
