# QarWheel Mobile Marketplace Migration

## Current Status

- Web app remains a Next.js app at the repository root.
- Native mobile app has been scaffolded in `mobile/` with Expo SDK 54 and Expo Router.
- Mobile app includes a demo-complete marketplace shell:
  - Home marketplace
  - Garage search
  - Bookings
  - My cars
  - Account/vendor-ready settings
  - Quote request modal
- Mobile app is configured for future iOS and Android store builds through `mobile/eas.json`.
- Mobile Firebase and API environment placeholders are documented in `mobile/.env.example`.

## Commands

From the repository root:

```bash
npm run typecheck
npm run build
npm run mobile:typecheck
npm run mobile:export:web
npm run check:all
```

From `mobile/`:

```bash
npm run start
npm run android
npm run ios
npm run web
```

## Next Required Backend Work

The mobile app currently uses demo marketplace data and an API client placeholder. Before public release, both web and mobile should call shared backend endpoints for:

- Create car
- Update mileage
- Create service record
- Create booking
- Update booking status
- Create quote request
- Create review
- AI VIN lookup
- AI diagnosis
- AI maintenance forecast
- Push notification registration

## Public Release Checklist

- Apple Developer account
- Google Play Console account
- Expo/EAS account
- Production Firebase project
- Firebase iOS app config
- Firebase Android app config
- App Check enforcement
- Privacy policy URL
- Terms of service URL
- Google Play Data Safety form
- Apple privacy labels
- TestFlight build
- Google internal testing build
- Store screenshots
- Crash reporting
- Analytics
- Push notification certificates/configuration

## Product Gaps To Close

- Replace demo data with Firestore/API data.
- Add real authentication screens.
- Add real quote request submission.
- Add garage details pages.
- Add booking checkout/confirmation.
- Add vendor mobile mode screens.
- Add Arabic/RTL support.
- Add offline cache for cars/bookings.
- Add E2E tests for booking flow.
