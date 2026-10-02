"use client";

// Choose meeting attendees from the workspace directory.
import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
import type { Person } from "@/lib/types";
import { Avatar, inputClass } from "./ui";

type Props = {
  people: Person[];
  value: number[];
  onChange: (ids: number[]) => void;
};

export default function PeoplePicker({ people, value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const selected = people.filter((p) => value.includes(p.id));
  const needle = search.trim().toLowerCase();
  const matches = people
    .filter((p) => !value.includes(p.id))
    .filter((p) => `${p.name} ${p.department} ${p.email}`.toLowerCase().includes(needle))
    .slice(0, 5);

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 py-0.5 pl-0.5 pr-2 text-xs text-indigo-100">
              <Avatar name={p.name} size="sm" />
              {p.name}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== p.id))}
                className="rounded-full p-0.5 hover:bg-indigo-500/25"
                aria-label={`Remove ${p.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Add people by name or team"
          className={`${inputClass} border-white/10 pl-9`}
        />
      </div>

      <ul className="mt-1.5 divide-y divide-white/[0.06] rounded-lg border border-white/10">
        {matches.length === 0 ? (
          <li className="px-3 py-2 text-xs text-white/50">
            {people.length === value.length ? "Everyone is already invited." : "No one matches that search."}
          </li>
        ) : (
          matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, p.id]);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/[0.05]"
              >
                <Avatar name={p.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white/90">{p.name}</span>
                  {p.department && <span className="block truncate text-xs text-white/50">{p.department}</span>}
                </span>
                <Plus className="size-4 text-white/40" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
