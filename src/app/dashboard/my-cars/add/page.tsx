import { AddCarForm } from "@/components/dashboard/add-car-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Metadata } from 'next';
import { BadgeCheck, Car, Gauge, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: 'Add New Car | QarWheel',
  description: 'Create a digital passport for your vehicle via VIN.',
};

export default function AddCarPage() {
    const steps = [
        { icon: Car, title: "Identify", text: "Use VIN lookup or enter make, model, and year manually." },
        { icon: Gauge, title: "Baseline", text: "Capture mileage, plate, engine type, color, and purchase date." },
        { icon: BadgeCheck, title: "Passport", text: "Create a vehicle record ready for bookings, history, and AI checks." },
    ];

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
            <PageHeader
                eyebrow="Vehicle onboarding"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                title="Add a New Car"
                description="Build a complete digital passport that powers bookings, service history, AI diagnostics, and resale-ready records."
            />

            <div className="grid gap-5 sm:gap-6 lg:grid-cols-[340px_1fr]">
                <aside className="grid content-start gap-3">
                    {steps.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="icon-pill h-9 w-9 bg-primary/10 text-primary">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                    <p className="font-bold">{title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </aside>

                <Card className="rounded-2xl border bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Initialize Digital Passport</CardTitle>
                        <CardDescription>
                            Start with a VIN lookup, then confirm or complete the vehicle details before saving.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddCarForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
