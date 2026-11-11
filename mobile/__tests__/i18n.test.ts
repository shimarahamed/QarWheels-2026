import { ar, en } from '@/lib/i18n/translations';

// A missing Arabic string must not reach a user in Doha as a blank label or an
// untranslated key. TypeScript enforces the shape; these assert the values.

type Leaf = Record<string, unknown>;

function flatten(obj: Leaf, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else out[path] = '';
    if (value && typeof value === 'object') Object.assign(out, flatten(value as Leaf, path));
  }
  return out;
}

const enFlat = flatten(en as unknown as Leaf);
const arFlat = flatten(ar as unknown as Leaf);

describe('translation catalogues', () => {
  it('define exactly the same keys', () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it('have no empty strings', () => {
    for (const [key, value] of Object.entries(enFlat)) {
      if (typeof value === 'string' && value !== '') expect(value.trim()).not.toBe('');
    }
    for (const [key, value] of Object.entries(arFlat)) {
      if (typeof value === 'string' && value !== '') {
        expect(value.trim()).not.toBe('');
      }
    }
  });

  it('actually translate — Arabic strings are not copied English', () => {
    // Latin-only Arabic values almost always mean an untranslated placeholder.
    // Brand names and the few shared tokens are allowed.
    const allowed = new Set(['tabs.search']);
    const arabic = /[؀-ۿ]/;

    for (const [key, value] of Object.entries(arFlat)) {
      if (!value || allowed.has(key)) continue;
      if (enFlat[key] === value) {
        throw new Error(`ar.${key} is identical to English: "${value}"`);
      }
      expect(arabic.test(value)).toBe(true);
    }
  });
});
