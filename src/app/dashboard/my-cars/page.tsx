import { CarList } from "@/components/dashboard/car-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function MyCarsPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">My Cars</h1>
          <p className="text-muted-foreground">
            Manage your vehicles and view their details.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-cars/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Car
          </Link>
        </Button>
      </header>
      
      <section>
        <CarList />
      </section>
    </div>
  );
}
