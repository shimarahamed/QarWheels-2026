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
  { href: "/vendor/dashboard", icon: <LayoutDashboard />, label: "Overview" },
  { href: "/vendor/dashboard/bookings", icon: <Book />, label: "Bookings" },
  { href: "/vendor/dashboard/customers", icon: <Users />, label: "Customers" },
  { href: "/vendor/dashboard/services", icon: <Wrench />, label: "Services" },
  { href: "/vendor/dashboard/inventory", icon: <Package />, label: "Inventory" },
  { href: "/vendor/dashboard/staff", icon: <Users />, label: "Staff" },
  { href: "/vendor/dashboard/promotions", icon: <Percent />, label: "Promotions" },
  { href: "/vendor/dashboard/reviews", icon: <Star />, label: "Reviews" },
  { href: "/vendor/dashboard/analytics", icon: <AreaChart />, label: "Analytics" },
  { href: "/vendor/dashboard/settings", icon: <Settings />, label: "Settings" },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { auth, user } = useFirebase();
  const { vendor, isLoading } = useVendor();

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
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
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
               <SidebarMenuButton
                  asChild
                  isActive={item.href === '/vendor/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
                  tooltip={{ children: item.label }}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t mt-auto border-sidebar-border space-y-2">
        <div className="p-2 rounded-md hover:bg-sidebar-accent">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${user?.displayName || 'User'}`} alt={user?.displayName || 'User'} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
                    <span className="text-sm font-semibold truncate">{user?.displayName || "Vendor Admin"}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
            </div>
        </div>
        <Button onClick={() => auth.signOut()} variant="ghost" className="w-full justify-start gap-2">
            <LogOut />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </>
  );
}

  