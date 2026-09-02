# QarWheel — Recommended Schemas

## Firestore Schema: Flat Architecture

### Design Principles

1. **No nesting deeper than one level** — all collections at root
2. **Denormalize foreign keys** — each document contains all IDs needed to query related data
3. **Composite indexes for every query pattern** — defined in `firestore.indexes.json`
4. **Immutable audit fields** — `createdAt`, `createdBy` never modified after creation
5. **Typed enums as string literals** — consistent casing enforced by Zod

---

## Collection: `users`

```typescript
interface User {
  id: string;                    // Firestore doc ID (= Firebase Auth UID)
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  phoneCountryCode?: string;     // e.g., "+974" (Qatar)
  preferredLanguage: 'en' | 'ar';
  avatarUrl?: string;
  role: 'customer' | 'vendor_owner' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
  deletedAt?: Timestamp;         // Soft delete
}
```

**Zod Schema**:
```typescript
export const UserCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phoneNumber: z.string().regex(/^\d{8,15}$/).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).optional(),
  preferredLanguage: z.enum(['en', 'ar']).default('en'),
});
```

---

## Collection: `cars`

```typescript
interface Car {
  id: string;                    // Firestore doc ID
  userId: string;                // Owner — indexed
  vin: string;                   // 17-char, validated, indexed (unique per userId)
  make: string;
  model: string;
  year: number;                  // int, 1900–2027
  licensePlate: string;          // Qatar format e.g., "Q-12345"
  color?: string;
  currentMileage: number;        // km, int ≥ 0
  lastMileageUpdateDate?: string; // ISO date
  purchaseDate?: string;          // ISO date
  imageUrl?: string;
  imageStoragePath?: string;     // Firebase Storage path
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Denormalized for quick display (updated when car changes)
  displayName: string;           // e.g., "2021 Toyota Land Cruiser"
}
```

**Composite indexes needed**:
```json
{ "collectionGroup": "cars", "fields": [
  { "fieldPath": "userId", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "DESCENDING" }
]}
```

---

## Collection: `service_records`

```typescript
interface ServiceRecord {
  id: string;
  carId: string;                 // indexed
  userId: string;                // indexed (owner of the car)
  vendorId?: string;             // null if self-serviced
  bookingId?: string;            // linked booking if exists
  serviceType: string;           // "Oil Change", "Brake Replacement", etc.
  description?: string;
  date: Timestamp;               // When the service was performed
  mileageAtService: number;      // Odometer reading at service time
  cost: number;                  // QAR, ≥ 0
  currency: 'QAR';
  invoiceUrl?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;             // userId
}
```

**Composite indexes**:
```json
{ "collectionGroup": "service_records", "fields": [
  { "fieldPath": "carId", "order": "ASCENDING" },
  { "fieldPath": "date", "order": "DESCENDING" }
]},
{ "collectionGroup": "service_records", "fields": [
  { "fieldPath": "userId", "order": "ASCENDING" },
  { "fieldPath": "date", "order": "DESCENDING" }
]}
```

---

## Collection: `vendors`

```typescript
interface Vendor {
  id: string;
  ownerId: string;               // Firebase Auth UID of vendor owner — indexed
  name: string;
  nameAr?: string;               // Arabic name
  type: 'Garage' | 'Parts Store' | 'Both';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
  verificationTier: 'Unverified' | 'Basic' | 'Verified' | 'Premium';
  
  // Location
  address: string;
  addressAr?: string;
  city: string;                  // e.g., "Doha"
  country: 'QA' | 'AE' | 'SA' | 'KW' | 'BH' | 'OM'; // GCC
  latitude: number;
  longitude: number;
  geoHash: string;               // For geohash-based proximity queries
  
  // Contact
  phoneNumber: string;
  phoneCountryCode: string;
  email?: string;
  websiteUrl?: string;
  
  // Business details
  crNumber?: string;             // Commercial Registration
  licenseNumber?: string;
  workingHours?: WorkingHours;
  
  // Media
  imageUrl?: string;
  imageStoragePath?: string;
  galleryUrls?: string[];
  
  // Aggregate stats (updated via Cloud Function on review/booking events)
  rating: number;                // 0–5, 1 decimal place
  reviewCount: number;
  completedBookingsCount: number;
  
  // Metadata
  approvedAt?: Timestamp;
  approvedBy?: string;           // Admin userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
  suspendedAt?: Timestamp;
  suspendedReason?: string;
}

interface WorkingHours {
  sun: DaySchedule;
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
}

interface DaySchedule {
  isOpen: boolean;
  openTime?: string;  // "08:00"
  closeTime?: string; // "18:00"
}
```

---

## Collection: `vendor_services`

```typescript
interface VendorService {
  id: string;
  vendorId: string;              // indexed
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category: 'Maintenance' | 'Repair' | 'Inspection' | 'Bodywork' | 'Electrical' | 'Tires' | 'Other';
  price: number;                 // QAR
  currency: 'QAR';
  durationMinutes: number;       // Estimated service duration
  isAvailable: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `bookings`

```typescript
interface Booking {
  id: string;
  
  // Parties
  userId: string;                // indexed
  vendorId: string;              // indexed
  vendorName: string;            // Denormalized for display
  
