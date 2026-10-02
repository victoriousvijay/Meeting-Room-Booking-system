import { CalendarCheck2 } from "lucide-react";
import Link from "next/link";
import { cn } from "./ui";

export default function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          light ? "bg-white/15 text-white" : "bg-indigo-600 text-white",
        )}
      >
        <CalendarCheck2 className="size-4.5" aria-hidden />
      </span>
      <span className={cn("text-base font-semibold tracking-tight", light ? "text-white" : "text-zinc-900")}>
        RoomSync
      </span>
    </Link>
  );
}
