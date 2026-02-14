import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <div className="flex-grow flex flex-col items-center justify-center space-y-6">
        <div className="scale-150 mb-4">
            <Logo isPulsing={true} hideText={true} />
        </div>
        <p className="text-muted-foreground">Automotive Intelligence for Qatar</p>
      </div>
      <div className="w-full max-w-xs pb-8">
        <Button asChild className="w-full h-14 text-lg bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20" size="lg">
          <Link href="/login">
            Get Started
          </Link>
        </Button>
      </div>
    </div>
  );
}