  // Vehicle
  carId: string;
  carDisplayName: string;        // Denormalized: "2021 Toyota Land Cruiser"
  
  // Service
  serviceId?: string;            // Link to vendor_services
  serviceName: string;
  notes?: string;
  
  // Timing
  bookingDate: Timestamp;        // indexed
  duration?: number;             // Estimated minutes
  
  // Status
  status: 'Pending' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled' | 'NoShow';
  statusHistory: StatusChange[];
  
  // Financial
  estimatedCost?: number;
  actualCost?: number;
  currency: 'QAR';
  paymentStatus: 'Unpaid' | 'Paid' | 'Refunded';
  paymentIntentId?: string;      // Stripe
  
  // Vendor notes
  technicianNotes?: string;
  assignedStaffId?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: 'customer' | 'vendor' | 'admin';
  cancellationReason?: string;
}

interface StatusChange {
  status: string;
  changedAt: Timestamp;
  changedBy: string;   // userId
  reason?: string;
}
```

**Composite indexes**:
```json
{ "collectionGroup": "bookings", "fields": [
  { "fieldPath": "userId", "order": "ASCENDING" },
  { "fieldPath": "bookingDate", "order": "DESCENDING" }
]},
{ "collectionGroup": "bookings", "fields": [
  { "fieldPath": "vendorId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "bookingDate", "order": "ASCENDING" }
]},
{ "collectionGroup": "bookings", "fields": [
  { "fieldPath": "userId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" }
]}
```

---

## Collection: `vendor_reviews`

```typescript
interface VendorReview {
  id: string;
  vendorId: string;              // indexed
  userId: string;                // indexed
  bookingId: string;             // indexed — enforces one review per booking
  
  rating: number;                // 1–5 (integer)
  comment: string;               // max 1000 chars
  
  // Moderation
  status: 'Pending' | 'Published' | 'Hidden' | 'Flagged';
  moderationReason?: string;
  
  // Fraud signals
  ipAddress?: string;            // Hashed for privacy
  deviceFingerprint?: string;
  flagCount: number;
  
  // Vendor response
  vendorResponse?: string;
  vendorRespondedAt?: Timestamp;
  
  // Helpful votes
  helpfulCount: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `vendor_inventory`

```typescript
interface InventoryItem {
  id: string;
  vendorId: string;              // indexed
  name: string;
  sku: string;                   // Stock keeping unit
  category: string;
  description?: string;
  
  // Stock
  stockQuantity: number;
  minStockAlert: number;         // Trigger alert when stock falls below
  unit: 'piece' | 'liter' | 'kg' | 'set';
  
  // Pricing
  costPrice: number;             // Purchase price
  sellingPrice: number;          // Retail price
  currency: 'QAR';
  
  // Supplier
  supplierName?: string;
  supplierSku?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `vendor_staff`

```typescript
interface StaffMember {
  id: string;
  vendorId: string;              // indexed
  userId?: string;               // If staff member has a Firebase account
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'Technician' | 'Service Advisor' | 'Parts Specialist' | 'Manager' | 'Admin';
  status: 'Active' | 'Inactive' | 'OnLeave';
  
  // Schedule
  workingDays: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `vendor_promotions`

```typescript
interface Promotion {
  id: string;
  vendorId: string;              // indexed
  
  title: string;
  titleAr?: string;
  description?: string;
  
  code?: string;                 // Promo code (uppercase, alphanumeric)
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;         // % or QAR amount
  
  minimumBookingValue?: number;
  maximumDiscountCap?: number;
  usageLimit?: number;           // Max total uses
  usageCount: number;            // Current uses
  
  applicableServices?: string[]; // serviceId[] — empty means all services
  
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'Active' | 'Inactive' | 'Expired';
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `ai_predictions`

```typescript
interface AIPrediction {
  id: string;
  carId: string;                 // indexed
  userId: string;                // indexed
  
  type: 'maintenance' | 'diagnosis' | 'service_summary';
  
  // Input snapshot (for reproducibility)
  inputHash: string;             // SHA256 of input for dedup/caching
  
  // Output
  result: unknown;               // Typed by flow — stored as-is
  confidenceScore: number;       // 0–1
  modelVersion: string;          // "gemini-1.5-flash"
  
  // Cost tracking
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  
  // Metadata
  latencyMs: number;
  cached: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;          // For cache TTL — typically 24–72h
}
```

---

## Collection: `audit_log`

```typescript
interface AuditLog {
  id: string;
  
  // Actor
  actorId: string;               // userId
  actorRole: string;
  actorIp?: string;              // Hashed
  
  // Action
  action: string;                // e.g., "booking.create", "vendor.approve", "car.delete"
  resourceType: string;          // "booking", "car", "vendor"
  resourceId: string;
  
  // Before/After (for updates)
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  
  // Result
  outcome: 'success' | 'failure';
  errorCode?: string;
  
  // Context
  requestId: string;
  userAgent?: string;
  
  createdAt: Timestamp;
}
```

---

## Zod Schema Reference

### Complete `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "cars",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "bookingDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "bookingDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "bookingDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vendor_reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "service_records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "carId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "vendor_services",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "isAvailable", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vendors",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "city", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ai_predictions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "carId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```
