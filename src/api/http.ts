import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'imobiliaria.token';

/** Guarda o token de acesso no navegador para a sessão sobreviver ao recarregar a página. */
export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: { field: string; message: string }[] };
}

/** Erro devolvido pela API, já com a mensagem em português pronta para mostrar na tela. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
  timeout: 20_000,
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onSessionExpired: (() => void) | null = null;

/** Quem cuida da sessão (AuthProvider) registra aqui o que fazer quando o token deixa de valer. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const response = error.response;
    if (!response) {
      const message =
        error.code === 'ECONNABORTED'
          ? 'A API demorou demais para responder. Tente de novo.'
          : 'Não foi possível falar com a API. Confira se ela está no ar e o endereço em VITE_API_URL.';
      return Promise.reject(new ApiError(message, 0, 'NETWORK_ERROR'));
    }

    const body = response.data?.error;
    const apiError = new ApiError(
      body?.message ?? 'Erro inesperado na API.',
      response.status,
      body?.code ?? 'UNKNOWN',
      body?.details ?? [],
    );
    if (response.status === 401 && apiError.code === 'INVALID_TOKEN') onSessionExpired?.();
    return Promise.reject(apiError);
  },
);

/** Remove filtros vazios para não mandar "?status=" na URL. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>;
}
