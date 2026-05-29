import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { CreateTodoRequest, Todo, UpdateTodoRequest } from '../api/types';

export interface TodoFilters {
  completed?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  tag?: string;
  sort?: 'createdAt' | 'dueDate' | 'priority';
}

const ROOT_KEY = ['todos'] as const;

export function todosKey(filters: TodoFilters) {
  return [...ROOT_KEY, filters] as const;
}

export function buildQuery(filters: TodoFilters): string {
  const params = new URLSearchParams();
  if (filters.completed !== undefined) params.set('completed', String(filters.completed));
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.sort) params.set('sort', filters.sort);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useTodos(filters: TodoFilters) {
  const api = useApi();
  return useQuery<Todo[]>({
    queryKey: todosKey(filters),
    queryFn: () => api.get<Todo[]>(`/todos${buildQuery(filters)}`),
  });
}

export function useCreateTodo() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTodoRequest) => api.post<Todo>('/todos', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
  });
}

export function useUpdateTodo() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTodoRequest }) =>
      api.put<Todo>(`/todos/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
  });
}

export function useDeleteTodo() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/todos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
  });
}

/**
 * Optimistic completion toggle: write the new completion flag into every
 * cached todo list, then call PATCH; on failure restore the original cache.
 */
export function useToggleCompletion() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch<Todo>(`/todos/${id}/completion`, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ROOT_KEY });
      const snapshots = qc.getQueriesData<Todo[]>({ queryKey: ROOT_KEY });
      snapshots.forEach(([key, list]) => {
        if (!list) return;
        qc.setQueryData<Todo[]>(
          key,
          list.map((t) => (t.id === id ? { ...t, completed } : t)),
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
  });
}
