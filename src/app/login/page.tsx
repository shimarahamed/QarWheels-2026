import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
            <Logo />
        </div>
        <div className="text-center">
            <h1 className="text-3xl font-bold font-headline">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to access your automotive hub.</p>
        </div>
        
        <div className="space-y-4">
             <Button className="w-full h-12 text-base">Sign in with Face ID</Button>
             <Button variant="secondary" className="w-full h-12 text-base">Sign in with Google</Button>
        </div>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
        </div>

         <Card>
            <CardContent className="pt-6">
                <div className="grid gap-4">
                    <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                    />
                    </div>
                    <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <Link
                        href="#"
                        className="ml-auto inline-block text-sm text-primary hover:underline"
                        >
                        Forgot your password?
                        </Link>
                    </div>
                    <Input id="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full h-12">
                        Sign In
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="#" className="underline text-primary font-medium">
              Sign up
            </Link>
          </div>

      </div>
    </div>
  )
}
