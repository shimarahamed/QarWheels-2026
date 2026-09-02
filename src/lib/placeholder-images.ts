/**
 * PLACEHOLDER DATA — for development and seeding only.
 *
 * These images are fallbacks used when a vendor or car document has no
 * imageUrl stored in Firestore. Before going to production, seed real images
 * into Firestore and remove this dependency from UI components.
 *
 * Seed script: `npm run seed:demo`
 * Source JSON: src/config/placeholder-images.json
 */
import data from '../config/placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
