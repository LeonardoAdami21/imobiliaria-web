import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './toast';

/**
 * Executa uma ação que altera dados na API. Ao concluir, avisa a pessoa
 * e recarrega todas as listas em tela, já que uma ação costuma mexer em mais
 * de um lugar (fechar uma venda muda o imóvel, as propostas e as comissões).
 */
export function useAction<Input, Output>(
  action: (input: Input) => Promise<Output>,
  options: { success?: string | ((output: Output) => string); onDone?: (output: Output) => void } = {},
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: action,
    onSuccess: async (output) => {
      await queryClient.invalidateQueries();
      const message = typeof options.success === 'function' ? options.success(output) : options.success;
      if (message) toast.success(message);
      options.onDone?.(output);
    },
  });
}
