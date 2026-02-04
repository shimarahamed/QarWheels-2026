import { AddCarForm } from "@/components/dashboard/add-car-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddCarPage() {
    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Add a New Car</h1>
                <p className="text-muted-foreground">
                    Enter your Vehicle Identification Number (VIN) to get started.
                </p>
            </header>
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Enter VIN</CardTitle>
                    <CardDescription>
                        We'll use the VIN to automatically fetch your car's details. You can usually find it on your dashboard or driver's side doorjamb.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddCarForm />
                </CardContent>
            </Card>
        </div>
    );
}
