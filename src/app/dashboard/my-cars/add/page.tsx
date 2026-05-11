import { AddCarForm } from "@/components/dashboard/add-car-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Add New Car | QarWheels',
  description: 'Create a digital passport for your vehicle via VIN.',
};

export default function AddCarPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Add a New Car</h1>
                <p className="text-muted-foreground">
                    Connect your vehicle to Qatar's most intelligent automotive network.
                </p>
            </header>
            <Card className="shadow-lg border-primary/10">
                <CardHeader>
                    <CardTitle>Initialize Digital Passport</CardTitle>
                    <CardDescription>
                        Enter your 17-character VIN. We'll automatically identify the make, model, and year to get you started instantly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddCarForm />
                </CardContent>
            </Card>
        </div>
    );
}
