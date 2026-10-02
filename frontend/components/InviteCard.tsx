"use client";

// Shows the workspace join code with one-click copy of the invite link.
import { Copy, UserPlus } from "lucide-react";
import type { Workspace } from "@/lib/types";
import { useToast } from "./Toast";
import { Button, Card } from "./ui";

export default function InviteCard({ workspace, children }: { workspace: Workspace; children?: React.ReactNode }) {
  const notify = useToast();

  async function copyLink() {
    const link = `${window.location.origin}/join?code=${workspace.join_code}`;
    try {
      await navigator.clipboard.writeText(link);
      notify({ kind: "success", title: "Invite link copied", message: "Send it to a teammate so they can join." });
    } catch {
      notify({ kind: "error", title: "Couldn't copy", message: `Share this link instead: ${link}` });
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">
        <UserPlus className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">Invite your team</p>
        <p className="text-sm text-white/50">
          They sign up at <span className="font-medium text-white/80">/join</span> with code{" "}
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono font-semibold tracking-wider text-white">
            {workspace.join_code}
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" icon={Copy} onClick={copyLink}>
          Copy invite link
        </Button>
        {children}
      </div>
    </Card>
  );
}
