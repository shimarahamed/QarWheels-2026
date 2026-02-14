import { SidebarProvider, Sidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/vendor/sidebar";
import { Logo } from "@/components/logo";
import Link from 'next/link';

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
       <div className="md:flex min-h-screen bg-background">
        <Sidebar>
          <VendorSidebar />
        </Sidebar>
        <div className="flex-1">
            <header className="flex items-center justify-between h-16 px-4 border-b md:hidden sticky top-0 bg-background z-30">
                <Link href="/vendor/dashboard">
                    <Logo />
                </Link>
                <SidebarTrigger />
            </header>
            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
