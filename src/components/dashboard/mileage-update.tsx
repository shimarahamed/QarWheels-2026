'use client';

import { useState } from 'react';
import { useFirebase, safeUpdateDoc } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Car, WithId } from '@/lib/types';

export function MileageUpdate({ car }: { car: WithId<Car> }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [mileage, setMileage] = useState(car.currentMileage.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!user) return;
    const newMileage = parseInt(mileage);
    if (isNaN(newMileage) || newMileage < car.currentMileage) {
      toast({
        variant: 'destructive',
        title: "Invalid Mileage",
        description: "New mileage must be greater than or equal to current mileage.",
      });
      return;
    }

    setIsUpdating(true);
    const carRef = doc(firestore, 'users', user.uid, 'cars', car.id);

    try {
      await safeUpdateDoc(carRef, {
        currentMileage: newMileage,
        lastMileageUpdateDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Mileage Updated",
        description: "Vehicle status synced with AI engine.",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Update Mileage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="flex-grow space-y-1">
            <Label htmlFor="mileage" className="sr-only">Current Odometer</Label>
            <Input 
              id="mileage" 
              type="number" 
              value={mileage} 
              onChange={(e) => setMileage(e.target.value)}
              className="h-9"
            />
          </div>
          <Button size="sm" onClick={handleUpdate} disabled={isUpdating || parseInt(mileage) === car.currentMileage}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Update</span>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Last updated: {new Date(car.lastMileageUpdateDate).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
