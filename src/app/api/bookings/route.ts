import { createHash } from 'node:crypto';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, Errors } from '@/lib/api-response';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getVerifiedUserFromRequest } from '@/lib/firebase-auth';
import { isRateLimited, API_LIMITS, getRateLimitKey } from '@/lib/rate-limit';
import { trackApiError, trackRateLimit } from '@/lib/observability';
import type { Branch, Business, Car, Service, UserProfile } from '@/lib/types';

const CreateBookingSchema = z.object({
  branchId: z.string().min(1).max(128),
  carId: z.string().min(1).max(128),
  serviceId: z.string().min(1).max(128),
  bookingDate: z.string().datetime(),
  timeSlot: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid(),
}).strict();

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function unavailable(message: string) {
  return { error: message, status: 400 as const };
}

export async function POST(request: NextRequest) {
  const user = await getVerifiedUserFromRequest(request);
  if (!user) return Errors.unauthorized();

  const parsed = CreateBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Errors.badRequest('Invalid booking request', parsed.error.flatten().fieldErrors);
  const input = parsed.data;

  try {
    const rateLimitKey = await getRateLimitKey('bookings:create', user.uid);
    if (await isRateLimited(rateLimitKey, API_LIMITS.bookingCreate)) {
      trackRateLimit('bookings:create', rateLimitKey);
      return Errors.rateLimited();
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection('bookings').doc(`bkg_${digest(`${user.uid}:${input.idempotencyKey}`)}`);
    const fingerprint = digest(JSON.stringify(input));
    const result = await db.runTransaction(async (tx) => {
      const prior = await tx.get(bookingRef);
      if (prior.exists) {
        return prior.get('userId') === user.uid && prior.get('requestFingerprint') === fingerprint
          ? { id: bookingRef.id, existing: true as const }
          : { error: 'This request key was already used for different booking details', status: 409 as const };
      }

      const preferredAt = new Date(input.bookingDate).getTime();
      if (preferredAt < Date.now() + 60 * 60 * 1000 || preferredAt > Date.now() + 90 * 86_400_000) {
        return unavailable('Choose a preferred time between one hour and 90 days from now');
      }

      const carRef = db.collection('users').doc(user.uid).collection('cars').doc(input.carId);
      const branchRef = db.collection('branches').doc(input.branchId);
      const serviceRef = db.collection('branch_services').doc(input.serviceId);
      const profileRef = db.collection('users').doc(user.uid);
      const [carSnap, branchSnap, serviceSnap, profileSnap] = await Promise.all([
        tx.get(carRef), tx.get(branchRef), tx.get(serviceRef), tx.get(profileRef),
      ]);
      if (!carSnap.exists) return unavailable('Choose a vehicle saved to your account');
      if (!branchSnap.exists) return unavailable('The garage is no longer available');
      if (!serviceSnap.exists) return unavailable('The service is no longer available');

      const car = carSnap.data() as Car;
      const branch = branchSnap.data() as Branch;
      const service = serviceSnap.data() as Service;
      if (car.userId && car.userId !== user.uid) return unavailable('Choose a vehicle saved to your account');
      if (!branch.isListed || branch.status !== 'Approved' || branch.vacationMode) {
        return unavailable('The garage is not taking requests');
      }
      if (!service.active || service.branchId !== input.branchId || service.businessId !== branch.businessId) {
        return unavailable('Choose a service listed by this garage');
      }
      const businessSnap = await tx.get(db.collection('businesses').doc(branch.businessId));
      const business = businessSnap.exists ? businessSnap.data() as Business : null;
      if (!business || business.status !== 'Active' || business.kyc?.status !== 'Verified') {
        return unavailable('The garage is not taking requests');
      }

      const profile = profileSnap.exists ? profileSnap.data() as UserProfile : null;
      const customerName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Customer';
      const now = new Date().toISOString();
      tx.create(bookingRef, {
        userId: user.uid,
        customerName,
        customerEmail: user.email ?? profile?.email ?? '',
        businessId: branch.businessId,
        branchId: input.branchId,
        branchName: branch.name,
        carId: input.carId,
        carDescription: `${car.year} ${car.make} ${car.model}`,
        serviceId: input.serviceId,
        serviceName: service.name,
        bookingDate: input.bookingDate,
        ...(input.timeSlot ? { timeSlot: input.timeSlot } : {}),
        notes: input.notes ?? '',
        status: 'Pending',
        requiresQuote: true,
        statusHistory: [{ status: 'Pending', at: now, byUid: user.uid, byRole: 'customer' }],
        requestFingerprint: fingerprint,
        createdAt: now,
        updatedAt: now,
      });
      return { id: bookingRef.id, existing: false as const };
    });

    if (typeof result.error === 'string') return err(result.error, result.status);
    return ok({ id: result.id }, result.existing ? 200 : 201);
  } catch (error) {
    trackApiError('/api/bookings POST', error);
    return Errors.serverError();
  }
}
