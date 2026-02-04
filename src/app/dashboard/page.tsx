import { MaintenancePredictions } from "@/components/dashboard/maintenance-predictions";
import { CarList } from "@/components/dashboard/car-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's a quick overview of your automotive world.
          </p>
        </div>
      </header>
      
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold font-headline">My Cars</h2>
          <Button asChild variant="outline">
            <Link href="/dashboard/my-cars/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Car
            </Link>
          </Button>
        </div>
        <CarList />
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">AI Maintenance Predictions</h2>
        <MaintenancePredictions />
      </section>
    </div>
  );
}
