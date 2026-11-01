import { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';

import { featureAvailabilityScreenLayout } from '@/components/FeatureAvailabilityGate';

// The app uses Stack, not the optional ESM-only standard-navigation adapter.
jest.mock('expo-router/build/standard-navigation', () => ({}));

const renderUnsupported = jest.fn();
const unsupportedRequest = jest.fn();
const fakeSuccess = jest.fn();

function UnsupportedScreen() {
  renderUnsupported();
  useEffect(() => {
    unsupportedRequest();
    fakeSuccess();
  }, []);
  return <Text>Unsupported screen mounted</Text>;
}

function renderApp(initialUrl: string) {
  return renderRouter({
    _layout: () => <Stack screenLayout={featureAvailabilityScreenLayout} />,
    '(tabs)/search': () => <Text>Supported garage search</Text>,
    'booking/[id]': () => <Text>Supported booking</Text>,
    roadside: UnsupportedScreen,
    'damage-upload': UnsupportedScreen,
    'damage-results': UnsupportedScreen,
    'ai-mechanic': UnsupportedScreen,
    'ai-support': UnsupportedScreen,
    'repair-cost-forecast': UnsupportedScreen,
    'support-ticket': UnsupportedScreen,
    'contact-us': UnsupportedScreen,
    'apply-coupon/[id]': UnsupportedScreen,
    'live-tracking/[id]': UnsupportedScreen,
    'renew-policy/[id]': UnsupportedScreen,
    'share-passport/[id]': UnsupportedScreen,
    'payment-method/[id]': UnsupportedScreen,
  }, { initialUrl });
}

beforeEach(() => jest.clearAllMocks());

describe('availability gate inside the Expo navigator', () => {
  it.each([
    '/roadside', '/damage-upload', '/damage-results', '/ai-mechanic',
    '/ai-support', '/repair-cost-forecast', '/support-ticket', '/contact-us',
    '/apply-coupon/booking-123', '/live-tracking/booking-123',
    '/renew-policy/car-123', '/share-passport/car-123', '/payment-method/booking-123',
  ])('blocks cold deep link %s before render, requests, or fallback success', (path) => {
    renderApp(`${path}?source=notification`);
    expect(screen.getByText('Unavailable in this release')).toBeTruthy();
    expect(renderUnsupported).not.toHaveBeenCalled();
    expect(unsupportedRequest).not.toHaveBeenCalled();
    expect(fakeSuccess).not.toHaveBeenCalled();
  });

  it('returns to a supported booking without ever mounting the blocked screen', () => {
    renderApp('/booking/real-booking');
    testRouter.push('/live-tracking/real-booking');
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByText('Supported booking')).toBeTruthy();
    expect(renderUnsupported).not.toHaveBeenCalled();
  });

  it('browses supported garages from a blocked deep link', () => {
    renderApp('/share-passport/real-car');
    fireEvent.press(screen.getByRole('button', { name: 'Browse garages' }));
    expect(screen.getByText('Supported garage search')).toBeTruthy();
    expect(renderUnsupported).not.toHaveBeenCalled();
  });

  it('uses garage search for Back when a cold link has no history', () => {
    renderApp('/renew-policy/real-car');
    expect(testRouter.canGoBack()).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByText('Supported garage search')).toBeTruthy();
  });

  it('keeps a blocked stack entry unmounted when a supported route is pushed over it', () => {
    renderApp('/payment-method/real-booking');
    testRouter.push('/booking/real-booking');
    expect(screen.getByText('Supported booking')).toBeTruthy();
    expect(renderUnsupported).not.toHaveBeenCalled();
    expect(unsupportedRequest).not.toHaveBeenCalled();
  });
});
