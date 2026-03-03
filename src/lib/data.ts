import type { User } from "./types";

// This file is now primarily for static mock data that hasn't been migrated to Firestore yet.
// mockGarages has been moved to seed-data.ts and is now managed in Firestore.
// mockBookings has been removed as the feature now uses Firestore.

export const mockUser: User = {
  id: "user-1",
  name: "Saleh Al-Mansoori",
  email: "saleh.almansoori@example.com",
  phone: "+974 5555 1234",
  avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=Saleh Al-Mansoori`,
  notificationPreferences: {
    bookingConfirmations: true,
    serviceReminders: true,
    promotionalOffers: false,
  },
};
