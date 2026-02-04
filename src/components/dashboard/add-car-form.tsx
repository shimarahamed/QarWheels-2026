"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Car } from "lucide-react"

const formSchema = z.object({
  vin: z.string().length(17, {
    message: "VIN must be exactly 17 characters.",
  }),
})

export function AddCarForm() {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Placeholder for API call to add car
    console.log(values)
    toast({
      title: "Car Added (Simulated)",
      description: `The car with VIN ${values.vin} has been added to your garage.`,
    })
    form.reset();
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
                <Input placeholder="Enter 17-character VIN" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">
            <Car className="mr-2 h-4 w-4" />
            Add Car
        </Button>
      </form>
    </Form>
  )
}
