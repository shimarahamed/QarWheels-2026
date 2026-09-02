import { CarList } from "@/components/dashboard/car-list";
import { Button } from "@/components/ui/button";
import { CalendarClock, PlusCircle, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";

export default function MyCarsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 sm:px-4 md:px-8">
      <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Personal garage
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                My Cars
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Track every vehicle, odometer update, service record, and booking from one packed fleet view.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/bookings">
                <CalendarClock className="mr-2 h-4 w-4" />
                Bookings
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/service-history">
                <Wrench className="mr-2 h-4 w-4" />
                History
              </Link>
            </Button>
            <Button asChild className="justify-start">
              <Link href="/dashboard/my-cars/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Car
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="w-full">
        <CarList variant="detailed" />
      </section>
    </div>
  );
}
