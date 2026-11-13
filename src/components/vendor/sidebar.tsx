'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useFirebase } from '@/firebase';
import { Logo } from '../logo';
import { useVendor } from './vendor-provider';
import { BranchSwitcher } from './branch-switcher';
import type { VendorSection } from '@/lib/auth/permissions';

const groups: { title: string; items: { path: string; icon: string; label: string; section: VendorSection }[] }[] = [
  { title: 'Operations', items: [
    { path: '', icon: 'speed', label: 'Overview', section: 'overview' },
    { path: '/requests', icon: 'inbox', label: 'Requests', section: 'bookings' },
    { path: '/jobs', icon: 'build_circle', label: 'Work orders', section: 'bookings' },
    { path: '/calendar', icon: 'calendar_month', label: 'Schedule', section: 'bookings' },
    { path: '/bookings', icon: 'event_note', label: 'Bookings', section: 'bookings' },
    { path: '/services', icon: 'build', label: 'Services & rates', section: 'services' },
    { path: '/inventory', icon: 'inventory_2', label: 'Inventory & parts', section: 'inventory' },
  ] },
  { title: 'Customers & team', items: [
    { path: '/customers', icon: 'group', label: 'Customers', section: 'customers' },
    { path: '/technicians', icon: 'engineering', label: 'Technicians', section: 'staff' },
    { path: '/staff', icon: 'badge', label: 'Staff & roles', section: 'staff' },
    { path: '/messages', icon: 'chat', label: 'Messages', section: 'messages' },
    { path: '/reviews', icon: 'star', label: 'Reviews', section: 'reviews' },
  ] },
  { title: 'Business', items: [
    { path: '/invoices', icon: 'receipt_long', label: 'Invoices', section: 'invoices' },
    { path: '/payouts', icon: 'account_balance_wallet', label: 'Payouts', section: 'payouts' },
    { path: '/promotions', icon: 'sell', label: 'Promotions', section: 'promotions' },
    { path: '/analytics', icon: 'monitoring', label: 'Analytics', section: 'analytics' },
  ] },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { auth, user } = useFirebase();
  const { business, activeBranch, canAccess } = useVendor();
  const initials = (user?.displayName || business.displayName || 'Vendor').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return <div className="flex h-full flex-col overflow-hidden border-r border-border bg-card">
    <SidebarHeader className="gap-4 border-b border-border p-4">
      <div className="flex items-center justify-between gap-2"><Logo /><ThemeToggle className="h-8 w-8 shrink-0" /></div>
      <div className="space-y-3 rounded-xl border border-border bg-muted/60 p-3">
        <p className="vendor-eyebrow text-muted-foreground">Workshop workspace</p>
        <h2 className="truncate text-base font-semibold">{business.displayName || 'Vendor workspace'}</h2>
        <BranchSwitcher />
        <Badge variant="outline" className="vendor-gold">{activeBranch?.status || 'Branch unavailable'}</Badge>
      </div>
    </SidebarHeader>
    <SidebarContent className="gap-4 px-3 py-4">
      {groups.map((group) => {
        const items = group.items.filter((item) => canAccess(item.section));
        return items.length === 0 ? null : <div key={group.title}>
          <p className="vendor-eyebrow mb-2 px-3 text-muted-foreground">{group.title}</p>
          <SidebarMenu className="gap-1">{items.map((item) => {
            const href = `/vendor/dashboard${item.path}`;
            const selected = item.path ? pathname.startsWith(href) : pathname === href;
            return <SidebarMenuItem key={href}><SidebarMenuButton asChild isActive={selected} tooltip={item.label} className={`h-11 rounded-lg px-3 ${selected ? '!bg-primary !text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Link href={href} aria-current={selected ? 'page' : undefined}><MaterialIcon name={item.icon} className="mr-1 text-xl" filled={selected} /><span className="text-sm font-medium">{item.label}</span></Link>
            </SidebarMenuButton></SidebarMenuItem>;
          })}</SidebarMenu>
        </div>;
      })}
    </SidebarContent>
    <SidebarFooter className="border-t border-border p-3">
      {user && <div className="mb-2 flex items-center gap-3 px-2 py-2"><Avatar className="h-9 w-9"><AvatarImage src={user.photoURL || undefined} /><AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{user.displayName || 'Vendor'}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div></div>}
      <Button asChild variant="ghost" className="justify-start"><Link href="/vendor/dashboard/settings"><MaterialIcon name="settings" className="mr-2" />Workshop settings</Link></Button>
      <Button variant="ghost" className="justify-start text-destructive" onClick={() => auth.signOut()}><MaterialIcon name="logout" className="mr-2" />Sign out</Button>
    </SidebarFooter>
  </div>;
}
