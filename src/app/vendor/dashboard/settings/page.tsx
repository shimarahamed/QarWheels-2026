import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function VendorSettingsPage() {
  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold font-headline">Garage Settings</h1>
            <p className="text-muted-foreground">
            Manage your garage's public profile and settings.
            </p>
        </header>
        <div className="flex items-center justify-center">
            <Card className="max-w-md text-center mt-16">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Settings className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Coming Soon</CardTitle>
                    <CardDescription>
                        This section is currently under construction.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <p className="mb-4">
                    You will soon be able to manage your garage's profile, opening hours, and more.
                </p>
                <Button asChild variant="secondary">
                    <Link href="/vendor/dashboard">
                    Back to Overview
                    </Link>
                </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
