
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Car, CheckCircle, Sparkles, Wrench, Search, Calendar, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const features = [
    {
        icon: <Car className="h-8 w-8 text-primary" />,
        title: "Digital Car Passport",
        description: "Your vehicle's complete history, digitized. Add cars via VIN and maintain a permanent, transferable record of every service, repair, and upgrade.",
        image: PlaceHolderImages.find(p => p.id === 'feature-vin'),
    },
    {
        icon: <Sparkles className="h-8 w-8 text-primary" />,
        title: "AI Maintenance Predictions",
        description: "Our AI analyzes your mileage, service history, and Qatar's climate to forecast future needs, preventing breakdowns before they happen.",
        image: PlaceHolderImages.find(p => p.id === 'feature-ai'),
    },
    {
        icon: <Wrench className="h-8 w-8 text-primary" />,
        title: "Trusted Garage Network",
        description: "Search our curated map of approved garages. View services, transparent pricing, and real customer reviews to book appointments with confidence.",
        image: PlaceHolderImages.find(p => p.id === 'feature-search'),
    },
];

const howItWorksSteps = [
  {
    icon: <Search className="h-10 w-10 text-primary"/>,
    title: "1. Add Your Vehicle",
    description: "Use your VIN to instantly create a digital passport for your car. We'll pre-fill the details for you.",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-primary"/>,
    title: "2. Get Smart Insights",
    description: "Our AI analyzes your car's data to provide predictive maintenance alerts and summaries of your service history.",
  },
  {
    icon: <Calendar className="h-10 w-10 text-primary"/>,
    title: "3. Book with Confidence",
    description: "Browse our network of trusted garages, compare services, and book your next appointment in just a few clicks.",
  }
];

const testimonials = [
    {
        quote: "QarWheels is a game-changer. The AI predicted I needed new brake pads a month before my mechanic even mentioned it. Saved me from a potentially dangerous situation.",
        name: "Fahad A.",
        location: "Doha",
        avatar: "https://api.dicebear.com/8.x/men/svg?seed=Fahad"
    },
    {
        quote: "Finally, all my service records in one place! When I sold my car, being able to show the buyer a complete digital history helped me get a better price.",
        name: "Aisha M.",
        location: "Al Wakrah",
        avatar: "https://api.dicebear.com/8.x/women/svg?seed=Aisha"
    },
    {
        quote: "As an expat, finding a trustworthy garage was a nightmare. The curated list on QarWheels is fantastic. I booked a service and the experience was seamless.",
        name: "Chris G.",
        location: "The Pearl",
        avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Chris"
    }
]

export default function LandingPage() {
    const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
    const ctaImage = PlaceHolderImages.find(p => p.id === 'cta-background');

    return (
        <div className="flex flex-col min-h-dvh bg-background">
            <header className="container mx-auto px-4 h-20 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
                <Logo />
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
                <section className="relative min-h-[60vh] flex items-center justify-center text-center text-white py-20">
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
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold font-headline leading-tight">
                            Intelligent Car Care for Qatar
                        </h1>
                        <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-white/90">
                           Finally, a modern solution for vehicle management. Get AI-powered maintenance predictions, a digital service passport, and access to a network of trusted local garages.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <Button size="lg" asChild>
                                <Link href="/signup">
                                    Get Started for Free <ArrowRight className="ml-2 h-5 w-5"/>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-16 md:py-24 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Vehicle Management, Simplified</h2>
                            <p className="mt-4 text-muted-foreground md:text-lg">
                                Take the guesswork out of car ownership in just three simple steps.
                            </p>
                        </div>
                        <div className="mt-12 grid md:grid-cols-3 gap-8 md:gap-12">
                            {howItWorksSteps.map((step) => (
                                <div key={step.title} className="text-center">
                                     <div className="flex justify-center mb-6">
                                        <div className="p-4 bg-primary/10 rounded-full">
                                           {step.icon}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold font-headline">{step.title}</h3>
                                    <p className="mt-2 text-muted-foreground">{step.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-16 md:py-24 bg-muted/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">The Future of Car Care is Here</h2>
                            <p className="mt-4 text-muted-foreground md:text-lg">
                                QarWheels combines modern technology with local expertise to provide a seamless vehicle management experience.
                            </p>
                        </div>
                         <div className="mt-16 space-y-20">
                            {features.map((feature, i) => (
                                <div key={i} className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center`}>
                                    <div className={`relative aspect-video rounded-lg overflow-hidden shadow-lg ${i % 2 === 1 ? 'md:order-last' : ''}`}>
                                        {feature.image && (
                                            <Image src={feature.image.imageUrl} alt={feature.title} fill className="object-cover" data-ai-hint={feature.image.imageHint}/>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-3 p-3 bg-primary/10 rounded-lg w-min">
                                            {feature.icon}
                                        </div>
                                        <h3 className="text-2xl font-bold font-headline">{feature.title}</h3>
                                        <p className="text-muted-foreground text-base">{feature.description}</p>
                                        <ul className="space-y-2 pt-2">
                                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/> Maintain full service history</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/> Increase resale value</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/> Never lose a receipt again</li>
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                 {/* Testimonials Section */}
                <section id="testimonials" className="py-16 md:py-24 bg-background">
                     <div className="container mx-auto px-4">
                         <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Trusted by Drivers Across Qatar</h2>
                            <p className="mt-4 text-muted-foreground md:text-lg">
                                Don't just take our word for it. Here's what our users are saying about QarWheels.
                            </p>
                        </div>
                         <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {testimonials.map((testimonial) => (
                               <Card key={testimonial.name} className="flex flex-col">
                                   <CardContent className="pt-6 flex-grow">
                                        <p className="italic text-muted-foreground">&quot;{testimonial.quote}&quot;</p>
                                   </CardContent>
                                    <CardHeader className="flex-row gap-4 items-center">
                                        <Avatar>
                                            <AvatarImage src={testimonial.avatar} />
                                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                                        </div>
                                   </CardHeader>
                               </Card>
                            ))}
                        </div>
                     </div>
                </section>

                {/* CTA Section */}
                <section className="relative py-24 text-center text-white">
                     {ctaImage && (
                         <Image 
                            src={ctaImage.imageUrl}
                            alt={ctaImage.description}
                            fill
                            className="object-cover"
                            data-ai-hint={ctaImage.imageHint}
                        />
                    )}
                    <div className="absolute inset-0 bg-primary/80" />
                     <div className="relative container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to Take Control of Your Car Care?</h2>
                        <p className="mt-4 text-lg max-w-2xl mx-auto text-white/90">
                           Join hundreds of drivers in Qatar who are managing their vehicles the smart way. Sign up for free today.
                        </p>
                        <div className="mt-8">
                            <Button size="lg" variant="secondary" asChild>
                                <Link href="/signup">
                                    Create Your Free Account <ArrowRight className="ml-2 h-5 w-5"/>
                                </Link>
                            </Button>
                        </div>
                     </div>
                </section>

            </main>
             <footer className="py-8 bg-muted border-t">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                        <Logo />
                         <p className="text-sm text-muted-foreground mt-2">&copy; {new Date().getFullYear()} QarWheels. All rights reserved.</p>
                    </div>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Link href="#" className="hover:text-primary">About</Link>
                        <Link href="#" className="hover:text-primary">Contact</Link>
                        <Link href="#" className="hover:text-primary">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
