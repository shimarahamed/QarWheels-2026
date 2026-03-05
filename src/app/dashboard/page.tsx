import { CarList } from "@/components/dashboard/car-list";
import { UserStats } from "@/components/dashboard/user-stats";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { AICallsToAction } from "@/components/dashboard/ai-cta";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a quick overview of your automotive world.
        </p>
      </header>
      
      <UserStats />

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 space-y-8">
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold font-headline">My Cars</h2>
                    <Button asChild>
                        <Link href="/dashboard/my-cars/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Car
                        </Link>
                    </Button>
                </div>
                <CarList />
            </section>
        </div>
        <div className="lg:col-span-1 space-y-8">
            <UpcomingBookings />
            <AICallsToAction />
        </div>
      </div>
    </div>
  );
}
