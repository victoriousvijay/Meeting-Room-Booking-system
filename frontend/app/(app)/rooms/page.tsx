"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DoorOpen, MapPin, Pencil, Plus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useBookingActions } from "@/components/BookingActions";
import RoomFormModal from "@/components/RoomFormModal";
import { ErrorState, GridSkeleton } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Badge, Button, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { useQuery } from "@/hooks/useQuery";
import { api, describeError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import type { Room } from "@/lib/types";

export default function RoomsPage() {
  const user = useUser();
  const isAdmin = user.role === "admin";
  const notify = useToast();
  const { changes, newBooking } = useBookingActions();
  const [saved, setSaved] = useState(0);
  // undefined = form closed, null = adding a new room, Room = editing that room.
  const [editing, setEditing] = useState<Room | null | undefined>(undefined);
  const [toggling, setToggling] = useState<number | null>(null);

  const rooms = useQuery(`rooms:${isAdmin ? "all" : "open"}`, () => api.rooms(isAdmin), changes + saved);
  const closeForm = useCallback(() => setEditing(undefined), []);

  async function toggleOpen(room: Room) {
    setToggling(room.id);
    try {
      await api.updateRoom(room.id, { is_active: !room.is_active });
      notify({
        kind: "success",
        title: room.is_active ? "Room closed" : "Room reopened",
        message: room.is_active
          ? `${room.name} won't take new bookings. Existing bookings stay as they are.`
          : `${room.name} is open for bookings again.`,
      });
      setSaved((n) => n + 1);
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Rooms"
        description={isAdmin ? "Add rooms, describe what's in them, or close one for maintenance." : "Every room in your workspace."}
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              Add room
            </Button>
          )
        }
      />

      {rooms.error ? (
        <ErrorState message={rooms.error} onRetry={rooms.retry} />
      ) : !rooms.data ? (
        <GridSkeleton count={6} />
      ) : rooms.data.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          description={isAdmin ? "Add the meeting rooms in your office to start taking bookings." : "Ask an admin to add rooms."}
          action={isAdmin && <Button icon={Plus} onClick={() => setEditing(null)}>Add your first room</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.data.map((room, i) => (
            <motion.li
              key={room.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <Card className={cn("flex h-full flex-col p-4", !room.is_active && "bg-white/[0.03]")}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn("font-semibold", room.is_active ? "text-white" : "text-white/50")}>{room.name}</h3>
                  {room.is_active ? <Badge tone="green">Open</Badge> : <Badge tone="amber">Closed</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden /> {room.capacity} seats
                  </span>
                  {room.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden /> {room.location}
                    </span>
                  )}
                </div>
                {room.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {room.amenities.map((a) => (
                      <Badge key={a}>{a}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {room.is_active && (
                    <Button size="sm" onClick={() => newBooking({ roomId: String(room.id) })}>
                      Book
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(room)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={toggling === room.id}
                        onClick={() => toggleOpen(room)}
                        className="ml-auto"
                      >
                        {room.is_active ? "Close room" : "Reopen"}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing !== undefined && (
          <RoomFormModal
            room={editing}
            onClose={closeForm}
            onSaved={() => {
              setEditing(undefined);
              setSaved((n) => n + 1);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
