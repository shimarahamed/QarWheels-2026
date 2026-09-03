'use client';

import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Edit, MoreHorizontal, Trash2, UserCheck } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { BookingActions } from '@/components/vendor/bookings/booking-actions';
import type { Booking, WithId } from '@/lib/types';

/**
 * One row of the vendor bookings table. Extracted from the page so the page
 * itself is about fetching and mutation, not markup. The status chip is the
 * shared StatusBadge — the local getStatusVariant this replaced collapsed the
 * nine booking statuses onto four shadcn Badge variants, so Declined and
 * Cancelled were indistinguishable, as were Confirmed and InProgress.
 */
export function BookingTableRow({
  booking,
  onEditClick,
  onDeleteClick,
}: {
  booking: WithId<Booking>;
  onEditClick: (booking: WithId<Booking>) => void;
  onDeleteClick: (booking: WithId<Booking>) => void;
}) {
  const bookingDate =
    booking.bookingDate instanceof Timestamp
      ? booking.bookingDate.toDate()
      : new Date(booking.bookingDate);

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{booking.customerName || 'Customer not found'}</div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {booking.carDescription || 'Vehicle details unavailable'}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div>{booking.serviceName}</div>
        {booking.assignedStaffName && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <UserCheck className="h-3 w-3" />
            {booking.assignedStaffName}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">{format(bookingDate, 'PPP p')}</TableCell>
      <TableCell>
        <StatusBadge status={booking.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <BookingActions booking={booking} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onEditClick(booking)}>
                <Edit className="mr-2 h-4 w-4" /> Update Status/Cost
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDeleteClick(booking)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
