"use client";

// Admin form to add or edit a room.
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { api, describeError } from "@/lib/api";
import type { Room } from "@/lib/types";
import { hasErrors, required } from "@/lib/validation";
import { useToast } from "./Toast";
import { Button, Field, Modal, cn, fieldBorder, inputClass } from "./ui";

const SUGGESTED = ["Projector", "Whiteboard", "Video call", "TV screen", "Sound system", "Phone"];

type Props = {
  room: Room | null; // null = new room
  onClose: () => void;
  onSaved: () => void;
};

export default function RoomFormModal({ room, onClose, onSaved }: Props) {
  const notify = useToast();
  const [name, setName] = useState(room?.name ?? "");
  const [capacity, setCapacity] = useState(room ? String(room.capacity) : "");
  const [location, setLocation] = useState(room?.location ?? "");
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [custom, setCustom] = useState("");
  const [errors, setErrors] = useState<{ name?: string; capacity?: string }>({});
  const [saving, setSaving] = useState(false);

  const addAmenity = (value: string) => {
    const clean = value.trim();
    if (clean && !amenities.some((a) => a.toLowerCase() === clean.toLowerCase())) {
      setAmenities([...amenities, clean]);
    }
    setCustom("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const seats = Number(capacity);
    const found = {
      name: required(name, "Give the room a name."),
      capacity: Number.isInteger(seats) && seats >= 1 && seats <= 500 ? undefined : "Seats must be between 1 and 500.",
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    const input = { name: name.trim(), capacity: seats, location: location.trim(), amenities };
    try {
      if (room) await api.updateRoom(room.id, input);
      else await api.createRoom(input);
      notify({ kind: "success", title: room ? "Room updated" : "Room added", message: `${input.name} is saved.` });
      onSaved();
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
      setSaving(false);
    }
  }

  return (
    <Modal title={room ? `Edit ${room.name}` : "Add a room"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Name" error={errors.name}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ganga"
              className={cn(inputClass, fieldBorder(errors.name))}
            />
          </Field>
          <Field label="Seats" error={errors.capacity}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={cn(inputClass, fieldBorder(errors.capacity))}
            />
          </Field>
        </div>
        <Field label="Location (optional)">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Floor 2 - east wing"
            className={cn(inputClass, "border-zinc-300")}
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700">Amenities</span>
          {amenities.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800">
                  {a}
                  <button
                    type="button"
                    onClick={() => setAmenities(amenities.filter((x) => x !== a))}
                    aria-label={`Remove ${a}`}
                    className="rounded-full hover:bg-emerald-100"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.filter((s) => !amenities.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addAmenity(s)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <Plus className="size-3" aria-hidden /> {s}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the amenity instead of submitting the whole form.
              if (e.key === "Enter") {
                e.preventDefault();
                addAmenity(custom);
              }
            }}
            maxLength={30}
            placeholder="Something else? Type and press Enter"
            className={cn(inputClass, "mt-2 border-zinc-300")}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {room ? "Save changes" : "Add room"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
