'use client';
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/vendor/sidebar";
import { VendorProvider } from "@/components/vendor/vendor-provider";
import { useFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useFirebase();
    const router = useRouter();
    
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/vendor/login');
        }
    }, [isUserLoading, user, router]);

    if (isUserLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <VendorProvider>
            <SidebarProvider>
                <Sidebar>
                    <VendorSidebar />
                </Sidebar>
                <SidebarInset>
                    <main className="min-h-screen">
                        <header className="p-4 border-b md:hidden">
                            <SidebarTrigger />
                        </header>
                        <div className="p-4 sm:p-6 lg:p-8">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </VendorProvider>
    );
}