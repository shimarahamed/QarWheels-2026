import { toVendorCsv, exportVendorCsv } from '@/lib/vendor-export';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: '/cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('escapes CSV and blocks formulas from spreadsheet execution', () => {
  expect(toVendorCsv(['Item'], [['=CMD()'], ['فلتر, "Oil"'], [null]]))
    .toBe('\uFEFF"Item"\r\n"\'=CMD()"\r\n"فلتر, ""Oil"""\r\n""');
});

it('writes a CSV to cache and opens the native share sheet', async () => {
  const file = { create: jest.fn(), write: jest.fn(), uri: '/cache/catalog.csv' };
  (File as unknown as jest.Mock).mockImplementation(() => file);
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  await exportVendorCsv('catalog.csv', ['Item'], [['Filter']]);
  expect(file.write).toHaveBeenCalledWith('\uFEFF"Item"\r\n"Filter"');
  expect(Sharing.shareAsync).toHaveBeenCalledWith(file.uri, expect.objectContaining({ mimeType: 'text/csv' }));
});

it('reports unsupported sharing without creating a file', async () => {
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
  await expect(exportVendorCsv('catalog.csv', [], [])).rejects.toThrow('unavailable');
  expect(File).not.toHaveBeenCalled();
});
