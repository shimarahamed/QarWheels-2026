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
  Book,
  History,
  LogOut,
  User as UserIcon,
  Building,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "../logo";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

const navItems = [
  { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { href: "/dashboard/my-cars", icon: <Car size={20}/>, label: "My Cars" },
  { href: "/dashboard/garages", icon: <Building size={20} />, label: "Find Garages" },
  { href: "/dashboard/bookings", icon: <Book size={20} />, label: "My Bookings" },
  { href: "/dashboard/service-history", icon: <History size={20} />, label: "Service History" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { auth, user, firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(
    () => (user && !user.isAnonymous ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);


  const handleLogout = () => {
    auth.signOut();
  };

  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.isAnonymous ? "Anonymous User" : user?.email || "User";
  const displayEmail = userProfile?.email || user?.email || 'Guest Account';

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border h-20">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
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
                    <SidebarMenuButton asChild size="lg" tooltip={{children: "Profile"}} isActive={pathname.startsWith("/dashboard/profile")}>
                         <Link href="/dashboard/profile">
                            <UserIcon size={20}/>
                             <span className="group-data-[collapsible=icon]:hidden">My Profile</span>
                         </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <div className="p-2 rounded-md group-data-[collapsible=icon]:p-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/50">
                        <AvatarImage src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`} alt={displayName} />
                        <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                        {isLoading ? <Skeleton className="h-4 w-24 mb-1" /> : <span className="text-sm font-semibold truncate">{displayName}</span>}
                        {isLoading ? <Skeleton className="h-3 w-32" /> : <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>}
                    </div>
                </div>
            </div>

            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-3 p-2 h-auto text-muted-foreground hover:text-foreground">
              <LogOut size={20} />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </>
        )}
      </SidebarFooter>
    </>
  );
}
