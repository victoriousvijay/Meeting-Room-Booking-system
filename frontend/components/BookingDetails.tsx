"use client";

// Everything about one booking, plus cancel for those allowed to.
import { CalendarDays, Clock, DoorOpen, Users } from "lucide-react";
import { useState } from "react";
import { formatDateLong, formatDuration, toMinutes } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { Avatar, Badge, Button, Modal } from "./ui";

type Props = {
  booking: Booking;
  onClose: () => void;
  onCancel: (booking: Booking) => Promise<void>;
};

function Row({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0 flex-1 text-sm text-zinc-700">{children}</div>
    </div>
  );
}

export default function BookingDetails({ booking, onClose, onCancel }: Props) {
  // Cancelling is two clicks: a stray tap shouldn't delete a meeting.
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const minutes = toMinutes(booking.end_time) - toMinutes(booking.start_time);

  async function cancel() {
    setCancelling(true);
    await onCancel(booking);
    setCancelling(false);
  }

  return (
    <Modal title={booking.title} onClose={onClose}>
      <div className="space-y-4">
        {booking.my_role && (
          <Badge tone={booking.my_role === "organizer" ? "indigo" : "green"}>
            {booking.my_role === "organizer" ? "You're organising" : "You're invited"}
          </Badge>
        )}

        <Row icon={CalendarDays}>{formatDateLong(booking.date)}</Row>
        <Row icon={Clock}>
          <span className="tabular-nums">
            {booking.start_time}-{booking.end_time}
          </span>{" "}
          <span className="text-zinc-500">· {formatDuration(minutes)}</span>
        </Row>
        <Row icon={DoorOpen}>{booking.room_name}</Row>
        <Row icon={Users}>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Avatar name={booking.organizer.name} size="sm" />
              <span className="font-medium text-zinc-800">{booking.organizer.name}</span>
              <span className="text-xs text-zinc-500">organiser</span>
            </li>
            {booking.attendees.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Avatar name={a.name} size="sm" />
                <span>{a.name}</span>
                {a.department && <span className="text-xs text-zinc-500">{a.department}</span>}
              </li>
            ))}
          </ul>
        </Row>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
          {!booking.can_cancel ? (
            <p className="mr-auto text-xs text-zinc-500">Only the organiser or an admin can cancel this.</p>
          ) : confirming ? (
            <>
              <span className="mr-auto text-sm text-zinc-700">Cancel this booking?</span>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={cancelling}>
                Keep
              </Button>
              <Button variant="danger" onClick={cancel} loading={cancelling}>
                Cancel booking
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setConfirming(true)} className="text-red-600">
              Cancel booking
            </Button>
          )}
          {!confirming && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
