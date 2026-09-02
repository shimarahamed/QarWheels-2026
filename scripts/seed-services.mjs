/**
 * seed-services.mjs — writes vendor services, inventory, and promotions.
 *
 * Run AFTER temporarily enabling the seed bypass rule in firestore.rules:
 *
 *   1. Open firestore.rules
 *   2. Uncomment this line (inside the outer match block):
 *        match /{document=**} { allow read, write: if true; }
 *   3. Deploy: npx firebase-tools deploy --only firestore:rules
 *   4. Run: node --env-file=.env.local scripts/seed-services.mjs
 *   5. Re-comment the bypass line and re-deploy rules
 *
 * Run: node --env-file=.env.local scripts/seed-services.mjs
 */
import 'dotenv/config';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!PROJECT_ID) throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsVal) } };
  if (typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, fsVal(val)])) } };
  }
  return { stringValue: String(v) };
}

async function fsWrite(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fsVal(v)]));
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE}/${path}?${mask}&key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`[${res.status}] ${body?.error?.message || res.statusText}`);
  }
}

const SEED_UID = 'oOI5zUcOjqSgkl1nZV7xV8CfFfF3';

const VENDORS = [
  {
    id: 'vendor_aab_toyota',
    ownerId: SEED_UID,
    imageId: 'garage-interior',
    services: [
      { id: 'toyota-oil-change', name: 'Toyota Genuine Oil Service', description: 'Synthetic engine oil, OEM filter replacement, multi-point inspection, and digital service stamp.', duration: 45, price: 380 },
      { id: 'toyota-ac-service', name: 'Air Conditioning Service', description: 'Gas recharge, condenser clean, cabin filter replacement — essential for Qatar summers.', duration: 90, price: 450 },
      { id: 'toyota-brake-overhaul', name: 'Full Brake Overhaul', description: 'Pads, rotors, brake fluid flush, and caliper inspection on all four wheels.', duration: 120, price: 950 },
      { id: 'toyota-60k-service', name: '60,000 km Major Service', description: 'Full 60 k service: timing belt, spark plugs, filters, fluids, and thorough chassis inspection.', duration: 240, price: 2200 },
      { id: 'toyota-tyre-rotation', name: 'Tyre Rotation & Balancing', description: 'Four-wheel rotation, dynamic balancing, and tyre pressure calibration.', duration: 60, price: 180 },
    ],
    inventory: [
      { id: 'toyota-oil-filter', name: 'Toyota Genuine Oil Filter', sku: 'TYT-FLT-001', stock: 120, price: 55, supplier: 'Toyota Gulf' },
      { id: 'toyota-cabin-filter', name: 'Toyota Cabin Air Filter', sku: 'TYT-CAB-001', stock: 60, price: 95, supplier: 'Toyota Gulf' },
      { id: 'toyota-brake-pad', name: 'Toyota Genuine Brake Pad Set (Front)', sku: 'TYT-BRK-F01', stock: 40, price: 320, supplier: 'Toyota Gulf' },
    ],
    promotions: [
      { id: 'toyota-summer-promo', title: 'Summer AC Check', description: 'Free AC inspection with any oil service — beat the Qatar heat.', discount: '15%', code: 'AAB-SUMMER26', startDate: '2026-05-01', endDate: '2026-09-30' },
    ],
  },
  {
    id: 'vendor_al_mana_ford',
    ownerId: SEED_UID,
    imageId: 'garage-exterior',
    services: [
      { id: 'ford-oil-service', name: 'Ford Motorcraft Oil Service', description: 'Motorcraft synthetic oil, filter change, brake & fluid level check, and multi-point inspection.', duration: 45, price: 350 },
      { id: 'ford-transmission', name: 'Automatic Transmission Service', description: 'Fluid drain and refill, filter replacement, and shift quality test.', duration: 120, price: 780 },
      { id: 'ford-alignment', name: 'Four-Wheel Alignment & Balancing', description: 'Computer-assisted 4-wheel alignment, dynamic wheel balancing, and tyre pressure check.', duration: 60, price: 250 },
      { id: 'ford-ac-regas', name: 'AC Regas & Sanitise', description: 'R134a refrigerant recharge, leak test, condenser flush, and anti-bacterial cabin treatment.', duration: 90, price: 380 },
      { id: 'ford-battery', name: 'Battery Replacement & Charging', description: 'Motorcraft battery test, replacement with OEM unit, and 12V system health check.', duration: 30, price: 420 },
    ],
    inventory: [
      { id: 'ford-oil', name: 'Ford Motorcraft 5W-30 Synthetic (5L)', sku: 'FRD-OIL-5W30', stock: 80, price: 175, supplier: 'Ford Gulf Parts' },
      { id: 'ford-wiper', name: 'Ford OEM Wiper Blade Set', sku: 'FRD-WPR-001', stock: 50, price: 85, supplier: 'Ford Gulf Parts' },
      { id: 'ford-battery-oem', name: 'Motorcraft Battery 65AH', sku: 'FRD-BAT-065', stock: 20, price: 380, supplier: 'Motorcraft Qatar' },
    ],
    promotions: [],
  },
  {
    id: 'vendor_nissan_service',
    ownerId: SEED_UID,
    imageId: 'garage-interior',
    services: [
      { id: 'nissan-oil-service', name: 'Nissan Genuine Oil Service', description: 'Castrol Nissan-spec synthetic oil, OEM filter, top-up all fluids, 21-point inspection.', duration: 45, price: 340 },
      { id: 'nissan-patrol-ac', name: 'Patrol/Pathfinder AC Service', description: "Full AC system service tailored for Qatar's harsh climate — regas, clean, disinfect.", duration: 120, price: 550 },
      { id: 'nissan-ecu-scan', name: 'ECU Diagnostic Scan', description: 'Full vehicle ECU scan using Nissan CONSULT-3 Plus diagnostic tool with detailed report.', duration: 60, price: 200 },
      { id: 'nissan-suspension', name: 'Suspension Inspection & Repair', description: 'Full front and rear suspension inspection, shock absorber test, and alignment check.', duration: 90, price: 600 },
      { id: 'nissan-timing-chain', name: 'Timing Chain Service', description: 'Timing chain tension check, tensioner replacement if needed, and full fluid change.', duration: 180, price: 1800 },
    ],
    inventory: [
      { id: 'nissan-oil-filter', name: 'Nissan Genuine Oil Filter', sku: 'NSN-FLT-001', stock: 90, price: 50, supplier: 'Nissan Qatar Parts' },
      { id: 'nissan-air-filter', name: 'Nissan Air Filter (V8)', sku: 'NSN-AIR-V8', stock: 45, price: 120, supplier: 'Nissan Qatar Parts' },
      { id: 'nissan-spark-plug', name: 'NGK Iridium Spark Plugs (set of 8)', sku: 'NSN-SPK-IX8', stock: 30, price: 480, supplier: 'NGK Gulf' },
    ],
    promotions: [
      { id: 'nissan-free-scan', title: 'Free ECU Scan', description: 'Complimentary ECU diagnostic scan with any major service booking.', discount: 'Free Scan', code: 'NSN-SCAN26', startDate: '2026-04-01', endDate: '2026-07-31' },
    ],
  },
  {
    id: 'vendor_teyseer',
    ownerId: SEED_UID,
    imageId: 'garage-exterior',
    services: [
      { id: 'tsc-express-oil', name: 'Express Oil & Filter Change', description: 'Any brand, any grade — synthetic or semi-synthetic oil and filter while you wait. No appointment needed.', duration: 30, price: 280 },
      { id: 'tsc-full-detailing', name: 'Full Car Detailing', description: 'Interior deep-clean, exterior clay bar and machine polish, ceramic coating application.', duration: 360, price: 1500 },
      { id: 'tsc-ac-full', name: 'Complete AC System Overhaul', description: 'Full AC service: compressor check, refrigerant recharge, condenser & evaporator clean, cabin disinfection.', duration: 150, price: 650 },
      { id: 'tsc-tyre-service', name: 'Tyre Supply & Fitment', description: 'Supply and fit premium tyres (Michelin, Bridgestone, Pirelli) with balancing and TPMS reset.', duration: 60, price: 850 },
      { id: 'tsc-emergency', name: '24-Hour Emergency Service', description: 'Round-the-clock breakdown assistance including towing, on-site repair, and temporary fixes.', duration: 60, price: 500 },
    ],
    inventory: [
      { id: 'tsc-castrol-5w30', name: 'Castrol EDGE 5W-30 (5L)', sku: 'TSC-OIL-5W30', stock: 200, price: 165, supplier: 'Castrol Qatar' },
      { id: 'tsc-michelin-225', name: 'Michelin Primacy 4 225/60R18', sku: 'TSC-TYR-P4225', stock: 16, price: 420, supplier: 'Michelin Qatar' },
      { id: 'tsc-ceramic', name: 'CarPro Cquartz Ceramic Coat (50ml)', sku: 'TSC-CRM-CQ50', stock: 10, price: 890, supplier: 'Detail Hub Qatar' },
    ],
    promotions: [
      { id: 'tsc-loyalty', title: 'Loyalty Discount', description: '10% off all services for returning customers. Show your previous invoice.', discount: '10%', code: 'TSC-LOYAL', startDate: '2026-01-01', endDate: '2026-12-31' },
      { id: 'tsc-detailing-promo', title: 'Detailing Summer Special', description: 'Full detailing including ceramic coat at a special rate — protect against the summer heat.', discount: '20%', code: 'TSC-DETAIL26', startDate: '2026-05-01', endDate: '2026-08-31' },
    ],
  },
  {
    id: 'vendor_qauto_vw',
    ownerId: SEED_UID,
    imageId: 'garage-exterior',
    services: [
      { id: 'vw-oil-service', name: 'VW/Audi Longlife Oil Service', description: 'VW 504/507 spec oil (Castrol Edge), OEM filter, AdBlue top-up if applicable, service interval reset.', duration: 60, price: 420 },
      { id: 'vw-dsg-service', name: 'DSG Gearbox Service', description: 'Haldex / DSG transmission fluid replacement, mechatronic unit inspection, and adaptive reset.', duration: 120, price: 950 },
      { id: 'vw-carbon-clean', name: 'Intake Valve Carbon Clean', description: 'Walnut-blast cleaning of intake valves on direct-injection TSI/TFSI engines — restores lost power.', duration: 240, price: 1600 },
      { id: 'vw-brake-service', name: 'Brake Pad & Disc Replacement', description: 'Genuine VW/Audi brake pads and discs, brake fluid flush, EPB electronic caliper reset.', duration: 120, price: 1100 },
      { id: 'vw-ac-service', name: 'AC Regas & Pollen Filter', description: 'R134a/R1234yf recharge, pollen filter replacement, and anti-bacterial evaporator clean.', duration: 90, price: 480 },
    ],
    inventory: [
      { id: 'vw-oil-504', name: 'Castrol Edge 5W-30 VW504 (5L)', sku: 'QAU-OIL-504', stock: 75, price: 190, supplier: 'Castrol VAG Qatar' },
      { id: 'vw-dsg-fluid', name: 'VW DSG7 Transmission Fluid (6L)', sku: 'QAU-DSG-FL7', stock: 25, price: 350, supplier: 'Volkswagen Gulf' },
      { id: 'vw-brake-pad-front', name: 'Audi A6/Q5 Front Brake Pad Set', sku: 'QAU-BRK-A6F', stock: 18, price: 450, supplier: 'TRW Qatar' },
    ],
    promotions: [
      { id: 'qauto-dsg-offer', title: 'DSG + Oil Service Bundle', description: 'Book DSG gearbox service and get oil service at 50% off — valid on VW & Audi.', discount: '50% Oil', code: 'QAUTO-DSG', startDate: '2026-06-01', endDate: '2026-08-31' },
    ],
  },
];

