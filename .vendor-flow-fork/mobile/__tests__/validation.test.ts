import {
  addressSchema,
  emailSchema,
  firstError,
  isValid,
  passwordSchema,
  qatarPhoneSchema,
  topUpAmountSchema,
} from '@/lib/validation';

describe('emailSchema', () => {
  it.each(['a@b.co', 'ahmad.al-rashid@qarwheel.qa', 'user+tag@example.co.uk'])(
    'accepts %s',
    (value) => expect(isValid(emailSchema, value)).toBe(true),
  );

  it.each(['', 'plainaddress', 'no@tld', 'two@@at.com', 'spaces in@mail.com'])(
    'rejects %s',
    (value) => expect(isValid(emailSchema, value)).toBe(false),
  );

  it('returns a message the user can act on', () => {
    expect(firstError(emailSchema, 'nope')).toMatch(/email/i);
  });
});

describe('qatarPhoneSchema', () => {
  it.each(['33123456', '+97433123456', '+974 3312 3456', '55123456', '66123456', '77123456'])(
    'accepts %s',
    (value) => expect(isValid(qatarPhoneSchema, value)).toBe(true),
  );

  it.each([
    '12345678', // must start 3/5/6/7
    '3312345', // too short
    '331234567', // too long
    '+9713312345', // wrong country code
    'notaphone',
  ])('rejects %s', (value) => expect(isValid(qatarPhoneSchema, value)).toBe(false));
});

describe('passwordSchema', () => {
  it('accepts a password meeting every rule', () => {
    expect(isValid(passwordSchema, 'Qarwheel1')).toBe(true);
  });

  it.each([
    ['short', 'Ab1'],
    ['no uppercase', 'qarwheel1'],
    ['no lowercase', 'QARWHEEL1'],
    ['no digit', 'Qarwheel'],
  ])('rejects one that is %s', (_label, value) => {
    expect(isValid(passwordSchema, value)).toBe(false);
  });
});

describe('addressSchema', () => {
  it('accepts a complete address', () => {
    expect(
      isValid(addressSchema, { label: 'Home', line: 'Building 24, Al Sadd', area: 'Doha' }),
    ).toBe(true);
  });

  it('requires a street line a driver could find', () => {
    expect(isValid(addressSchema, { line: 'A', area: 'Doha' })).toBe(false);
  });
});

describe('topUpAmountSchema', () => {
  it('rejects zero, negatives, and implausible amounts', () => {
    expect(isValid(topUpAmountSchema, 0)).toBe(false);
    expect(isValid(topUpAmountSchema, -50)).toBe(false);
    expect(isValid(topUpAmountSchema, 50_000)).toBe(false);
  });

  it('accepts a normal top-up', () => {
    expect(isValid(topUpAmountSchema, 250)).toBe(true);
  });
});
