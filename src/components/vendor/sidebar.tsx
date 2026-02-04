"use client";

import Link from "next/link";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarContent,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Wrench,
  Book,
  Users,
  LogOut,
  AreaChart,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";

const navItems = [
  { href: "/vendor/dashboard", icon: <LayoutDashboard />, label: "Overview" },
  { href: "/vendor/dashboard/bookings", icon: <Book />, label: "Bookings" },
  { href: "/vendor/dashboard/services", icon: <Wrench />, label: "Services" },
  { href: "/vendor/dashboard/customers", icon: <Users />, label: "Customers" },
  { href: "/vendor/dashboard/analytics", icon: <AreaChart />, label: "Analytics" },
];

export function VendorSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between w-full">
            <Logo />
            <div className="md:hidden">
                <SidebarTrigger />
            </div>
        </div>
        <p className="text-sm text-sidebar-foreground/80 pt-1 group-data-[collapsible=icon]:hidden">
            Precision Auto Qatar
        </p>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={item.href === '/vendor/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
                  tooltip={{ children: item.label }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t mt-auto">
        <div className="flex items-center gap-2">
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>PA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">Vendor Admin</span>
                <span className="text-xs text-muted-foreground">admin@precisionauto.qa</span>
            </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut />
            <span>Logout</span>
        </Button>
      </SidebarFooter>
    </>
  );
}
