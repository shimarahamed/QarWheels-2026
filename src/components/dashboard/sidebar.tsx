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
  Car,
  Wrench,
  Book,
  History,
  LogOut,
  Search,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { Input } from "../ui/input";
import { mockUser } from "@/lib/data";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/my-cars", icon: <Car />, label: "My Cars" },
  { href: "/dashboard/garages", icon: <Wrench />, label: "Garages" },
  { href: "/dashboard/bookings", icon: <Book />, label: "Bookings" },
  { href: "/dashboard/service-history", icon: <History />, label: "Service History" },
  { href: "/dashboard/profile", icon: <User />, label: "Profile" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="border-b">
        <Logo />
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
      <SidebarFooter className="p-2 border-t mt-auto space-y-2">
        <Link href="/dashboard/profile" className="p-2 rounded-md hover:bg-accent -mx-2">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${mockUser.name}`} alt={mockUser.name} />
                    <AvatarFallback>{mockUser.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">{mockUser.name}</span>
                    <span className="text-xs text-muted-foreground">{mockUser.email}</span>
                </div>
            </div>
        </Link>
        <Button asChild variant="ghost" className="w-full justify-start gap-2">
          <Link href="/">
            <LogOut />
            <span>Logout</span>
          </Link>
        </Button>
      </SidebarFooter>
    </>
  );
}
