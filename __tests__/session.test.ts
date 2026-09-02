import { useQarWheelStore } from '@/lib/store';

// Signing out must not leave the previous person's wallet, addresses or —
// most sensitively — uploaded licence and ID documents on a shared device.

describe('clearPersonalData', () => {
  beforeEach(() => {
    const store = useQarWheelStore.getState();
    store.addAddress({ label: 'Home', line: 'Building 24', area: 'Doha' });
    store.topUpWallet(250, 'Card');
    store.addDocument({ kind: 'license', title: 'Driving licence', uri: 'file:///licence.jpg' });
    store.addInvoice({
      garage: 'QSpeedy',
      service: 'Oil change',
      amount: 180,
      status: 'Paid',
      method: 'Wallet',
    });
  });

  it('removes every category of personal data', () => {
    // Precondition: the fixtures above actually landed.
    expect(useQarWheelStore.getState().addresses.length).toBeGreaterThan(0);
    expect(useQarWheelStore.getState().walletBalance).toBeGreaterThan(0);
    expect(useQarWheelStore.getState().documents.length).toBeGreaterThan(0);
    expect(useQarWheelStore.getState().invoices.length).toBeGreaterThan(0);

    useQarWheelStore.getState().clearPersonalData();

    const after = useQarWheelStore.getState();
    expect(after.addresses).toEqual([]);
    expect(after.walletBalance).toBe(0);
    expect(after.walletTransactions).toEqual([]);
    expect(after.documents).toEqual([]);
    expect(after.invoices).toEqual([]);
    expect(after.bookings).toEqual([]);
    expect(after.favoriteGarageIds).toEqual([]);
    expect(after.vendorAuthenticated).toBe(false);
  });

  it('keeps device preferences, which are not personal data', () => {
    const store = useQarWheelStore.getState();
    store.setLanguage('ar');
    store.chooseThemeMode('light');

    store.clearPersonalData();

    const after = useQarWheelStore.getState();
    expect(after.language).toBe('ar');
    expect(after.themeMode).toBe('light');
  });
});

describe('wallet ledger', () => {
  beforeEach(() => useQarWheelStore.getState().clearPersonalData());

  it('refuses a charge that exceeds the balance, recording nothing', () => {
    const store = useQarWheelStore.getState();
    store.topUpWallet(100, 'Card');

    const ok = useQarWheelStore.getState().chargeWallet(250, 'Oil change');

    expect(ok).toBe(false);
    expect(useQarWheelStore.getState().walletBalance).toBe(100);
    // One entry for the top-up, none for the refused charge.
    expect(useQarWheelStore.getState().walletTransactions).toHaveLength(1);
  });

  it('records a running balance that matches the arithmetic', () => {
    const store = useQarWheelStore.getState();
    store.topUpWallet(200, 'Card');
    useQarWheelStore.getState().chargeWallet(75.5, 'AC service');
    useQarWheelStore.getState().refundToWallet(25.5, 'Partial refund');

    const state = useQarWheelStore.getState();
    expect(state.walletBalance).toBeCloseTo(150, 2);
    // Newest first; each entry carries the balance immediately after it.
    expect(state.walletTransactions[0].balanceAfter).toBeCloseTo(150, 2);
    expect(state.walletTransactions[1].balanceAfter).toBeCloseTo(124.5, 2);
    expect(state.walletTransactions[2].balanceAfter).toBeCloseTo(200, 2);
  });

  it('keeps the first saved address as the default', () => {
    const store = useQarWheelStore.getState();
    const first = store.addAddress({ label: 'Home', line: 'A', area: 'Doha' });
    useQarWheelStore.getState().addAddress({ label: 'Work', line: 'B', area: 'Doha' });

    const addresses = useQarWheelStore.getState().addresses;
    expect(addresses.find((a) => a.id === first.id)?.isDefault).toBe(true);
    expect(addresses.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it('promotes another address when the default is deleted', () => {
    const store = useQarWheelStore.getState();
    const first = store.addAddress({ label: 'Home', line: 'A', area: 'Doha' });
    useQarWheelStore.getState().addAddress({ label: 'Work', line: 'B', area: 'Doha' });

    useQarWheelStore.getState().removeAddress(first.id);

    const addresses = useQarWheelStore.getState().addresses;
    expect(addresses).toHaveLength(1);
    expect(addresses[0].isDefault).toBe(true);
  });
});
