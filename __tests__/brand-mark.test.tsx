import { render, screen } from '@testing-library/react-native';

import { BrandMark } from '@/components/auth-flow';

// The lockup must match the web `Logo`: a red disc carrying "Q", the wordmark,
// and the "Your Car. Our Care." tagline. An earlier version dropped the
// tagline in compact mode, which is exactly the piece that was asked for.

describe('BrandMark', () => {
  it('renders the Q glyph, wordmark and tagline by default', () => {
    render(<BrandMark />);
    expect(screen.getByText('Q')).toBeTruthy();
    expect(screen.getByText('QarWheels')).toBeTruthy();
    expect(screen.getByText('Your Car. Our Care.')).toBeTruthy();
  });

  it('keeps the tagline when compact', () => {
    render(<BrandMark compact />);
    expect(screen.getByText('Your Car. Our Care.')).toBeTruthy();
  });

  it('keeps the tagline when stacked', () => {
    render(<BrandMark stacked />);
    expect(screen.getByText('Your Car. Our Care.')).toBeTruthy();
  });

  it('drops the whole text block, disc included, only for hideText', () => {
    render(<BrandMark hideText />);
    expect(screen.getByText('Q')).toBeTruthy();
    expect(screen.queryByText('QarWheels')).toBeNull();
    expect(screen.queryByText('Your Car. Our Care.')).toBeNull();
  });

  it('exposes the full brand to screen readers as one label', () => {
    render(<BrandMark />);
    expect(screen.getByLabelText('QarWheels — Your Car. Our Care.')).toBeTruthy();
  });

  it('does not scale the glyph with system text size, which would break the disc', () => {
    render(<BrandMark />);
    expect(screen.getByText('Q').props.allowFontScaling).toBe(false);
  });
});
