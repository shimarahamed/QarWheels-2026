import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="md:flex min-h-screen">
        <Sidebar variant="inset">
          <DashboardSidebar />
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
