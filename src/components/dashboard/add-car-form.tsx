"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"

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
import { Car as CarIcon, Loader2, Wand2 } from "lucide-react"
import { getVinDetails } from "@/lib/actions"
import type { VinDetailsOutput } from "@/ai/flows/get-vin-details"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
  vin: z.string().trim().length(17, {
    message: "VIN must be exactly 17 characters.",
  }).transform(val => val.toUpperCase()),
})

type CarDetails = VinDetailsOutput & { vin: string };

export function AddCarForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [carDetails, setCarDetails] = useState<CarDetails | null>(null);
  const { toast } = useToast()
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setCarDetails(null);
    try {
      const details = await getVinDetails({ vin: values.vin });
      setCarDetails({ ...details, vin: values.vin });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to fetch VIN details",
        description: "Please check the VIN and try again. The API might not recognize this VIN.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirm() {
    // In a real app, this would call an action to save the car to a database.
    // Since we're using mock data, we'll just show a success message and redirect.
    console.log("Adding car:", carDetails);
    toast({
      title: "Car Added Successfully! (Simulated)",
      description: `${carDetails?.year} ${carDetails?.make} ${carDetails?.model} has been added.`,
    });
    // We are redirecting to the 'My Cars' page. The newly added car won't be in the list
    // because we are using static mock data and cannot update it from the client.
    router.push("/dashboard/my-cars");
  }

  function handleReset() {
    setCarDetails(null);
    form.reset();
  }
  
  if (carDetails) {
    return (
      <Card className="border-dashed bg-card/50">
        <CardHeader>
          <CardTitle>Confirm Vehicle</CardTitle>
          <CardDescription>Our AI has identified this vehicle. Please confirm the details below to add it to your garage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Make</p>
              <p className="font-semibold">{carDetails.make}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Model</p>
              <p className="font-semibold">{carDetails.model}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Year</p>
              <p className="font-semibold">{carDetails.year}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">VIN</p>
            <p className="font-semibold font-mono text-sm">{carDetails.vin}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={handleConfirm} className="w-full">
              <CarIcon className="mr-2 h-4 w-4" />
              Confirm & Add to My Cars
            </Button>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Fetching Details..." : "Fetch Car Details with AI"}
        </Button>
      </form>
    </Form>
  )
}
