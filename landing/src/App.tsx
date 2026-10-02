import { ArrowRight, BookOpen, LayoutDashboard } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

const APP_URL = "https://roomsync-nine.vercel.app";
const API_DOCS_URL = "https://roomsync-api-2mnn.onrender.com/docs";
const REPO_URL = "https://github.com/victoriousvijay/Meeting-Room-Booking-system/tree/saas";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260717_120352_eb988725-1351-43b3-8095-16e4a1005e3d.mp4";

// Each block fades up in turn; the delay sets its place in the sequence.
const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

/** Four quarter-discs, each nudged along the turn: rooms in sync, nothing overlapping. */
function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className} aria-hidden>
      <path d="M120 128H8A112 112 0 0 1 120 16Z" />
      <path d="M128 120V8A112 112 0 0 1 240 120Z" />
      <path d="M136 128H248A112 112 0 0 1 136 240Z" />
      <path d="M128 136V248A112 112 0 0 1 16 136Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const QUICK_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Source code on GitHub", href: REPO_URL, icon: <GitHubIcon /> },
  { label: "API documentation", href: API_DOCS_URL, icon: <BookOpen className="h-4 w-4" aria-hidden /> },
  { label: "Open the RoomSync app", href: `${APP_URL}/dashboard`, icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
];

export default function App() {
  return (
    <div className="h-screen w-full bg-black p-3 font-inter md:p-4">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-black">
        <video
          src={VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          className="anim-fade absolute inset-0 h-full w-full object-cover"
          style={delay(0.2)}
        />

        <nav className="relative z-10 flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
          <a href="/" className="anim-stagger flex flex-col items-center" style={delay(0.1)} aria-label="RoomSync home">
            <Logo className="h-14 w-14 md:h-16 md:w-16" />
            <span className="mt-1 text-[10px] font-light tracking-[0.4em] text-white md:text-xs">R O O M S Y N C</span>
          </a>

          <div className="anim-stagger flex items-center gap-3" style={delay(0.2)}>
            <a href={`${APP_URL}/login`} className="btn-cut-border hidden px-5 py-2.5 text-sm text-white md:block">
              <span>Log in</span>
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="btn-cut hidden bg-white px-5 py-2.5 text-sm text-black transition-colors hover:bg-white/90 md:block"
            >
              Get started
            </a>
          </div>
        </nav>

        <main className="relative z-10 flex flex-1 flex-col justify-between px-6 pb-8 md:px-10 md:pb-10">
          <div className="relative flex flex-1 items-center">
            <div className="anim-stagger absolute left-0 top-[18%] hidden flex-col gap-6 lg:flex" style={delay(0.4)}>
              <p className="max-w-[220px] text-base leading-relaxed text-white/80">
                Every room,
                <br />
                every meeting,
                <br />
                one screen
              </p>
              <div className="mt-4 flex flex-col gap-2" aria-hidden>
                <div className="flex items-center gap-1">
                  <span className="h-4 w-4 rounded-full border border-white/40" />
                  <span className="h-4 w-4 rounded-full border border-white/40" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-white/70">
                    Live room
                    <br />
                    timeline
                  </span>
                  <span className="text-xs text-white/50">01</span>
                </div>
              </div>
            </div>

            <div className="anim-stagger w-full text-center" style={delay(0.5)}>
              <h1
                className="text-3xl font-normal leading-[1.1] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
              >
                Meeting Rooms
                <br />
                Without the Chaos
                <br />
                RoomSync for Teams
              </h1>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 items-center gap-6 md:grid-cols-3">
            <div className="anim-stagger flex items-center justify-center md:justify-end" style={delay(0.7)}>
              <p className="max-w-[260px] text-center text-sm leading-relaxed text-white md:ml-auto md:text-left">
                Find a free room in seconds, invite your team, and let RoomSync block double-bookings before they
                happen.
              </p>
            </div>

            <div className="anim-stagger flex flex-col items-center gap-8 md:gap-24" style={delay(0.85)}>
              <span className="text-2xl font-medium text-white md:text-3xl">Zero Double-Bookings</span>
              <a
                href={`${APP_URL}/login`}
                className="btn-cut group flex w-full max-w-[280px] items-center justify-center gap-2 bg-white py-3.5 text-black transition-colors hover:bg-white/90"
              >
                <span className="text-sm font-medium">Try the Live Demo</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
            </div>

            <div className="anim-stagger flex items-center justify-center gap-3 md:justify-end" style={delay(1)}>
              {QUICK_LINKS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  className="btn-cut-sm flex h-10 w-10 items-center justify-center bg-white text-black transition-colors hover:bg-white/90"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
