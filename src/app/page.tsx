// This file is obsolete. The new application root is in src/app/page.tsx.
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Car, CheckCircle, Sparkles, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";

const features = [
    {
        icon: <Car className="h-8 w-8 text-primary" />,
        title: "Digital Car Passport",
        description: "Add your vehicles via VIN and maintain a complete digital history of all service records.",
    },
    {
        icon: <Sparkles className="h-8 w-8 text-primary" />,
        title: "AI Maintenance Predictions",
        description: "Our AI analyzes your car's mileage and history to forecast future maintenance needs.",
    },
    {
        icon: <Wrench className="h-8 w-8 text-primary" />,
        title: "Find & Book Garages",
        description: "Search our map of approved garages, view services, and book appointments directly.",
    },
];

export default function LandingPage() {
    const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

    return (
        <div className="flex flex-col min-h-screen">
            <header className="container mx-auto px-4 h-20 flex items-center justify-between">
                <Logo hideText={true} />
                <div className="flex items-center gap-2">
                     <Button variant="ghost" asChild>
                        <Link href="/vendor/login">Vendor Portal</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/login">Customer Login</Link>
                    </Button>
                </div>
            </header>
            <main className="flex-grow">
                 {/* Hero Section */}
                <section className="relative h-[60vh] flex items-center justify-center text-center text-white">
                    {heroImage && (
                         <Image 
                            src={heroImage.imageUrl}
                            alt={heroImage.description}
                            fill
                            className="object-cover"
                            priority
                            data-ai-hint={heroImage.imageHint}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline">
                            Intelligent Car Management
                        </h1>
                        <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-white/90">
                            Predictive maintenance, digital service records, and trusted garages—all redesigned for Qatar.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/signup">
                                    Get Started <ArrowRight className="ml-2 h-5 w-5"/>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                         <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">The Future of Car Care is Here</h2>
                            <p className="mt-4 text-muted-foreground md:text-lg">
                                QarWheels combines modern technology with local expertise to provide a seamless vehicle management experience.
                            </p>
                        </div>
                        <div className="mt-12 grid md:grid-cols-3 gap-8">
                            {features.map((feature, i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <div className="p-3 bg-primary/10 rounded-lg w-min mb-4">
                                            {feature.icon}
                                        </div>
                                        <CardTitle>{feature.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
             <footer className="py-8 bg-muted">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                    <p>&copy; {new Date().getFullYear()} QarWheels. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
