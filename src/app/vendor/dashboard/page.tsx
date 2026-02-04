import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function VendorDashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Vendor Dashboard</CardTitle>
          <CardDescription>
            This section is currently under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            We're working hard to bring you a powerful dashboard to manage your garage. Stay tuned!
          </p>
          <Button asChild>
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
