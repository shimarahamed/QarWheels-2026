import { AddCarForm } from "@/components/dashboard/add-car-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="space-y-4">
                <header className="rounded-3xl border bg-card p-6 shadow-sm">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Vehicle onboarding
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Add a New Car</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Build a complete digital passport that powers bookings, service history, AI diagnostics, and resale-ready records.
                    </p>
                </header>

                <div className="grid gap-3">
                    {steps.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-bold">{title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            <Card className="rounded-3xl border-primary/10 shadow-sm">
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
    );
}
