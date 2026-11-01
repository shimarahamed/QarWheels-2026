// Release policy, checked against the root src/app/api handlers. These are
// route boundaries, not keywords: a booking/vehicle ID must never be gated.
export const unavailableMobileFeatures = [
  { path: '/roadside', endpoints: ['/api/roadside/request', '/api/roadside/status/:id', '/api/roadside/cancel'] },
  { path: '/damage-upload', endpoints: ['/api/damage/analyze'] },
  { path: '/damage-results', endpoints: ['/api/damage/analyze'] },
  { path: '/ai-mechanic', endpoints: ['/api/ai/mechanic'] },
  { path: '/ai-support', endpoints: ['/api/ai/support'] },
  { path: '/repair-cost-forecast', endpoints: ['/api/ai/repair-cost'] },
  { path: '/support-ticket', endpoints: ['/api/support/tickets'] },
  { path: '/contact-us', endpoints: ['/api/support/contact'] },
  { path: '/apply-coupon', endpoints: ['/api/coupons/validate'] },
  { path: '/live-tracking', endpoints: ['/api/tracking/:id'] },
  { path: '/renew-policy', endpoints: ['/api/insurance/renew'] },
  { path: '/share-passport', endpoints: ['/api/vehicles/:id/passport'] },
  // This is the standalone card-charge screen, NOT BookingComposer's
  // pay-at-garage selection or the account's /payment-methods screen.
  { path: '/payment-method', endpoints: ['/api/payment/charge'] },
] as const;

export function getUnavailableMobileFeature(pathname: string) {
  // usePathname supplies resolved IDs and no query; also accept file-route
  // names from screenLayout so unfocused/preloaded screens remain blocked.
  const path = '/' + pathname.split(/[?#]/, 1)[0].split('/')
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
    .join('/');

  return unavailableMobileFeatures.find(({ path: boundary }) =>
    path === boundary || path.startsWith(`${boundary}/`),
  );
}
