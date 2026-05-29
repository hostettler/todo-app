import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CreateTodoRequest, Priority, Todo, UpdateTodoRequest } from '../api/types';
import { useTags } from '../hooks/useTags';
import {
  TodoFilters,
  useCreateTodo,
  useDeleteTodo,
  useToggleCompletion,
  useTodos,
  useUpdateTodo,
} from '../hooks/useTodos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SELECT_CLASSES =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function filtersFromParams(p: URLSearchParams): TodoFilters {
  const filters: TodoFilters = {};
  const completed = p.get('completed');
  if (completed === 'true' || completed === 'false') filters.completed = completed === 'true';
  const priority = p.get('priority') as Priority | null;
  if (priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH')
    filters.priority = priority;
  const tag = p.get('tag');
  if (tag) filters.tag = tag;
  const sort = p.get('sort');
  if (sort === 'createdAt' || sort === 'dueDate' || sort === 'priority') filters.sort = sort;
  return filters;
}

const PRIORITY_VARIANTS: Record<Priority, 'secondary' | 'default' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'destructive',
};

export function TodosPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { data: todos = [], isLoading, error } = useTodos(filters);
  const { data: tags = [] } = useTags();

  const [editing, setEditing] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const del = useDeleteTodo();

  function updateParam(name: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(name);
    else next.set(name, value);
    setParams(next, { replace: true });
  }

  function performDelete() {
    const t = deleteTarget;
    if (!t) return;
    del.mutate(t.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setDeleteTarget(null);
        toast.error(err instanceof Error ? err.message : 'Delete failed');
      },
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h2>Todos</h2>
        <p className="text-sm text-muted-foreground">
          Plan, prioritise, and track what you need to do.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="completed-filter">Completed</Label>
            <select
              id="completed-filter"
              aria-label="completed filter"
              className={SELECT_CLASSES}
              value={params.get('completed') ?? ''}
              onChange={(e) => updateParam('completed', e.target.value || undefined)}
            >
              <option value="">any</option>
              <option value="false">open</option>
              <option value="true">done</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority-filter">Priority</Label>
            <select
              id="priority-filter"
              aria-label="priority filter"
              className={SELECT_CLASSES}
              value={params.get('priority') ?? ''}
              onChange={(e) => updateParam('priority', e.target.value || undefined)}
            >
              <option value="">any</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-filter">Tag</Label>
            <select
              id="tag-filter"
              aria-label="tag filter"
              className={SELECT_CLASSES}
              value={params.get('tag') ?? ''}
              onChange={(e) => updateParam('tag', e.target.value || undefined)}
            >
              <option value="">any</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort-filter">Sort</Label>
            <select
              id="sort-filter"
              aria-label="sort"
              className={SELECT_CLASSES}
              value={params.get('sort') ?? ''}
              onChange={(e) => updateParam('sort', e.target.value || undefined)}
            >
              <option value="">created (newest)</option>
              <option value="dueDate">due date</option>
              <option value="priority">priority</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3">Add a todo</h3>
          <TodoForm
            mode="create"
            tags={tags}
            onSubmit={() => undefined}
            key={editing ? 'create-disabled' : 'create'}
          />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Failed to load todos: {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <TodoList todos={todos} onEdit={setEditing} onDelete={setDeleteTarget} />
      )}

      {editing && (
        <EditTodoModal
          todo={editing}
          tags={tags}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete todo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" will be permanently removed.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function TodoList({
  todos,
  onEdit,
  onDelete,
}: {
  todos: Todo[];
  onEdit: (t: Todo) => void;
  onDelete: (t: Todo) => void;
}) {
  const toggle = useToggleCompletion();
  if (todos.length === 0)
    return <p className="text-sm text-muted-foreground">No todos.</p>;
  return (
    <ul className="grid gap-2">
      {todos.map((t) => (
        <li key={t.id} data-testid="todo-item">
          <Card>
            <CardContent className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                aria-label={`toggle ${t.title}`}
                checked={t.completed}
                onChange={(e) =>
                  toggle.mutate({ id: t.id, completed: e.target.checked })
                }
                className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong
                    className={cn(
                      'truncate',
                      t.completed && 'text-muted-foreground line-through',
                    )}
                  >
                    {t.title}
                  </strong>
                  <Badge variant={PRIORITY_VARIANTS[t.priority]}>
                    {t.priority}
                  </Badge>
                  {t.dueDate && (
                    <span className="text-sm text-muted-foreground">
                      due {t.dueDate}
                    </span>
                  )}
                </div>
                {t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(t)}
                  className="gap-1"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(t)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export interface TodoFormProps {
  mode: 'create' | 'edit';
  initial?: Partial<UpdateTodoRequest>;
  tags: { id: string; name: string }[];
  onSubmit: (body: CreateTodoRequest | UpdateTodoRequest) => void;
  submitting?: boolean;
}

export function TodoForm({ mode, initial, tags, onSubmit, submitting }: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'MEDIUM');
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [completed, setCompleted] = useState<boolean>(
    (initial as UpdateTodoRequest)?.completed ?? false,
  );

  const createMut = useCreateTodo();
  const idPrefix = mode === 'create' ? 'create' : 'edit';

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const body: CreateTodoRequest = {
      title: title.trim(),
      description: description || null,
      dueDate: dueDate || null,
      priority,
      tagIds,
    };
    if (mode === 'create') {
      createMut.mutate(body, {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setDueDate('');
          setPriority('MEDIUM');
          setTagIds([]);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Create failed');
        },
      });
    } else {
      onSubmit({ ...body, completed } as UpdateTodoRequest);
    }
  }

  const pending = submitting || createMut.isPending;

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          aria-label="title"
          placeholder="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          aria-label="description"
          placeholder="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-due`}>Due date</Label>
          <Input
            id={`${idPrefix}-due`}
            aria-label="due date"
            type="date"
            value={dueDate ?? ''}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
          <select
            id={`${idPrefix}-priority`}
            aria-label="priority"
            className={SELECT_CLASSES}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>
      {tags.length > 0 && (
        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Tags</legend>
          <div className="flex flex-wrap gap-3">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tagIds.includes(t.id)}
                  onChange={() => toggleTag(t.id)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Completed
        </label>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {mode === 'create' ? 'Add todo' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function EditTodoModal({
  todo,
  tags,
  onClose,
}: {
  todo: Todo;
  tags: { id: string; name: string }[];
  onClose: () => void;
}) {
  const update = useUpdateTodo();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-label="edit todo" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit todo</DialogTitle>
        </DialogHeader>
        <TodoForm
          mode="edit"
          tags={tags}
          initial={{
            title: todo.title,
            description: todo.description,
            dueDate: todo.dueDate,
            priority: todo.priority,
            tagIds: todo.tags.map((t) => t.id),
            completed: todo.completed,
          }}
          submitting={update.isPending}
          onSubmit={(body) =>
            update.mutate(
              { id: todo.id, body: body as UpdateTodoRequest },
              {
                onSuccess: onClose,
                onError: (err) =>
                  toast.error(
                    err instanceof Error ? err.message : 'Update failed',
                  ),
              },
            )
          }
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
