/**
 * QarWheel seed script — populates 10 Qatar garage businesses (one
 * multi-branch), staff memberships with real Firebase Auth accounts +
 * synced claims, and a demo customer with cars and bookings across every
 * booking status.
 *
 * Rewritten for the Phase 1 multi-tenant schema (businesses/branches/
 * memberships) using the Admin SDK — no more client-SDK writes, no more
 * temporarily bypassing Firestore rules. Requires FIREBASE_SERVICE_ACCOUNT_KEY
 * in .env.local (see .env.example).
 *
 * Run: node --env-file=.env.local scripts/seed-demo.mjs
 * Reset first: node --env-file=.env.local scripts/reset-firestore.mjs --yes-i-mean-it
 */
import 'dotenv/config';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY. Copy .env.example to .env.local first.');
  return JSON.parse(raw);
}

const serviceAccount = loadServiceAccount();
const app = initializeApp({
  credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  }),
});
const db = getFirestore(app);
const auth = getAuth(app);

const now = new Date().toISOString();

async function getOrCreateAuthUser(email, displayName) {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return auth.createUser({ email, password: 'QarWheelSeed2026!', displayName, emailVerified: true });
  }
}

async function syncClaims(uid, businessId, role, branchIds) {
  await auth.setCustomUserClaims(uid, { qw: { r: role, b: businessId, br: branchIds } });
}

// ── Businesses (one multi-branch, to exercise the schema; four single-branch) ──

