import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const TOAST_DURATION_MS = 3200;
const MAX_TOASTS = 5;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => {
      const next = [...prev, { id, type, message }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const success = useCallback((message: string) => showToast('success', message), [showToast]);
  const error = useCallback((message: string) => showToast('error', message), [showToast]);
  const info = useCallback((message: string) => showToast('info', message), [showToast]);
  const warning = useCallback((message: string) => showToast('warning', message), [showToast]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toastStyles: Record<ToastType, { icon: React.ReactNode; card: string; progress: string }> = {
    success: {
      icon: <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />,
      card: 'border-emerald-300 bg-white dark:border-emerald-800/70 dark:bg-slate-900',
      progress: 'bg-emerald-500 dark:bg-emerald-400',
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />,
      card: 'border-red-300 bg-white dark:border-red-900/70 dark:bg-slate-900',
      progress: 'bg-red-500 dark:bg-red-400',
    },
    info: {
      icon: <Info className="h-4 w-4 shrink-0 text-brand-blue dark:text-blue-400" />,
      card: 'border-blue-300 bg-white dark:border-blue-800/70 dark:bg-slate-900',
      progress: 'bg-brand-blue dark:bg-blue-400',
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />,
      card: 'border-amber-300 bg-white dark:border-amber-800/70 dark:bg-slate-900',
      progress: 'bg-amber-500 dark:bg-amber-400',
    },
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-20 z-[300] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => {
            const style = toastStyles[toast.type];
            return (
              <ToastItem
                key={toast.id}
                toast={toast}
                style={style}
                duration={TOAST_DURATION_MS}
                onClose={() => removeToast(toast.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = React.forwardRef<HTMLDivElement, {
  toast: Toast;
  style: { icon: React.ReactNode; card: string; progress: string };
  duration: number;
  onClose: () => void;
}>(function ToastItem({ toast, style, duration, onClose }, ref) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [duration]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={`pointer-events-auto flex w-fit max-w-full flex-col overflow-hidden rounded-2xl border shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] ${style.card}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {style.icon}
        <p className="min-w-0 max-w-[18rem] text-[13px] font-medium leading-5 text-slate-950 dark:text-slate-100">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="-my-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-[width] duration-75 ease-linear ${style.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
});
