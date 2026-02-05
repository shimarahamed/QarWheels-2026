import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
  } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { PlusCircle, Percent, Calendar } from "lucide-react";
  import { mockPromotions, VendorPromotion } from "@/lib/vendor-data";
  import { Badge } from "@/components/ui/badge";
  import { format } from "date-fns";
  
  function getStatusVariant(status: VendorPromotion['status']) {
    switch (status) {
        case 'Active': return 'default';
        case 'Scheduled': return 'outline';
        case 'Expired': return 'secondary';
        default: return 'default';
    }
}
  
  export default function VendorPromotionsPage() {
    return (
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Marketing & Promotions</h1>
            <p className="text-muted-foreground">
              Create and manage discounts and special offers.
            </p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Promotion
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockPromotions.map((promo) => (
                <Card key={promo.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>{promo.title}</CardTitle>
                            <Badge variant={getStatusVariant(promo.status)}>{promo.status}</Badge>
                        </div>
                        <CardDescription>{promo.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <Percent className="h-5 w-5 text-primary"/>
                            <span className="font-mono text-sm">Code: {promo.code}</span>
                            <span className="ml-auto font-semibold">{promo.discount} OFF</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4"/>
                            <span>{format(new Date(promo.startDate), 'MMM d, yyyy')} - {format(new Date(promo.endDate), 'MMM d, yyyy')}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button variant="outline" className="w-full">Edit</Button>
                        <Button variant="destructive" className="w-full">Delete</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }
  
