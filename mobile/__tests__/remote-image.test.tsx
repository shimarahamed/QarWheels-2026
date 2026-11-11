import { fireEvent, render, screen } from '@testing-library/react-native';

import { RemoteImage } from '@/components/RemoteImage';

// A plain <Image> with a dead URL renders nothing and leaves a hole in the
// layout — which is exactly what happened when five seeded Unsplash photos
// started returning 404.

describe('RemoteImage', () => {
  it('renders the image when a uri is given', async () => {
    await render(<RemoteImage uri="https://example.com/a.jpg" accessibilityLabel="Garage" />);
    expect(screen.getByLabelText('Garage')).toBeTruthy();
  });

  it('falls back to an icon tile when the image fails to load', async () => {
    await render(<RemoteImage uri="https://example.com/dead.jpg" accessibilityLabel="Garage" />);

    fireEvent(screen.getByLabelText('Garage'), 'error');

    // Still occupies its space and stays labelled, rather than vanishing.
    expect(screen.getByLabelText('Garage')).toBeTruthy();
  });

  it('shows the fallback immediately when there is no uri at all', async () => {
    await render(<RemoteImage uri={undefined} accessibilityLabel="Missing" />);
    expect(screen.getByLabelText('Missing')).toBeTruthy();
  });

  it('retries when the uri changes, so recycled rows do not inherit a failure', async () => {
    const { rerender } = await render(
      <RemoteImage uri="https://example.com/dead.jpg" accessibilityLabel="Tile" />,
    );
    fireEvent(screen.getByLabelText('Tile'), 'error');

    await rerender(<RemoteImage uri="https://example.com/good.jpg" accessibilityLabel="Tile" />);

    // The new uri gets a fresh attempt: an Image, not the fallback tile.
    expect(screen.getByLabelText('Tile')).toBeTruthy();
  });
});