const BUSINESSES = [
  {
    id: 'biz_aab_toyota',
    legalName: 'Abdullah Abdulghani & Bros Co. W.L.L.',
    displayName: 'AAB Toyota',
    ownerEmail: 'owner@aabqatar.com',
    contactEmail: 'service@aabqatar.com',
    contactPhone: '+97440316000',
    websiteUrl: 'https://www.aabqatar.com',
    branches: [
      {
        id: 'brn_aab_industrial',
        name: 'AAB Toyota — Industrial Area',
        address: 'Street 6, Industrial Area', city: 'Doha', country: 'Qatar',
        latitude: 25.21443, longitude: 51.43446, phoneNumber: '+97440316000',
        rating: 4.7, reviewCount: 312, imageUrl: 'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7692?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager.industrial@aabqatar.com',
        staffEmail: 'tech1.industrial@aabqatar.com',
      },
      {
        id: 'brn_aab_west_bay',
        name: 'AAB Toyota — West Bay Express',
        address: 'West Bay, Doha', city: 'Doha', country: 'Qatar',
        latitude: 25.32, longitude: 51.53, phoneNumber: '+97440316010',
        rating: 4.5, reviewCount: 88, imageUrl: 'https://images.unsplash.com/photo-1632823471565-1ec2b1de9dcc?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager.westbay@aabqatar.com',
        staffEmail: 'tech1.westbay@aabqatar.com',
      },
    ],
    services: [
      { name: 'Toyota Genuine Oil Service', description: 'Synthetic engine oil, OEM filter replacement, multi-point inspection.', duration: 45, price: 380, category: 'Maintenance' },
      { name: 'Air Conditioning Service', description: 'Gas recharge, condenser clean, cabin filter replacement.', duration: 90, price: 450, category: 'Comfort' },
      { name: 'Full Brake Overhaul', description: 'Pads, rotors, brake fluid flush, caliper inspection on all four wheels.', duration: 120, price: 950, category: 'Safety' },
    ],
    inventory: [
      { name: 'Toyota Genuine Oil Filter', sku: 'TYT-FLT-001', quantity: 120, minQuantity: 20, unitPrice: 55, supplier: 'Toyota Gulf' },
      { name: 'Toyota Genuine Brake Pad Set (Front)', sku: 'TYT-BRK-F01', quantity: 40, minQuantity: 10, unitPrice: 320, supplier: 'Toyota Gulf' },
    ],
  },
  {
    id: 'biz_al_mana_ford',
    legalName: 'Al Mana Automotive Co. W.L.L.',
    displayName: 'Al Mana Ford & Lincoln',
    ownerEmail: 'owner@almanaford.qa',
    contactEmail: 'fordservice@almana.com',
    contactPhone: '+97440111222',
    branches: [
      {
        id: 'brn_almana_industrial',
        name: 'Al Mana Ford — Industrial Area',
        address: 'Street 23, Industrial Area', city: 'Doha', country: 'Qatar',
        latitude: 25.20205, longitude: 51.44531, phoneNumber: '+97440111222',
        rating: 4.6, reviewCount: 245, imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@almanaford.qa',
        staffEmail: 'tech1@almanaford.qa',
      },
    ],
    services: [
      { name: 'Ford Motorcraft Oil Service', description: 'Motorcraft synthetic oil, filter change, multi-point inspection.', duration: 45, price: 350, category: 'Maintenance' },
      { name: 'Automatic Transmission Service', description: 'Fluid drain and refill, filter replacement, shift quality test.', duration: 120, price: 780, category: 'Drivetrain' },
    ],
    inventory: [
      { name: 'Ford Motorcraft 5W-30 Synthetic (5L)', sku: 'FRD-OIL-5W30', quantity: 80, minQuantity: 15, unitPrice: 175, supplier: 'Ford Gulf Parts' },
    ],
  },
  {
    id: 'biz_nissan_service',
    legalName: 'Saleh Al Hamad Al Mana Co.',
    displayName: 'Nissan Authorised Service Centre',
    ownerEmail: 'owner@nissan-qatar.com',
    contactEmail: 'nissan.service@almana.com',
    contactPhone: '+97440224488',
    branches: [
      {
        id: 'brn_nissan_industrial',
        name: 'Nissan Service — Industrial Area',
        address: 'Industrial Area, Doha', city: 'Doha', country: 'Qatar',
        latitude: 25.21303, longitude: 51.43741, phoneNumber: '+97440224488',
        rating: 4.5, reviewCount: 198, imageUrl: 'https://images.unsplash.com/photo-1605164599901-db3fecb2a765?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@nissan-qatar.com',
        staffEmail: 'tech1@nissan-qatar.com',
      },
    ],
    services: [
      { name: 'Nissan Genuine Oil Service', description: 'Castrol Nissan-spec synthetic oil, OEM filter, 21-point inspection.', duration: 45, price: 340, category: 'Maintenance' },
      { name: 'ECU Diagnostic Scan', description: 'Full vehicle ECU scan using Nissan CONSULT-3 Plus diagnostic tool.', duration: 60, price: 200, category: 'Diagnostics' },
    ],
    inventory: [
      { name: 'Nissan Genuine Oil Filter', sku: 'NSN-FLT-001', quantity: 90, minQuantity: 20, unitPrice: 50, supplier: 'Nissan Qatar Parts' },
    ],
  },
  {
    id: 'biz_teyseer',
    legalName: 'Teyseer Group Holding',
    displayName: 'Teyseer Service Centre',
    ownerEmail: 'owner@tsc-qatar.com',
    contactEmail: 'info@tsc-qatar.com',
    contactPhone: '+97444682683',
    branches: [
      {
        id: 'brn_teyseer_airport',
        name: 'Teyseer — Airport Road',
        address: 'Airport Road (C Ring Road)', city: 'Doha', country: 'Qatar',
        latitude: 25.2637, longitude: 51.5541, phoneNumber: '+97444682683',
        rating: 4.8, reviewCount: 489, imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@tsc-qatar.com',
        staffEmail: 'tech1@tsc-qatar.com',
      },
    ],
    services: [
      { name: 'Express Oil & Filter Change', description: 'Any brand, any grade — while you wait, no appointment needed.', duration: 30, price: 280, category: 'Maintenance' },
      { name: 'Complete AC System Overhaul', description: 'Compressor check, refrigerant recharge, condenser & evaporator clean.', duration: 150, price: 650, category: 'Comfort' },
    ],
    inventory: [
      { name: 'Castrol EDGE 5W-30 (5L)', sku: 'TSC-OIL-5W30', quantity: 200, minQuantity: 30, unitPrice: 165, supplier: 'Castrol Qatar' },
    ],
  },
  {
    id: 'biz_qauto_vw',
    legalName: 'Q-Auto W.L.L.',
    displayName: 'Q-Auto Volkswagen & Audi',
    ownerEmail: 'owner@q-auto.com.qa',
    contactEmail: 'service@q-auto.com.qa',
    contactPhone: '+97440158800',
    branches: [
      {
        id: 'brn_qauto_industrial',
        name: 'Q-Auto — Industrial Area',
        address: 'Street 41, Gate 59, Industrial Area', city: 'Doha', country: 'Qatar',
        latitude: 25.19542, longitude: 51.44298, phoneNumber: '+97440158800',
        rating: 4.6, reviewCount: 176, imageUrl: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@q-auto.com.qa',
        staffEmail: 'tech1@q-auto.com.qa',
      },
    ],
    services: [
      { name: 'VW/Audi Longlife Oil Service', description: 'VW 504/507 spec oil, OEM filter, service interval reset.', duration: 60, price: 420, category: 'Maintenance' },
      { name: 'DSG Gearbox Service', description: 'Haldex / DSG transmission fluid replacement, adaptive reset.', duration: 120, price: 950, category: 'Drivetrain' },
    ],
    inventory: [
      { name: 'Castrol Edge 5W-30 VW504 (5L)', sku: 'QAU-OIL-504', quantity: 75, minQuantity: 15, unitPrice: 190, supplier: 'Castrol VAG Qatar' },
    ],
  },
  {
    id: 'biz_qspeedy_auto',
    legalName: 'QSpeedy Auto Services W.L.L.',
    displayName: 'QSpeedy Auto Garage',
    ownerEmail: 'owner@qspeedy.qa',
    contactEmail: 'service@qspeedy.qa',
    contactPhone: '+97440335577',
    branches: [
      {
        id: 'brn_qspeedy_bin_mahmoud',
        name: 'QSpeedy Auto Garage — Bin Mahmoud',
        address: 'Building 170, Street 18, Bin Mahmoud', city: 'Doha', country: 'Qatar',
        latitude: 25.29123, longitude: 51.51244, phoneNumber: '+97440335577',
        rating: 4.9, reviewCount: 260, imageUrl: 'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7692?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@qspeedy.qa',
        staffEmail: 'tech1@qspeedy.qa',
      },
    ],
    services: [
      { name: 'Oil and Filter Change', description: 'Any brand engine oil, OEM-equivalent filter, top-up of essential fluids.', duration: 45, price: 120, category: 'Maintenance' },
      { name: 'AC Cooling Check', description: 'Refrigerant pressure test, cabin filter inspection, cooling performance check.', duration: 60, price: 150, category: 'Comfort' },
    ],
    inventory: [
      { name: 'Valvoline 5W-30 Synthetic (4L)', sku: 'QSP-OIL-5W30', quantity: 100, minQuantity: 20, unitPrice: 85, supplier: 'Valvoline Qatar' },
    ],
  },
  {
    id: 'biz_crooz_auto',
    legalName: 'CrooZr Trading & Auto Center W.L.L.',
    displayName: 'CrooZr Auto Center',
    ownerEmail: 'owner@croozr.qa',
    contactEmail: 'parts@croozr.qa',
    contactPhone: '+97444207788',
    branches: [
      {
        id: 'brn_croozr_najma',
        name: 'CrooZr Auto Center — Najma',
        address: 'Gate 20, Street 5, Najma', city: 'Doha', country: 'Qatar',
        latitude: 25.29841, longitude: 51.49102, phoneNumber: '+97444207788',
        rating: 4.8, reviewCount: 142, imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@croozr.qa',
        staffEmail: 'tech1@croozr.qa',
      },
    ],
    services: [
      { name: 'Brake Pad Inspection & Replacement', description: 'Front and rear pad inspection, replacement with OEM-equivalent parts.', duration: 40, price: 90, category: 'Safety' },
      { name: 'Genuine Spare Parts Fitting', description: 'Supply and fitting of genuine and OEM-equivalent spare parts.', duration: 60, price: 200, category: 'Parts' },
    ],
    inventory: [
      { name: 'Bosch Brake Pad Set (Front)', sku: 'CRZ-BRK-F02', quantity: 60, minQuantity: 15, unitPrice: 145, supplier: 'Bosch Qatar' },
    ],
  },
  {
    id: 'biz_mega_auto',
    legalName: 'Mega Auto Bodywork & Paint Co. W.L.L.',
    displayName: 'Mega Auto Service',
    ownerEmail: 'owner@megaauto.qa',
    contactEmail: 'bodyshop@megaauto.qa',
    contactPhone: '+97444895512',
    branches: [
      {
        id: 'brn_mega_rayyan',
        name: 'Mega Auto Service — Al Rayyan',
        address: 'Gate 111, Street 29, Al Rayyan', city: 'Al-Rayyan', country: 'Qatar',
        latitude: 25.29056, longitude: 51.42499, phoneNumber: '+97444895512',
        rating: 4.7, reviewCount: 134, imageUrl: 'https://images.unsplash.com/photo-1605164599901-db3fecb2a765?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@megaauto.qa',
        staffEmail: 'tech1@megaauto.qa',
      },
    ],
    services: [
      { name: 'Full Body Paint & Bodywork', description: 'Panel repair, primer, colour-matched paint, and clear coat finish.', duration: 480, price: 1800, category: 'Bodywork' },
      { name: 'Dent Removal & Touch-up', description: 'Paintless dent repair with spot touch-up for minor panel damage.', duration: 90, price: 350, category: 'Bodywork' },
    ],
    inventory: [
      { name: 'PPG Base Coat Paint (1L, mixed)', sku: 'MGA-PNT-BASE', quantity: 40, minQuantity: 8, unitPrice: 220, supplier: 'PPG Qatar' },
    ],
  },
  {
    id: 'biz_auto_genius',
    legalName: 'Auto Genius Restoration & Diagnostics W.L.L.',
    displayName: 'Auto Genius',
    ownerEmail: 'owner@autogenius.qa',
    contactEmail: 'info@autogenius.qa',
    contactPhone: '+97444331199',
    branches: [
      {
        id: 'brn_autogenius_wakalat',
        name: 'Auto Genius — Al Wakalat Street',
        address: 'Al Wakalat Street', city: 'Doha', country: 'Qatar',
        latitude: 25.28296, longitude: 51.45601, phoneNumber: '+97444331199',
        rating: 4.6, reviewCount: 65, imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@autogenius.qa',
        staffEmail: 'tech1@autogenius.qa',
      },
    ],
    services: [
      { name: 'Full Diagnostics Report', description: 'Complete OBD-II scan across all modules with a written report.', duration: 45, price: 150, category: 'Diagnostics' },
      { name: 'Classic Car Restoration Consult', description: 'Assessment and quote for restoration work on classic and vintage vehicles.', duration: 60, price: 0, category: 'Restoration' },
    ],
    inventory: [
      { name: 'Autel MaxiCOM Diagnostic Kit', sku: 'AGN-DIAG-001', quantity: 3, minQuantity: 1, unitPrice: 3200, supplier: 'Autel Qatar' },
    ],
  },
  {
    id: 'biz_al_futtaim_toyota_lexus',
    legalName: 'Al Futtaim Motors Qatar W.L.L.',
    displayName: 'Al Futtaim Lexus Service',
    ownerEmail: 'owner@alfuttaimlexus.qa',
    contactEmail: 'lexusservice@alfuttaim.com',
    contactPhone: '+97440167700',
    branches: [
      {
        id: 'brn_alfuttaim_lexus_salwa',
        name: 'Al Futtaim Lexus — Salwa Road',
        address: 'Salwa Road', city: 'Doha', country: 'Qatar',
        latitude: 25.24892, longitude: 51.44678, phoneNumber: '+97440167700',
        rating: 4.8, reviewCount: 221, imageUrl: 'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=900&q=80',
        managerEmail: 'manager@alfuttaimlexus.qa',
        staffEmail: 'tech1@alfuttaimlexus.qa',
      },
    ],
    services: [
      { name: 'Lexus Genuine Oil Service', description: 'Lexus-spec synthetic oil, OEM filter, multi-point luxury inspection.', duration: 60, price: 480, category: 'Maintenance' },
      { name: 'Hybrid Battery Health Check', description: 'Full hybrid drive battery diagnostic and health report.', duration: 90, price: 300, category: 'Diagnostics' },
    ],
    inventory: [
      { name: 'Lexus Genuine Oil Filter', sku: 'LEX-FLT-001', quantity: 50, minQuantity: 10, unitPrice: 70, supplier: 'Al Futtaim Parts' },
    ],
  },
];

