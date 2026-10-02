"use client";

import { Search, Users } from "lucide-react";
import { useState } from "react";
import InviteCard from "@/components/InviteCard";
import { ErrorState, Skeleton } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, cn, inputClass } from "@/components/ui";
import { useQuery } from "@/hooks/useQuery";
import { api, describeError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import type { Person, Role } from "@/lib/types";

export default function PeoplePage() {
  const me = useUser();
  const isAdmin = me.role === "admin";
  const notify = useToast();
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

  const people = useQuery(`people:${isAdmin ? "all" : "active"}`, () => api.people(isAdmin), saved);
  const workspace = useQuery(isAdmin ? "workspace" : null, () => api.workspace());

  const needle = search.trim().toLowerCase();
  const shown = (people.data ?? []).filter((p) =>
    `${p.name} ${p.email} ${p.department}`.toLowerCase().includes(needle),
  );

  async function update(person: Person, patch: { role?: Role; is_active?: boolean }, message: string) {
    setBusyId(person.id);
    try {
      await api.updatePerson(person.id, patch);
      notify({ kind: "success", title: "Updated", message });
      setSaved((n) => n + 1);
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="People"
        description={`Everyone in ${me.workspace.name}.`}
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className={`${inputClass} w-56 border-zinc-300 pl-9`}
            />
          </div>
        }
      />

      {isAdmin && workspace.data && (
        <div className="mb-6">
          <InviteCard workspace={workspace.data} />
        </div>
      )}

      {people.error ? (
        <ErrorState message={people.error} onRetry={people.retry} />
      ) : !people.data ? (
        <Skeleton rows={5} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Users} title="No one matches" description="Try a different name, email or team." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Team</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                {isAdmin && <th className="px-4 py-2.5 text-right font-medium">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((p) => {
                const isMe = p.id === me.id;
                return (
                  <tr key={p.id} className={cn(!p.is_active && "bg-zinc-50 text-zinc-400")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">
                            {p.name} {isMe && <span className="font-normal text-zinc-500">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 md:table-cell">{p.department || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={p.role === "admin" ? "indigo" : "neutral"}>{p.role === "admin" ? "Admin" : "Member"}</Badge>
                        {!p.is_active && <Badge tone="amber">Deactivated</Badge>}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {/* No self-service demotion: the server refuses it too. */}
                        {!isMe && (
                          <div className="flex justify-end gap-1">
                            {p.is_active && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === p.id}
                                onClick={() =>
                                  update(
                                    p,
                                    { role: p.role === "admin" ? "member" : "admin" },
                                    p.role === "admin" ? `${p.name} is now a member.` : `${p.name} is now an admin.`,
                                  )
                                }
                              >
                                {p.role === "admin" ? "Make member" : "Make admin"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busyId === p.id}
                              className={p.is_active ? "text-red-600" : ""}
                              onClick={() =>
                                update(
                                  p,
                                  { is_active: !p.is_active },
                                  p.is_active ? `${p.name} can no longer log in.` : `${p.name} can log in again.`,
                                )
                              }
                            >
                              {p.is_active ? "Deactivate" : "Reactivate"}
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
