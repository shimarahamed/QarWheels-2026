import { describe, expect, it } from 'vitest';
import { toVendorCsv } from '../../src/lib/vendor-export';

describe('vendor CSV export', () => {
  it('preserves quoted, multiline, Unicode and empty cells', () => {
    expect(toVendorCsv(['Item', 'Price'], [['فلتر, "Oil"\nFilter', 25], [null, 0]]))
      .toBe('\uFEFF"Item","Price"\r\n"فلتر, ""Oil""\nFilter","25"\r\n"","0"');
  });
  it('neutralizes spreadsheet formulas including leading whitespace', () => {
    expect(toVendorCsv(['Name'], [['=CMD()'], [' +SUM(1)'], ['@name'], ['-1'], ['normal']]))
      .toBe('\uFEFF"Name"\r\n"\'=CMD()"\r\n"\' +SUM(1)"\r\n"\'@name"\r\n"\'-1"\r\n"normal"');
  });
});
