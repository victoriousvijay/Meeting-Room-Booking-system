"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import InviteCard from "@/components/InviteCard";
import { ErrorState, Skeleton } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { useQuery } from "@/hooks/useQuery";
import { api, describeError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import type { Workspace } from "@/lib/types";

export default function SettingsPage() {
  const me = useUser();
  const isAdmin = me.role === "admin";
  const [saved, setSaved] = useState(0);
  const workspace = useQuery(isAdmin ? "workspace" : null, () => api.workspace(), saved);

  return (
    <>
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-semibold text-white">Your profile</h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={me.name} size="lg" />
            <div>
              <p className="font-medium text-white">{me.name}</p>
              <p className="text-sm text-white/50">{me.email}</p>
              <div className="mt-1 flex gap-1">
                <Badge tone={isAdmin ? "indigo" : "neutral"}>{isAdmin ? "Admin" : "Member"}</Badge>
                {me.department && <Badge>{me.department}</Badge>}
              </div>
            </div>
          </div>
        </Card>

        {isAdmin &&
          (workspace.error ? (
            <ErrorState message={workspace.error} onRetry={workspace.retry} />
          ) : !workspace.data ? (
            <Skeleton rows={2} />
          ) : (
            <WorkspaceSettings workspace={workspace.data} onChanged={() => setSaved((n) => n + 1)} />
          ))}
      </div>
    </>
  );
}

function WorkspaceSettings({ workspace, onChanged }: { workspace: Workspace; onChanged: () => void }) {
  const notify = useToast();
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      notify({ kind: "error", title: "Check the details", message: "The workspace name needs at least 2 characters." });
      return;
    }
    setSaving(true);
    try {
      await api.renameWorkspace(name.trim());
      notify({ kind: "success", title: "Saved", message: "Workspace renamed. Everyone sees the new name after their next login." });
      onChanged();
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setSaving(false);
    }
  }

  async function resetCode() {
    setResetting(true);
    try {
      const updated = await api.regenerateJoinCode();
      notify({ kind: "success", title: "New join code", message: `The old code no longer works. New code: ${updated.join_code}` });
      setConfirmReset(false);
      onChanged();
    } catch (err) {
      notify({ kind: "error", ...describeError(err) });
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <Card className="p-5">
        <h2 className="font-semibold text-white">Workspace</h2>
        <p className="text-sm text-white/50">
          {workspace.member_count} active member{workspace.member_count === 1 ? "" : "s"} · {workspace.room_count} room
          {workspace.room_count === 1 ? "" : "s"}
        </p>
        <form onSubmit={rename} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Workspace name">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${inputClass} border-white/10`} />
            </Field>
          </div>
          <Button type="submit" loading={saving} disabled={name.trim() === workspace.name}>
            Save
          </Button>
        </form>
      </Card>

      <InviteCard workspace={workspace}>
        {confirmReset ? (
          <>
            <Button variant="danger" loading={resetting} onClick={resetCode}>
              Replace code
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button variant="ghost" icon={RefreshCw} onClick={() => setConfirmReset(true)} title="Use if the code leaked">
            New code
          </Button>
        )}
      </InviteCard>
    </>
  );
}
