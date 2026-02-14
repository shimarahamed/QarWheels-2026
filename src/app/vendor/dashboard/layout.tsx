import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/vendor/sidebar";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="md:flex min-h-screen">
        <Sidebar variant="inset">
          <VendorSidebar />
        </Sidebar>
        <main className="flex-1">
          <SidebarInset>
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </SidebarInset>
        </main>
      </div>
    </SidebarProvider>
  );
}
