export interface User {
  id: string;
  authSubject: string;
  email: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface CreateTodoRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: Priority;
  tagIds?: string[];
}

export type UpdateTodoRequest = Required<Pick<CreateTodoRequest, 'title'>> &
  Omit<CreateTodoRequest, 'title'> & {
    completed: boolean;
  };
