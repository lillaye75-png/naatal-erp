"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: "border-l-teranga-500",
  error: "border-l-error",
  warning: "border-l-warning",
  info: "border-l-info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-3 px-4 py-3 rounded bg-[var(--bg-card)] border border-[var(--border)] border-l-4 ${colors[t.type]} shadow-lg`}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: `var(--color-${t.type === "error" ? "error" : t.type === "warning" ? "warning" : t.type === "info" ? "info" : "teranga-500"}`}} />
                <p className="text-sm text-[var(--text-primary)] flex-1">{t.message}</p>
                <button
                  onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                  className="text-neutral-400 hover:text-neutral-600"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);