'use client';
import { useEffect, useState } from 'react';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { seedVendors } from '@/lib/seed-data';

export function useSeedVendors() {
  const { firestore } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(true);

  useEffect(() => {
    const seedDatabase = async () => {
      if (!firestore) return;
      
      const vendorsCollection = collection(firestore, 'vendors');
      const snapshot = await getDocs(vendorsCollection);
      
      if (snapshot.empty) {
        console.log('Vendors collection is empty. Seeding database...');
        const seedPromises = seedVendors.map(vendorData => {
            const newVendor = {
                ...vendorData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
           return addDocumentNonBlocking(vendorsCollection, newVendor);
        });
        await Promise.all(seedPromises);
        console.log('Database seeded successfully.');
      } else {
        console.log('Vendors collection already contains data. Skipping seed.');
      }
      setIsSeeding(false);
    };

    seedDatabase().catch(console.error);
  }, [firestore]);

  return isSeeding;
}