async function main() {
  console.log(`\nseeding services/inventory/promotions — project: ${PROJECT_ID}\n`);

  for (const vendor of VENDORS) {
    // Update vendor root to fix ownerId + imageId
    try {
      await fsWrite(`vendors/${vendor.id}`, { ownerId: vendor.ownerId, imageId: vendor.imageId });
      console.log(`  ✓ ${vendor.id} root updated`);
    } catch (e) {
      console.warn(`  ✗ ${vendor.id} root: ${e.message.slice(0, 80)}`);
    }

    for (const s of vendor.services) {
      const { id, ...d } = s;
      try { await fsWrite(`vendors/${vendor.id}/services/${id}`, d); console.log(`    ✓ service: ${s.name}`); }
      catch (e) { console.warn(`    ✗ service ${id}: ${e.message.slice(0, 60)}`); }
    }
    for (const item of vendor.inventory) {
      const { id, ...d } = item;
      try { await fsWrite(`vendors/${vendor.id}/inventory/${id}`, d); }
      catch { /* silent */ }
    }
    for (const promo of vendor.promotions) {
      const { id, ...d } = promo;
      try { await fsWrite(`vendors/${vendor.id}/promotions/${id}`, d); }
      catch { /* silent */ }
    }
    console.log();
  }

  console.log('Done. Remember to re-enable your Firestore security rules.\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
