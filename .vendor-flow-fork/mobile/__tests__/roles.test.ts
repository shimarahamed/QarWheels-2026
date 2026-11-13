import { readQwClaims } from '@/lib/roles';

it.each([null, undefined, {}, { qw: [] }, { qw: 'owner' }, { qw: { r: 'toString' } },
  { qw: { r: 'master_admin', lvl: 'owner' } },
  { qw: { r: 'vendor_staff', b: 'business', br: 'branch' } },
  { qw: { r: 'vendor_staff', b: 'business/other', br: [] } },
  { qw: { r: 'vendor_staff', b: 'business', br: [''] } },
  { qw: { r: 'vendor_staff', b: 'business', br: [2] } },
])('rejects malformed or unknown claims: %j', (claims) => {
  expect(readQwClaims(claims)).toBeNull();
});

it('normalizes valid vendor claims without retaining untrusted properties', () => {
  expect(readQwClaims({ qw: { r: 'vendor_staff', b: 'business', br: ['branch', 'branch'], admin: true } }))
    .toEqual({ r: 'vendor_staff', b: 'business', br: ['branch'] });
});

it.each(['super', 'ops', 'support'])('accepts the documented admin level %s', (lvl) => {
  expect(readQwClaims({ qw: { r: 'master_admin', lvl } })).toEqual({ r: 'master_admin', lvl });
});
