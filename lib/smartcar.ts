/**
 * Smartcar API integration.
 *
 * Production flow:
 *   1. User taps "Connect via Smartcar" → we open Smartcar Connect OAuth URL
 *   2. User logs into their car manufacturer account (BMW, Ford, Tesla, etc.)
 *   3. Smartcar redirects back to qarwheels:// with ?code=AUTH_CODE
 *   4. Our backend exchanges the code for access_token
 *   5. We call Smartcar vehicle endpoints to pull live data
 *
 * This file handles:
 *   - Building the Smartcar Connect OAuth URL
 *   - Defining the API types
 *   - Fetching vehicle data from Smartcar endpoints (via your backend proxy)
 *
 * The actual OAuth token exchange MUST happen server-side to protect
 * SMARTCAR_CLIENT_SECRET. Set up a thin endpoint on your backend:
 *   POST /api/smartcar/exchange  { code }  → { accessToken, vehicleIds[] }
 *   GET  /api/smartcar/vehicle/:id         → SmartcarVehicle
 *
 * Supported brands (as of 2025): Tesla, BMW, Mercedes, Ford, Chevrolet,
 * Toyota, Honda, Hyundai, Kia, Volvo, Volkswagen, Audi, Nissan, Subaru,
 * Lincoln, Cadillac, Buick, GMC, Jeep, and more.
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Set these in your .env / EAS environment variables.
 * NEVER hardcode the client secret here.
 */
const SMARTCAR_CLIENT_ID =
  process.env.EXPO_PUBLIC_SMARTCAR_CLIENT_ID ?? 'YOUR_SMARTCAR_CLIENT_ID';

const SMARTCAR_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.qarwheels.com';

// Deep link that Smartcar redirects to after OAuth (register this in Smartcar dashboard)
const REDIRECT_URI = 'qarwheels://smartcar-callback';

// Scopes we request — request only what you need
const SCOPES = [
  'read_vehicle_info',
  'read_vin',
  'read_odometer',
  'read_fuel',
  'read_battery',
  'read_engine_oil',
  'read_tires',
  'read_location',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SmartcarVehicleInfo = {
  id: string;
  make: string;
  model: string;
  year: number;
};

export type SmartcarVin = {
  vin: string;
};

export type SmartcarOdometer = {
  distance: number; // km
};

export type SmartcarFuel = {
  range: number;        // km
  percentRemaining: number; // 0.0–1.0
  amountRemaining: number;  // litres
};

export type SmartcarBattery = {
  range: number;           // km
  percentRemaining: number; // 0.0–1.0
};

export type SmartcarEngineOil = {
  lifeRemaining: number; // 0.0–1.0
};

export type SmartcarTirePressure = {
  frontLeft: number;  // kPa
  frontRight: number;
  backLeft: number;
  backRight: number;
};

export type SmartcarVehicleSnapshot = {
  info: SmartcarVehicleInfo;
  vin: string | null;
  odometer: number | null;    // km
  fuelPercent: number | null; // 0–100
  batteryPercent: number | null;
  engineOilLife: number | null; // 0–100
  tirePressures: SmartcarTirePressure | null;
  healthScore: number;
  source: 'smartcar';
};

export type SmartcarConnectResult =
  | { success: true; vehicles: SmartcarVehicleSnapshot[] }
  | { success: false; error: string };

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function buildSmartcarConnectUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SMARTCAR_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    mode: 'live',
    // flags: 'country:QA' — uncomment and set your country code
  });
  return `https://connect.smartcar.com/oauth/authorize?${params.toString()}`;
}

/**
 * Open Smartcar Connect in an in-app browser, wait for the deep link callback,
 * and return the auth code. Returns null if the user cancels.
 */
export async function launchSmartcarConnect(): Promise<string | null> {
  const url = buildSmartcarConnectUrl();

  // Set up deep link listener before opening browser
  let resolve: (code: string | null) => void;
  const promise = new Promise<string | null>((res) => { resolve = res; });

  const sub = Linking.addEventListener('url', ({ url: callbackUrl }) => {
    const parsed = Linking.parse(callbackUrl);
    if (parsed.path === 'smartcar-callback') {
      sub.remove();
      const code = (parsed.queryParams?.code as string) ?? null;
      resolve(code);
    }
  });

  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);
  if (result.type !== 'success') {
    sub.remove();
    return null;
  }

  // WebBrowser already handled the redirect on iOS — extract code from URL
  const parsed = Linking.parse(result.url);
  sub.remove();
  return (parsed.queryParams?.code as string) ?? null;
}

// ─── Backend API calls ────────────────────────────────────────────────────────

async function backendFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${SMARTCAR_BACKEND_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Smartcar backend error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Exchange the auth code for an access token (via your backend).
 * Returns array of Smartcar vehicle IDs.
 */
export async function exchangeSmartcarCode(code: string): Promise<{ accessToken: string; vehicleIds: string[] }> {
  return backendFetch('/api/smartcar/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/**
 * Fetch full vehicle data for a given Smartcar vehicle ID.
 * Your backend proxies this to protect the access token.
 */
export async function fetchSmartcarVehicle(vehicleId: string, accessToken: string): Promise<SmartcarVehicleSnapshot> {
  return backendFetch(`/api/smartcar/vehicle/${vehicleId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── Health score derivation for Smartcar data ───────────────────────────────

export function deriveSmartcarHealthScore(data: {
  fuelPercent?: number | null;
  batteryPercent?: number | null;
  engineOilLife?: number | null;
  tirePressures?: SmartcarTirePressure | null;
}): number {
  let score = 100;

  if (data.engineOilLife !== null && data.engineOilLife !== undefined) {
    if (data.engineOilLife < 10) score -= 25;
    else if (data.engineOilLife < 25) score -= 15;
    else if (data.engineOilLife < 50) score -= 8;
  }

  if (data.fuelPercent !== null && data.fuelPercent !== undefined && data.fuelPercent < 10) {
    score -= 5;
  }

  if (data.tirePressures) {
    const pressures = Object.values(data.tirePressures) as number[];
    const nominalKpa = 220; // typical nominal tire pressure
    for (const p of pressures) {
      const deviation = Math.abs(p - nominalKpa);
      if (deviation > 50) score -= 8;
      else if (deviation > 30) score -= 4;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Full connect flow (for use in the onboarding screen) ────────────────────

/**
 * Complete Smartcar connect flow:
 *   launch OAuth → exchange code → fetch vehicle snapshots
 *
 * Returns structured result suitable for prefilling the add-car form.
 */
export async function connectViaSmartcar(): Promise<SmartcarConnectResult> {
  try {
    const code = await launchSmartcarConnect();
    if (!code) return { success: false, error: 'User cancelled Smartcar login' };

    const { accessToken, vehicleIds } = await exchangeSmartcarCode(code);
    if (!vehicleIds.length) return { success: false, error: 'No vehicles found in your account' };

    const vehicles = await Promise.all(vehicleIds.map((id) => fetchSmartcarVehicle(id, accessToken)));
    return { success: true, vehicles };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Smartcar connection failed' };
  }
}
