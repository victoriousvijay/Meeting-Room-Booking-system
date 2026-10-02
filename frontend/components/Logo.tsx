import Link from "next/link";
import { cn } from "./ui";

/** The pinwheel mark from the landing page: four quarter-discs, none overlapping. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" className={cn("text-white", className)} aria-hidden>
      <path d="M120 128H8A112 112 0 0 1 120 16Z" />
      <path d="M128 120V8A112 112 0 0 1 240 120Z" />
      <path d="M136 128H248A112 112 0 0 1 136 240Z" />
      <path d="M128 136V248A112 112 0 0 1 16 136Z" />
    </svg>
  );
}

export default function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7 transition-transform duration-500 group-hover:rotate-90" />
      <span className="text-[15px] font-semibold tracking-tight text-white">RoomSync</span>
    </Link>
  );
}
