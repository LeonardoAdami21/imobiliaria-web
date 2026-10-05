import { useEffect, useState } from 'react';

/** Devolve o valor só depois que ele para de mudar por um instante (evita uma consulta por tecla). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  const key = JSON.stringify(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(JSON.parse(key) as T), delay);
    return () => clearTimeout(timer);
  }, [key, delay]);
  return debounced;
}
