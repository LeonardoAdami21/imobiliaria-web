import { useCallback, useState } from 'react';

/** Estado de formulário em um objeto só, com um "setter" por campo. */
export function useFormState<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = useCallback(
    <K extends keyof T>(key: K) =>
      (value: T[K]) =>
        setValues((current) => ({ ...current, [key]: value })),
    [],
  );
  return { values, set, setValues };
}
