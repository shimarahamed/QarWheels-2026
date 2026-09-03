"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { collection, serverTimestamp } from 'firebase/firestore';

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Car as CarIcon, Loader2, Save, Wand2 } from "lucide-react"
import type { VinDetailsOutput } from "@/ai/flows/get-vin-details"
import { useFirebase, safeAddDoc } from "@/firebase"
import type { Car } from "@/lib/types"
import { VinSchema } from "@/lib/schemas"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  vin: VinSchema,
  make: z.string().min(1, "Make is required").max(50),
  model: z.string().min(1, "Model is required").max(50),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
  currentMileage: z.coerce.number().int().min(0).max(1_000_000),
  licensePlate: z.string().max(20).optional(),
  color: z.string().max(30).optional(),
  engineType: z.string().max(30).optional(),
  purchaseDate: z.string().optional(),
})

const engineTypes = ["Gasoline", "Hybrid", "Electric", "Diesel", "Plug-in Hybrid"];

export function AddCarForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "manual">("idle");
  const { toast } = useToast()
  const router = useRouter();
  const { firestore, user, isUserLoading } = useFirebase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      currentMileage: 0,
      licensePlate: "",
      color: "",
      engineType: "Gasoline",
      purchaseDate: new Date().toISOString().split("T")[0],
    },
  })

  async function lookupVin() {
    const vinIsValid = await form.trigger("vin");
    if (!vinIsValid) return;

    const vin = form.getValues("vin");
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'VIN lookup failed');
      }

      const body = await response.json() as { data: VinDetailsOutput };
      const details = body.data;
      form.setValue("make", details.make, { shouldValidate: true, shouldDirty: true });
      form.setValue("model", details.model, { shouldValidate: true, shouldDirty: true });
      form.setValue("year", details.year, { shouldValidate: true, shouldDirty: true });
      setLookupStatus("found");
      toast({
        title: "Vehicle Identified",
        description: `${details.year} ${details.make} ${details.model} is ready to add.`,
      });
    } catch (error) {
      console.error(error);
      setLookupStatus("manual");
      toast({
        title: "VIN lookup unavailable",
        description: "You can still complete the vehicle profile manually below.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot add car. User not authenticated or system not ready.",
        });
        return;
    }
    
    setIsSaving(true);

    const carsCollectionRef = collection(firestore, 'users', user.uid, 'cars');
    const newCarData: Omit<Car, 'id'> = {
      userId: user.uid,
      vin: values.vin,
      make: values.make.trim(),
      model: values.model.trim(),
      year: values.year,
      currentMileage: values.currentMileage,
      lastMileageUpdateDate: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      licensePlate: values.licensePlate?.trim() || '',
      color: values.color?.trim() || '',
      engineType: values.engineType || 'Gasoline',
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : new Date().toISOString(),
      imageUrl: '',
    };
    
    try {
        await safeAddDoc(carsCollectionRef, newCarData);
        toast({
        title: "Car Added!",
        description: `${values.year} ${values.make} ${values.model} has been added to your garage.`,
        });
        router.push("/dashboard/my-cars");
    } catch (e) {
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="vin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Identification Number (VIN)</FormLabel>
              <FormControl>
                <Input placeholder="Enter 17-character VIN" {...field} className="uppercase font-mono" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" variant="outline" onClick={lookupVin} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Fetching Details..." : "Fetch Details with AI"}
        </Button>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="mb-4 flex items-start gap-3">
            <span className="icon-pill h-9 w-9 bg-primary/10 text-primary">
              <CarIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-bold">Vehicle profile</h3>
              <p className="text-sm text-muted-foreground">
                {lookupStatus === "found"
                  ? "AI filled the core identity. Add the ownership details before saving."
                  : lookupStatus === "manual"
                    ? "Complete these details manually and save the car."
                    : "Fetch VIN details or enter the vehicle identity manually."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="make" render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl><Input placeholder="Toyota" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl><Input placeholder="Land Cruiser" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="currentMileage" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Mileage (km)</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="licensePlate" render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl><Input placeholder="123456" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl><Input placeholder="Pearl White" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="engineType" render={({ field }) => (
              <FormItem>
                <FormLabel>Engine Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select engine" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {engineTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="purchaseDate" render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Purchase Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isUserLoading || !user || isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isUserLoading ? "Authenticating..." : isSaving ? "Saving Vehicle..." : "Save Vehicle Passport"}
        </Button>
      </form>
    </Form>
  )
}
