"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error";

type ToastInput = { kind: ToastKind; title: string; message: string };
type Toast = ToastInput & { id: number; duration: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const MAX_VISIBLE = 4;

const styles: Record<ToastKind, { icon: typeof CircleCheck; tone: string; bar: string }> = {
  success: { icon: CircleCheck, tone: "text-emerald-300 bg-emerald-500/15", bar: "bg-emerald-400" },
  error: { icon: CircleAlert, tone: "text-red-300 bg-red-500/15", bar: "bg-red-400" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = ++nextId.current;
      // Errors stay up longer: they usually carry a sentence worth reading.
      const duration = toast.kind === "error" ? 7000 : 4500;
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { ...toast, id, duration }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, tone, bar } = styles[toast.kind];
            return (
              <motion.div
                key={toast.id}
                layout
                role={toast.kind === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#111118]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
              >
                <div className="flex items-start gap-3">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-white">{toast.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-white/60">{toast.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="rounded-md p-1 text-white/30 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Dismiss notification"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {/* Shrinks over the toast's lifetime, so it's clear when it will go away. */}
                <motion.span
                  aria-hidden
                  className={`absolute bottom-0 left-0 h-0.5 ${bar}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: toast.duration / 1000, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used inside <ToastProvider>");
  return notify;
}
