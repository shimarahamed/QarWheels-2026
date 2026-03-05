import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AICallsToAction() {
    return (
        <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles />
                    AI-Powered Insights
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                    Analyze your service history and predict future maintenance needs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button variant="secondary" asChild className="w-full justify-between">
                    <Link href="/dashboard/service-history">
                        <span>Analyze Service History</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
