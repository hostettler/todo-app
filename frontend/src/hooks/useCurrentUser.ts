import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { User } from '../api/types';

export function useCurrentUser() {
  const api = useApi();
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/me'),
  });
}
