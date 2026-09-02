'use client';
import Link from "next/link";
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/vendor/sidebar";
import { VendorProvider } from "@/components/vendor/vendor-provider";
import { useFirebase } from "@/firebase";
import { AreaChart, Book, Home, Loader2, Package, Wrench } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Logo } from "@/components/logo";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

const mobileNav = [
    { href: "/vendor/dashboard",           icon: Home,      label: "Home",     activeColor: "bg-primary" },
    { href: "/vendor/dashboard/bookings",  icon: Book,      label: "Jobs",     activeColor: "bg-amber-600" },
    { href: "/vendor/dashboard/services",  icon: Wrench,    label: "Services", activeColor: "bg-emerald-600" },
    { href: "/vendor/dashboard/inventory", icon: Package,   label: "Stock",    activeColor: "bg-sky-600" },
    { href: "/vendor/dashboard/analytics", icon: AreaChart, label: "Stats",    activeColor: "bg-teal-600" },
];

function VendorMobileNav() {
    const pathname = usePathname();

    return (
        <nav className="liquid-glass-tab-bar fixed bottom-[max(env(safe-area-inset-bottom),0.5rem)] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[26rem] -translate-x-1/2 rounded-[2rem] p-1.5 md:hidden">
            <div className="flex items-center justify-around gap-0.5">
                {mobileNav.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        item.href === "/vendor/dashboard"
                            ? pathname === item.href
                            : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            data-active={isActive}
                            style={isActive ? { animation: 'tab-pop 300ms cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}
                            className={`liquid-glass-nav-item flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-[3px] rounded-[1.35rem] py-2 px-1 text-[10px] font-semibold tracking-tight ${
                                isActive
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            }`}
                        >
                            <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                            <span className="max-w-full truncate leading-none">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

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
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your workspace…</p>
                </div>
            </div>
        );
    }

    return (
        <VendorProvider>
            <div className="relative min-h-screen overflow-hidden bg-background">
                {/* Multi-layer ambient background */}
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 z-0"
                    style={{
                        background: [
                            'radial-gradient(ellipse 80% 50% at 20% -10%, hsl(221 83% 53% / 0.08), transparent)',
                            'radial-gradient(ellipse 60% 40% at 80% 110%, hsl(160 84% 39% / 0.06), transparent)',
                            'radial-gradient(ellipse 50% 60% at 50% 50%, hsl(38 92% 50% / 0.03), transparent)',
                            'linear-gradient(180deg, hsl(220 33% 98%), hsl(210 40% 96% / 0.6))',
                        ].join(', '),
                    }}
                />
                <SidebarProvider>
                    <div className="relative z-10 flex w-full">
                        <Sidebar>
                            <VendorSidebar />
                        </Sidebar>
                        <SidebarInset>
                            <main className="min-h-screen bg-transparent pb-24 md:pb-0">
                                <header className="liquid-glass-tab-bar sticky top-3 z-30 mx-3 flex items-center justify-between rounded-[1.35rem] px-4 py-3 md:hidden">
                                    <Logo />
                                    <SidebarTrigger className="rounded-xl" />
                                </header>
                                <PullToRefresh>
                                    <div className="page-motion mx-auto max-w-[1600px] p-3 sm:p-6 lg:p-8 xl:p-10">
                                        {children}
                                    </div>
                                </PullToRefresh>
                            </main>
                        </SidebarInset>
                    </div>
                    <VendorMobileNav />
                </SidebarProvider>
            </div>
        </VendorProvider>
    );
}
