import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { LuCircleAlert, LuCircleCheck } from 'react-icons/lu';

interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'danger';
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

/** Avisos curtos no canto da tela, para confirmar que uma ação foi concluída. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast['tone']) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === 'ok' ? 3500 : 6000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => push(message, 'ok'), error: (message) => push(message, 'danger') }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-tone={toast.tone} role="status">
            {toast.tone === 'ok' ? <LuCircleCheck aria-hidden /> : <LuCircleAlert aria-hidden />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}
