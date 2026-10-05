import { type ReactNode, useEffect, useId, useRef } from 'react';
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuX } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { ApiError } from '@/api/http';
import type { Page } from '@/api/types';
import type { Tone } from '@/lib/labels';

// ───────────────────────────── Cabeçalho de página ─────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <>
      {back && (
        <Link className="backlink" to={back.to}>
          <LuChevronLeft aria-hidden /> {back.label}
        </Link>
      )}
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </header>
    </>
  );
}

// ───────────────────────────── Placas e etiquetas ─────────────────────────────

/** Situação do imóvel, no formato da placa pendurada na fachada. */
export function Plate({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="plate" data-tone={tone}>
      {label}
    </span>
  );
}

/** Estados dos demais registros (lead, cobrança, proposta...). */
export function Tag({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="tag" data-tone={tone}>
      {label}
    </span>
  );
}

/** Código do imóvel, como a plaquinha de número da casa. */
export function HouseNumber({ code, large }: { code: number; large?: boolean }) {
  return (
    <span className={large ? 'house-number is-large' : 'house-number'} title={`Imóvel nº ${code}`}>
      {code}
    </span>
  );
}

// ───────────────────────────── Estados de carregamento e erro ─────────────────────────────

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      {label}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

/** Mostra a mensagem da API e, quando houver, o problema de cada campo. */
export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Algo deu errado.';
  const details = error instanceof ApiError ? error.details : [];
  return (
    <div className="alert" role="alert">
      <LuCircleAlert aria-hidden />
      <div>
        {message}
        {details.length > 0 && (
          <ul>
            {details.map((detail) => (
              <li key={`${detail.field}-${detail.message}`}>
                <strong>{detail.field}:</strong> {detail.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Tabela ─────────────────────────────

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  page,
  rows,
  isLoading,
  error,
  empty,
  onPageChange,
  rowClassName,
}: {
  columns: Column<T>[];
  /** Resultado paginado da API... */
  page?: Page<T>;
  /** ...ou uma lista simples, sem paginação. */
  rows?: T[];
  isLoading?: boolean;
  error?: unknown;
  empty: ReactNode;
  onPageChange?: (page: number) => void;
  rowClassName?: (row: T) => string | undefined;
}) {
  const items = rows ?? page?.items;
  if (error) return <div className="panel-body"><ErrorAlert error={error} /></div>;
  if (isLoading || !items) return <Loading />;
  if (items.length === 0) return <>{empty}</>;

  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.perPage)) : 1;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={column.align}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className={rowClassName?.(row)}>
                {columns.map((column) => (
                  <td key={column.header} className={[column.align, column.className].filter(Boolean).join(' ') || undefined}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {page && onPageChange && (
        <div className="pagination">
          <span>
            {page.total} {page.total === 1 ? 'registro' : 'registros'}
          </span>
          {totalPages > 1 && (
            <span className="row">
              <button className="btn btn-sm" disabled={page.page <= 1} onClick={() => onPageChange(page.page - 1)}>
                <LuChevronLeft aria-hidden /> Anterior
              </button>
              <span>
                Página {page.page} de {totalPages}
              </span>
              <button className="btn btn-sm" disabled={page.page >= totalPages} onClick={() => onPageChange(page.page + 1)}>
                Próxima <LuChevronRight aria-hidden />
              </button>
            </span>
          )}
        </div>
      )}
    </>
  );
}

// ───────────────────────────── Diálogo ─────────────────────────────

/**
 * Janela modal sobre o <dialog> nativo: o navegador cuida de prender o foco,
 * fechar com Esc e bloquear o que está atrás.
 */
export function Modal({
  title,
  onClose,
  children,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      data-size={size}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <LuX aria-hidden />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}

/** Pergunta de confirmação para ações que mudam o estado de um negócio. */
export function Confirm({
  title,
  children,
  confirmLabel,
  danger,
  isPending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  isPending?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="stack">
        <div>{children}</div>
        <ErrorAlert error={error} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Voltar
        </button>
        <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Aguarde…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ───────────────────────────── Detalhes ─────────────────────────────

export function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
