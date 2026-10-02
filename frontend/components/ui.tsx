"use client";

// Small building blocks shared by every page, so the look stays consistent.
import { animate, motion, useMotionValue, useTransform, type Variants } from "framer-motion";
import { LoaderCircle, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- motion presets ----------

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Parent of a staggered entrance: children using `rise` appear one after another. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

// ---------- buttons ----------

const buttonVariants = {
  primary: "btn-cut bg-white text-black hover:bg-white/90",
  accent: "btn-cut bg-indigo-500 text-white hover:bg-indigo-400",
  secondary: "btn-cut-border text-white",
  ghost: "rounded-lg text-white/70 hover:bg-white/[0.06] hover:text-white",
  danger: "btn-cut bg-red-500 text-white hover:bg-red-400",
};

type Variant = keyof typeof buttonVariants;
type Size = "sm" | "md";

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
    buttonVariants[variant],
    className,
  );
}

function ButtonContent({
  loading,
  icon: Icon,
  size,
  children,
}: {
  loading?: boolean;
  icon?: LucideIcon;
  size: Size;
  children: React.ReactNode;
}) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  // One wrapper span, so the outline variant's dark inner layer can sit behind it.
  return (
    <span className="inline-flex items-center gap-2">
      {loading ? (
        <LoaderCircle className={cn("animate-spin", iconSize)} aria-hidden />
      ) : (
        Icon && <Icon className={iconSize} aria-hidden />
      )}
      {children}
    </span>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClasses(variant, size, className)} {...rest}>
      <ButtonContent loading={loading} icon={icon} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

/** A link that looks like a button (a <button> inside an <a> isn't valid HTML). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      <ButtonContent icon={icon} size={size}>
        {children}
      </ButtonContent>
    </Link>
  );
}

// ---------- layout ----------

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-indigo-300/80">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/** Counts up to a number on first render ("12", "4/5" and "38%" all work); other text shows as-is. */
export function AnimatedNumber({ value }: { value: React.ReactNode }) {
  const text = String(value);
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(text);
  const target = match ? Number(match[1]) : null;
  const decimals = match?.[1].includes(".") ? 1 : 0;
  const suffix = match?.[2] ?? "";
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (target === null) return;
    const controls = animate(count, target, { duration: 1, ease: EASE_OUT });
    return () => controls.stop();
  }, [target, count]);

  if (target === null) return <>{value}</>;
  return <motion.span>{display}</motion.span>;
}

const statTones = {
  indigo: "from-indigo-500/30 to-indigo-500/5 text-indigo-300",
  emerald: "from-emerald-500/30 to-emerald-500/5 text-emerald-300",
  amber: "from-amber-500/30 to-amber-500/5 text-amber-300",
  violet: "from-violet-500/30 to-violet-500/5 text-violet-300",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof statTones;
}) {
  return (
    <motion.div
      variants={rise}
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-4 transition-colors hover:border-white/15 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-white/50 sm:text-sm">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b", statTones[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-white">
        <AnimatedNumber value={value} />
      </p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </motion.div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-white/60 ring-1 ring-white/10">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-medium text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-white/50">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

// ---------- labels ----------

const badgeTones = {
  neutral: "bg-white/[0.06] text-white/70 ring-white/10",
  indigo: "bg-indigo-500/15 text-indigo-200 ring-indigo-400/20",
  green: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20",
  amber: "bg-amber-500/15 text-amber-200 ring-amber-400/20",
  red: "bg-red-500/15 text-red-200 ring-red-400/20",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

// A stable colour per name, so the same person always looks the same everywhere.
const avatarColours = [
  "from-indigo-400 to-indigo-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-300 to-amber-500",
  "from-sky-400 to-sky-600",
  "from-rose-400 to-rose-600",
  "from-violet-400 to-violet-600",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  ring = "ring-[#0c0c12]",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: string;
}) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      title={name}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white ring-2",
        avatarColours[hash % avatarColours.length],
        ring,
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-11 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, ring }: { names: string[]; max?: number; ring?: string }) {
  const extra = names.length - max;
  return (
    <div className="flex -space-x-1">
      {names.slice(0, max).map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size="sm" ring={ring} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-grid size-6 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-white/80 ring-2",
            ring ?? "ring-[#0c0c12]",
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// ---------- forms ----------

export const inputClass =
  "w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 hover:bg-white/[0.06] focus:border-indigo-400/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/15";

export function fieldBorder(error?: string) {
  return error ? "border-red-400/60" : "border-white/10";
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-white/70">{label}</span>
      {children}
      {error ? (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 block text-xs text-red-300"
        >
          {error}
        </motion.span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-white/40">{hint}</span>
      )}
    </label>
  );
}

// ---------- modal ----------

// Render inside <AnimatePresence> and only while open, so the enter and exit
// animations run and the form inside starts fresh every time.
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d0d14]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        {/* A thin light along the top edge, like the landing page's glass. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition duration-200 hover:rotate-90 hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ---------- tabs ----------

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  // Unique per instance, so two tab bars on one page don't share the sliding pill.
  const pill = useId();
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "text-white" : "text-white/50 hover:text-white/80",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={pill}
              className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/10"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