const CUSTOMER_EMAIL = 'walid.almansouri@demo.qarwheel.qa';
const CAR_LAND_CRUISER = 'car_land_cruiser_2022';
const CAR_CAMRY = 'car_camry_2020';
const CAR_PATROL = 'car_patrol_2021';

function historyEntry(status, uid, role) {
  return { status, at: now, byUid: uid, byRole: role };
}

async function seed() {
  console.log(`\nQarWheel seed (Phase 1 schema) — project: ${serviceAccount.project_id}\n`);

  console.log('── Businesses & branches ─────────────────────');
  for (const biz of BUSINESSES) {
    const owner = await getOrCreateAuthUser(biz.ownerEmail, `${biz.displayName} Owner`);

    await db.collection('businesses').doc(biz.id).set({
      legalName: biz.legalName,
      displayName: biz.displayName,
      ownerId: owner.uid,
      type: 'Garage',
      status: 'Active',
      contactEmail: biz.contactEmail,
      contactPhone: biz.contactPhone,
      ...(biz.websiteUrl ? { websiteUrl: biz.websiteUrl } : {}),
      kyc: { status: 'Verified', crNumber: `CR-${biz.id.toUpperCase()}`, submittedAt: now, reviewedAt: now },
      payout: { provider: 'stripe_connect', status: 'Enabled' },
      commissionRateBps: 1000,
      branchCount: biz.branches.length,
      createdAt: now, updatedAt: now,
    });

    await db.collection('memberships').doc(`${owner.uid}_${biz.id}`).set({
      userId: owner.uid, businessId: biz.id, role: 'business_owner',
      branchIds: [], status: 'Active', email: biz.ownerEmail, displayName: `${biz.displayName} Owner`,
      invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
    });
    await syncClaims(owner.uid, biz.id, 'business_owner', []);

    // One vendor_admin demo account on the multi-branch business only — full
    // access, business-wide, so there's a seeded account for every role in
    // the matrix without adding an admin to all ten businesses.
    if (biz.id === 'biz_aab_toyota') {
      const admin = await getOrCreateAuthUser('admin@aabqatar.com', `${biz.displayName} Admin`);
      await db.collection('memberships').doc(`${admin.uid}_${biz.id}`).set({
        userId: admin.uid, businessId: biz.id, role: 'vendor_admin', jobTitle: 'Business Admin',
        branchIds: [], status: 'Active', email: 'admin@aabqatar.com', displayName: `${biz.displayName} Admin`,
        invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
      });
      await syncClaims(admin.uid, biz.id, 'vendor_admin', []);
    }

    for (const branch of biz.branches) {
      await db.collection('branches').doc(branch.id).set({
        businessId: biz.id, name: branch.name, status: 'Approved', isListed: true,
        address: branch.address, city: branch.city, country: branch.country,
        latitude: branch.latitude, longitude: branch.longitude, phoneNumber: branch.phoneNumber,
        vacationMode: false, rating: branch.rating, reviewCount: branch.reviewCount,
        completedBookingsCount: 0, startingPriceValue: biz.services[0]?.price ?? 100,
        responseTimeMins: 15, pickupAvailable: true, warranty: '7-day warranty',
        tags: ['Verified'], imageUrl: branch.imageUrl,
        approvedAt: now, approvedBy: owner.uid, createdAt: now, updatedAt: now,
      });

      const manager = await getOrCreateAuthUser(branch.managerEmail, `${branch.name} Manager`);
      await db.collection('memberships').doc(`${manager.uid}_${biz.id}`).set({
        userId: manager.uid, businessId: biz.id, role: 'vendor_manager', jobTitle: 'Branch Manager',
        branchIds: [branch.id], status: 'Active', email: branch.managerEmail, displayName: `${branch.name} Manager`,
        invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
      });
      await syncClaims(manager.uid, biz.id, 'vendor_manager', [branch.id]);

      const staff = await getOrCreateAuthUser(branch.staffEmail, `${branch.name} Technician`);
      await db.collection('memberships').doc(`${staff.uid}_${biz.id}`).set({
        userId: staff.uid, businessId: biz.id, role: 'vendor_staff', jobTitle: 'Technician',
        branchIds: [branch.id], status: 'Active', email: branch.staffEmail, displayName: `${branch.name} Technician`,
        invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
      });
      await syncClaims(staff.uid, biz.id, 'vendor_staff', [branch.id]);

      // vendor_cashier and vendor_inventory demo accounts, seeded once (on
      // this business's first branch) rather than per-branch — same
      // reasoning as the vendor_admin account above.
      if (branch.id === 'brn_aab_industrial') {
        const cashier = await getOrCreateAuthUser('cashier.industrial@aabqatar.com', `${branch.name} Cashier`);
        await db.collection('memberships').doc(`${cashier.uid}_${biz.id}`).set({
          userId: cashier.uid, businessId: biz.id, role: 'vendor_cashier', jobTitle: 'Cashier',
          branchIds: [branch.id], status: 'Active', email: 'cashier.industrial@aabqatar.com', displayName: `${branch.name} Cashier`,
          invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
        });
        await syncClaims(cashier.uid, biz.id, 'vendor_cashier', [branch.id]);

        const inventory = await getOrCreateAuthUser('inventory.industrial@aabqatar.com', `${branch.name} Inventory`);
        await db.collection('memberships').doc(`${inventory.uid}_${biz.id}`).set({
          userId: inventory.uid, businessId: biz.id, role: 'vendor_inventory', jobTitle: 'Inventory Manager',
          branchIds: [branch.id], status: 'Active', email: 'inventory.industrial@aabqatar.com', displayName: `${branch.name} Inventory`,
          invitedBy: owner.uid, invitedAt: now, acceptedAt: now, createdAt: now, updatedAt: now,
        });
        await syncClaims(inventory.uid, biz.id, 'vendor_inventory', [branch.id]);
      }

      for (const svc of biz.services) {
        await db.collection('branch_services').add({
          businessId: biz.id, branchId: branch.id, active: true, ...svc,
        });
      }
      for (const item of biz.inventory) {
        await db.collection('branch_inventory').add({
          businessId: biz.id, branchId: branch.id, ...item,
        });
      }
      console.log(`  ✓ ${branch.name} (owner/manager/staff accounts + claims synced)`);
    }
  }

  console.log('\n── Customer ───────────────────────────────────');
  const customer = await getOrCreateAuthUser(CUSTOMER_EMAIL, 'Walid Al-Mansouri');
  await db.collection('users').doc(customer.uid).set({
    firstName: 'Walid', lastName: 'Al-Mansouri', email: CUSTOMER_EMAIL,
    phoneNumber: '+97450123456', createdAt: now, updatedAt: now,
  }, { merge: true });
  console.log('  ✓ user: Walid Al-Mansouri');

  const cars = [
    { id: CAR_LAND_CRUISER, vin: 'JTMCY7AJ1M4100001', make: 'Toyota', model: 'Land Cruiser', year: 2022, licensePlate: 'Qatar 2026 A', color: 'Pearl White', engineType: 'V8 Gasoline', currentMileage: 42000 },
    { id: CAR_CAMRY, vin: '4T1BF3EK2AU123456', make: 'Toyota', model: 'Camry', year: 2020, licensePlate: 'Qatar 8845 B', color: 'Midnight Black', engineType: '2.5L Inline-4 Gasoline', currentMileage: 58000 },
    { id: CAR_PATROL, vin: 'JN1TBNT32A0123456', make: 'Nissan', model: 'Patrol', year: 2021, licensePlate: 'Qatar 3312 C', color: 'Desert Sand', engineType: 'V8 4.0L Gasoline', currentMileage: 32000 },
  ];
  for (const car of cars) {
    const { id, ...d } = car;
    await db.collection('users').doc(customer.uid).collection('cars').doc(id).set({
      ...d, userId: customer.uid, lastMileageUpdateDate: now, createdAt: now, updatedAt: now,
    });
    console.log(`  ✓ car: ${d.year} ${d.make} ${d.model}`);
  }

  console.log('\n── Bookings (one Pending per branch, plus a spread of other statuses) ──');
  const aab = BUSINESSES[0];
  const bookingSeeds = [
    // A Pending booking per AAB branch so the accept/reject flow is demoable immediately.
    { businessId: aab.id, branchId: aab.branches[0].id, branchName: aab.branches[0].name, carId: CAR_LAND_CRUISER, serviceName: 'Toyota Genuine Oil Service', status: 'Pending', cost: 380, daysFromNow: 3 },
    { businessId: aab.id, branchId: aab.branches[1].id, branchName: aab.branches[1].name, carId: CAR_CAMRY, serviceName: 'Air Conditioning Service', status: 'Pending', cost: 450, daysFromNow: 5 },
    { businessId: 'biz_teyseer', branchId: 'brn_teyseer_airport', branchName: 'Teyseer — Airport Road', carId: CAR_CAMRY, serviceName: 'Express Oil & Filter Change', status: 'Confirmed', cost: 280, daysFromNow: 7 },
    { businessId: 'biz_nissan_service', branchId: 'brn_nissan_industrial', branchName: 'Nissan Service — Industrial Area', carId: CAR_PATROL, serviceName: 'ECU Diagnostic Scan', status: 'Completed', cost: 200, daysFromNow: -14 },
    { businessId: 'biz_teyseer', branchId: 'brn_teyseer_airport', branchName: 'Teyseer — Airport Road', carId: CAR_LAND_CRUISER, serviceName: 'Complete AC System Overhaul', status: 'Completed', cost: 650, daysFromNow: -45 },
    { businessId: 'biz_al_mana_ford', branchId: 'brn_almana_industrial', branchName: 'Al Mana Ford — Industrial Area', carId: CAR_CAMRY, serviceName: 'Automatic Transmission Service', status: 'Cancelled', cost: 780, daysFromNow: -60 },
  ];

  const completedBookings = [];
  for (const b of bookingSeeds) {
    const bookingDate = new Date(Date.now() + 86_400_000 * b.daysFromNow);
    const history = [historyEntry('Pending', customer.uid, 'customer')];
    if (b.status !== 'Pending') {
      history.push(historyEntry(b.status, customer.uid, 'customer'));
    }
    const ref = await db.collection('bookings').add({
      userId: customer.uid, customerName: 'Walid Al-Mansouri', customerEmail: CUSTOMER_EMAIL,
      businessId: b.businessId, branchId: b.branchId, branchName: b.branchName,
      carId: b.carId, serviceName: b.serviceName, bookingDate: bookingDate.toISOString(),
      status: b.status, cost: b.cost, notes: '', statusHistory: history,
      createdAt: now, updatedAt: now,
    });
    if (b.status === 'Completed') completedBookings.push({ id: ref.id, ...b });
    console.log(`  ✓ ${b.serviceName} @ ${b.branchName} [${b.status}] (${ref.id})`);
  }

  // ── Ledger ────────────────────────────────────────────────────────────────
  // In production these are written by the booking transition route when a
  // booking completes. Seeded directly here so the payouts screen has a real
  // balance on first launch rather than an empty state.
  console.log('\n── Transactions & invoices ────────────────────');
  const COMMISSION_BPS = 1000; // matches the businesses seeded above
  for (const b of completedBookings) {
    const grossMinorUnits = Math.round(b.cost * 100);
    const commissionMinorUnits = Math.round((grossMinorUnits * COMMISSION_BPS) / 10_000);
    await db.collection('transactions').add({
      businessId: b.businessId, branchId: b.branchId, bookingId: b.id,
      customerName: 'Walid Al-Mansouri', serviceName: b.serviceName,
      grossMinorUnits, commissionMinorUnits,
      netMinorUnits: grossMinorUnits - commissionMinorUnits,
      currency: 'QAR', status: 'Settled', createdAt: now,
    });

    await db.collection('invoices').add({
      businessId: b.businessId, branchId: b.branchId, bookingId: b.id,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(completedBookings.indexOf(b) + 1).padStart(4, '0')}`,
      userId: customer.uid, customerName: 'Walid Al-Mansouri', customerEmail: CUSTOMER_EMAIL,
      lineItems: [{ description: b.serviceName, quantity: 1, unitPriceMinorUnits: grossMinorUnits }],
      subtotalMinorUnits: grossMinorUnits, taxMinorUnits: 0, totalMinorUnits: grossMinorUnits,
      currency: 'QAR', status: 'Paid', issuedAt: now, paidAt: now,
      createdAt: now, updatedAt: now,
    });
    console.log(`  ✓ transaction + invoice for ${b.serviceName} (QAR ${b.cost})`);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  console.log('\n── Conversations ──────────────────────────────');
  const chatBranch = aab.branches[0];
  const conversationRef = await db.collection('conversations').add({
    participants: [customer.uid, chatBranch.id],
    userId: customer.uid, customerName: 'Walid Al-Mansouri',
    businessId: aab.id, branchId: chatBranch.id, branchName: chatBranch.name,
    lastMessage: 'Sure — we can take a look this afternoon.',
    lastMessageAt: now, lastMessageBy: 'seed-vendor',
    // The customer has one unread reply waiting, so the badge is visible.
    unread: { [customer.uid]: 1 },
    createdAt: now, updatedAt: now,
  });
  const seedMessages = [
    { senderId: customer.uid, senderName: 'Walid Al-Mansouri', senderRole: 'customer', body: 'Hi — my Land Cruiser is making a noise when braking. Can you check it?' },
    { senderId: 'seed-vendor', senderName: aab.displayName, senderRole: 'vendor', body: 'Sure — we can take a look this afternoon.' },
  ];
  for (const m of seedMessages) {
    await db.collection('messages').add({ conversationId: conversationRef.id, ...m, createdAt: now });
  }
  console.log(`  ✓ conversation with ${chatBranch.name} (${seedMessages.length} messages)`);

  console.log('\nDone. All seeded accounts use password: QarWheelSeed2026!\n');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
