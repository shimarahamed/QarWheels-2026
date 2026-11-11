import { getUnavailableMobileFeature } from '@/lib/feature-availability';

const blockedRoutes = [
  '/roadside', '/damage-upload', '/damage-results', '/ai-mechanic',
  '/ai-support', '/repair-cost-forecast', '/support-ticket', '/contact-us',
  '/apply-coupon/booking-123', '/live-tracking/booking-123',
  '/availability-calendar/garage-123', '/fuel-log/car-123',
  '/renew-policy/car-123', '/share-passport/car-123', '/payment-method/booking-123',
];

describe('mobile release availability', () => {
  it.each(blockedRoutes)('blocks %s including query and trailing slash variants', (path) => {
    expect(getUnavailableMobileFeature(path)).toBeDefined();
    expect(getUnavailableMobileFeature(`${path}/`)).toBeDefined();
    expect(getUnavailableMobileFeature(`${path}?id=another#section`)).toBeDefined();
    expect(getUnavailableMobileFeature(`/(tabs)${path}`)).toBeDefined();
  });

  it.each([
    'apply-coupon/[id]', 'live-tracking/[id]', 'availability-calendar/[id]',
    'fuel-log/[id]', 'renew-policy/[id]',
    'share-passport/[id]', 'payment-method/[id]',
  ])('also blocks an unfocused screen by its Expo route name: %s', (route) => {
    expect(getUnavailableMobileFeature(route)).toBeDefined();
  });

  it.each([
    '/', '/(tabs)', '/search', '/(tabs)/search', '/(auth)/login',
    '/booking/123', '/booking-summary/123', '/checkout/123',
    '/booking-confirmation/123', '/choose-vehicle/123', '/choose-date-time/123',
    '/pickup-dropoff/123', '/add-ons/123',
    '/job-progress/123', '/ready-pickup/123', '/post-service-review/123',
    '/bookings', '/booking-history', '/payment-methods', '/saved-cards',
    '/invoices', '/invoice/123', '/vendor/kyc', '/vendor/send-invoice/123',
    '/vendor/invoice/123', '/vendor/booking-detail/123', '/vendor/status-update/123',
    '/vendor/payouts', '/vendor/request-payout', '/vendor/staff',
    '/add-car', '/vin-scan', '/vehicle-passport/123', '/insurance-registration/123',
    '/predictive-maintenance/123', '/maintenance-schedule/123',
    '/help-center', '/faq', '/coupons', '/chat/123', '/messages', '/vendor/chat/123',
    '/booking/roadside', '/car/ai-support', '/invoice/live-tracking',
    '/roadside-assistance', '/ai-mechanic-history', '/share-passports/123',
  ])('preserves supported or unrelated route %s', (path) => {
    expect(getUnavailableMobileFeature(path)).toBeUndefined();
  });
});
