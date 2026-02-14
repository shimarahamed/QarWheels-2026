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
  Car,
  Wrench,
  Book,
  History,
  LogOut,
  Bell,
  Search,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { Input } from "../ui/input";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/my-cars", icon: <Car />, label: "My Cars" },
  { href: "/dashboard/garages", icon: <Wrench />, label: "Garages" },
  { href: "/dashboard/bookings", icon: <Book />, label: "Bookings" },
  { href: "/dashboard/service-history", icon: <History />, label: "Service History" },
];

export function DashboardSidebar() {
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
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
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
      <SidebarFooter className="p-2 border-t mt-auto">
        <div className="flex items-center gap-2">
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">User</span>
                <span className="text-xs text-muted-foreground">user@example.com</span>
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
