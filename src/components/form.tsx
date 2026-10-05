import { type ChangeEvent, type InputHTMLAttributes, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { centsToInput, inputToCents } from '@/lib/format';

// ───────────────────────────── Campo com rótulo ─────────────────────────────

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  /** Recebe o id que liga o rótulo ao controle. */
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'className'> & {
  label: string;
  hint?: ReactNode;
  className?: string;
  value: string;
  onChange: (value: string) => void;
};

export function TextField({ label, hint, className, value, onChange, ...input }: TextProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} className="input" value={value} onChange={(event) => onChange(event.target.value)} {...input} />}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  className,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <textarea
          id={id}
          className="textarea"
          value={value}
          required={required}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  className,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  value: T | '';
  onChange: (value: T | '') => void;
  options: { value: T; label: string }[];
  /** Texto da opção vazia. Sem ele, o campo não tem opção vazia. */
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <select
          id={id}
          className="select"
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T | '')}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/**
 * Campo de dinheiro. O valor circula em centavos; a pessoa só digita números
 * e a vírgula anda sozinha, como em maquininha de cartão: 1 → 0,01 → 0,15 → 1,50.
 */
export function MoneyField({
  label,
  hint,
  className,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <input
          id={id}
          className="input num"
          inputMode="numeric"
          placeholder="0,00"
          value={centsToInput(value)}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(inputToCents(event.target.value))}
        />
      )}
    </Field>
  );
}

// ───────────────────────────── Seletor com busca ─────────────────────────────

export interface ComboOption {
  id: string;
  label: string;
  detail?: string;
}

/**
 * Seletor que busca enquanto a pessoa digita (pessoas, imóveis, leads).
 * `search` devolve as opções para o texto; `selected` é o rótulo do valor atual.
 */
export function ComboField({
  label,
  hint,
  className,
  value,
  selected,
  onChange,
  search,
  placeholder = 'Digite para buscar',
  required,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  value: string | null;
  /** Como mostrar o valor selecionado. */
  selected?: ReactNode;
  onChange: (id: string | null, option?: ComboOption) => void;
  search: (text: string) => Promise<ComboOption[]>;
  placeholder?: string;
  required?: boolean;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ComboOption[] | null>(null);
  const [active, setActive] = useState(0);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  // Espera a pessoa parar de digitar antes de consultar a API.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchRef.current(text.trim()).then(
        (found) => {
          if (!cancelled) {
            setOptions(found);
            setActive(0);
          }
        },
        () => !cancelled && setOptions([]),
      );
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, open]);

  const pick = (option: ComboOption) => {
    setPickedLabel(option.label);
    onChange(option.id, option);
    setOpen(false);
    setText('');
  };

  return (
    <Field label={label} hint={hint} className={className}>
      {(id) =>
        value ? (
          <div className="combo-value">
            <span className="grow">{selected ?? pickedLabel ?? 'Selecionado'}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Trocar ${label.toLowerCase()}`}
              onClick={() => {
                setPickedLabel(null);
                onChange(null);
              }}
            >
              <LuX aria-hidden />
            </button>
          </div>
        ) : (
          <div className="combo">
            <input
              id={id}
              // Texto digitado não é uma escolha: enquanto nada for selecionado, o campo obrigatório fica inválido.
              ref={(element) => element?.setCustomValidity(required ? 'Escolha uma opção da lista.' : '')}
              className="input"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              autoComplete="off"
              placeholder={placeholder}
              required={required}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(event) => {
                if (!open || !options?.length) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, options.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const option = options[active];
                  if (option) pick(option);
                } else if (event.key === 'Escape') {
                  event.stopPropagation();
                  setOpen(false);
                }
              }}
            />
            {open && (
              <ul className="combo-list" id={`${id}-list`} role="listbox">
                {options === null && <li className="empty-option">Buscando…</li>}
                {options?.length === 0 && <li className="empty-option">Nada encontrado.</li>}
                {options?.map((option, index) => (
                  <li
                    key={option.id}
                    role="option"
                    aria-selected={index === active}
                    onMouseDown={(event) => {
                      event.preventDefault(); // mantém o foco no campo até a escolha ser aplicada
                      pick(option);
                    }}
                  >
                    {option.label}
                    {option.detail && (
                      <span className="muted small" style={{ marginLeft: 8 }}>
                        {option.detail}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }
    </Field>
  );
}

/** Rodapé padrão de formulário dentro de um diálogo. */
export function FormActions({
  onCancel,
  submitLabel,
  isPending,
}: {
  onCancel: () => void;
  submitLabel: string;
  isPending?: boolean;
}) {
  return (
    <div className="form-actions">
      <button type="button" className="btn" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Salvando…' : submitLabel}
      </button>
    </div>
  );
}
