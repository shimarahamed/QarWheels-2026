"use client";

import Link from "next/link";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Wrench,
  Book,
  Users,
  LogOut,
  AreaChart,
  Settings,
  Package,
  Percent,
  Star,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { useFirebase } from "@/firebase";
import { useVendor } from "./vendor-provider";
import { Skeleton } from "../ui/skeleton";

const navItems = [
  { href: "/vendor/dashboard", icon: <LayoutDashboard size={20} />, label: "Overview" },
  { href: "/vendor/dashboard/bookings", icon: <Book size={20} />, label: "Bookings" },
  { href: "/vendor/dashboard/customers", icon: <Users size={20}/>, label: "Customers" },
  { href: "/vendor/dashboard/services", icon: <Wrench size={20}/>, label: "Services" },
  { href: "/vendor/dashboard/inventory", icon: <Package size={20}/>, label: "Inventory" },
  { href: "/vendor/dashboard/staff", icon: <Users size={20}/>, label: "Staff" },
  { href: "/vendor/dashboard/promotions", icon: <Percent size={20}/>, label: "Promotions" },
  { href: "/vendor/dashboard/reviews", icon: <Star size={20}/>, label: "Reviews" },
  { href: "/vendor/dashboard/analytics", icon: <AreaChart size={20}/>, label: "Analytics" },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { auth, user } = useFirebase();
  const { vendor, isLoading } = useVendor();

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-20">
        <Logo />
        {isLoading && (
          <div className="space-y-2 group-data-[collapsible=icon]:hidden">
            <Skeleton className="h-4 w-32" />
          </div>
        )}
        {vendor && (
            <p className="text-sm text-sidebar-foreground/80 pt-1 group-data-[collapsible=icon]:hidden truncate">
                {vendor.name}
            </p>
        )}
        
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
               <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={item.href === '/vendor/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
                  tooltip={{ children: item.label }}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t mt-auto border-sidebar-border space-y-2">
        {user && (
          <>
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="lg" tooltip={{children: "Settings"}} isActive={pathname.startsWith("/vendor/dashboard/settings")}>
                         <Link href="/vendor/dashboard/settings">
                            <Settings size={20}/>
                             <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                         </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <div className="p-2 rounded-md group-data-[collapsible=icon]:p-0">
                <div className="flex items-center gap-3">
                     <Avatar className="h-10 w-10 border-2 border-primary/50">
                        <AvatarImage src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.displayName || 'User'}`} alt={user?.displayName || 'User'} />
                        <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                     <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                        <span className="text-sm font-semibold truncate">{user?.displayName || "Vendor Admin"}</span>
                        <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                </div>
            </div>
            
            <Button onClick={() => auth.signOut()} variant="ghost" className="w-full justify-start gap-3 p-2 h-auto text-muted-foreground hover:text-foreground">
                <LogOut size={20} />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </>
        )}
      </SidebarFooter>
    </>
  );
}

  
