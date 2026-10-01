"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error";

type ToastInput = { kind: ToastKind; title: string; message: string };
type Toast = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const MAX_VISIBLE = 4;

const styles: Record<ToastKind, { icon: typeof CircleCheck; tone: string }> = {
  success: { icon: CircleCheck, tone: "text-emerald-600" },
  error: { icon: CircleAlert, tone: "text-red-600" },
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
      setToasts((list) => [...list.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
      // Errors stay up longer: they usually carry a sentence worth reading.
      setTimeout(() => dismiss(id), toast.kind === "error" ? 7000 : 4500);
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
            const { icon: Icon, tone } = styles[toast.kind];
            return (
              <motion.div
                key={toast.id}
                layout
                role={toast.kind === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-lg shadow-zinc-900/5"
              >
                <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">{toast.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-600">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="Dismiss notification"
                >
                  <X className="size-4" />
                </button>
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
