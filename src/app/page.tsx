import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <div className="flex-grow flex flex-col items-center justify-center space-y-6">
            <Logo />
            <h1 className="text-2xl font-bold font-headline mt-4">Automotive Intelligence for Qatar</h1>
        </div>
        <div className="w-full max-w-xs">
             <Button asChild className="w-full h-14 text-lg">
                <Link href="/login">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </div>
    </div>
  );
}
