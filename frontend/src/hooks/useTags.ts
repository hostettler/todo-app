import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { Tag } from '../api/types';

const KEY = ['tags'];

export function useTags() {
  const api = useApi();
  return useQuery<Tag[]>({
    queryKey: KEY,
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

export function useCreateTag() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Tag>('/tags', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRenameTag() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<Tag>(`/tags/${id}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTag() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
