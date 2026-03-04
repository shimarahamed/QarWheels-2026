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
  User as UserIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { Input } from "../ui/input";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard />, label: "Dashboard" },
  { href: "/dashboard/my-cars", icon: <Car />, label: "My Cars" },
  { href: "/dashboard/bookings", icon: <Book />, label: "Bookings" },
  { href: "/dashboard/service-history", icon: <History />, label: "Service History" },
  { href: "/dashboard/profile", icon: <UserIcon />, label: "Profile" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { auth, user, firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(
    () => (user && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);


  const handleLogout = () => {
    auth.signOut();
  };

  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.isAnonymous ? "Anonymous User" : user?.email || "User";
  const displayEmail = userProfile?.email || user?.email || 'Guest';

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
        {user && (
          <>
            <Link href="/dashboard/profile" className="p-2 rounded-md hover:bg-accent -mx-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`} alt={displayName} />
                        <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold truncate">{displayName}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.isAnonymous ? 'Guest Account' : displayEmail}</span>
                    </div>
                </div>
            </Link>
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-2">
              <LogOut />
              <span>Logout</span>
            </Button>
          </>
        )}
      </SidebarFooter>
    </>
  );
}
