import { CarList } from "@/components/dashboard/car-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarClock, PlusCircle, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";

export default function MyCarsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <PageHeader
        eyebrow="Personal garage"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title="My Cars"
        description="Track every vehicle, odometer update, service record, and booking from one packed fleet view."
        action={
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
        }
      />

      <section className="w-full">
        <CarList variant="detailed" />
      </section>
    </div>
  );
}
