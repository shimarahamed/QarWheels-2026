import { getVendorColors } from '@/lib/vendor-theme';
import { getQarColors } from '@/lib/theme';

it('uses Cockpit Precision colors without changing the customer palette', () => {
  const original = { ...getQarColors('dark') };
  expect(getVendorColors('dark')).toMatchObject({ background: '#101418', surface: '#191C20', gold: '#E9C349', primaryText: '#FFB4AB' });
  expect(getQarColors('dark')).toEqual(original);
});

it('keeps readable neutral light surfaces and scarlet controls', () => {
  expect(getVendorColors('light')).toMatchObject({ background: '#F4F5F7', text: '#171717', border: '#DCE0E5', primary: '#E31E24' });
});
