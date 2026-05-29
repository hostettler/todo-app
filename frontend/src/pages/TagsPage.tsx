import { FormEvent, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '../api/client';
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from '../hooks/useTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Tag {
  id: string;
  name: string;
}

export function TagsPage() {
  const { data: tags = [], isLoading, error } = useTags();
  const createTag = useCreateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createTag.mutate(newName.trim(), { onSuccess: () => setNewName('') });
  }

  function performRename(value: string) {
    const target = renameTarget;
    if (!target) return;
    const next = value.trim();
    if (!next || next === target.name) {
      setRenameTarget(null);
      return;
    }
    setRenameError(null);
    renameTag.mutate(
      { id: target.id, name: next },
      {
        onSuccess: () => setRenameTarget(null),
        onError: (err) => {
          const message =
            err instanceof ApiError && err.status === 409
              ? `A tag named "${next}" already exists.`
              : err instanceof Error
                ? err.message
                : 'Rename failed';
          setRenameError(message);
          setRenameTarget(null);
          toast.error(message);
        },
      },
    );
  }

  function performDelete() {
    const target = deleteTarget;
    if (!target) return;
    deleteTag.mutate(target.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setDeleteTarget(null);
        toast.error(err instanceof Error ? err.message : 'Delete failed');
      },
    });
  }

  const createConflict =
    createTag.error instanceof ApiError && createTag.error.status === 409;

  return (
    <section className="space-y-6">
      <div>
        <h2>Tags</h2>
        <p className="text-sm text-muted-foreground">
          Organise todos with reusable labels.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-tag">New tag name</Label>
              <Input
                id="new-tag"
                aria-label="New tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="new tag"
              />
            </div>
            <Button type="submit" disabled={createTag.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
          {createConflict && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              A tag with that name already exists.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Failed to load tags: {(error as Error).message}
        </p>
      )}
      {renameError && (
        <p role="alert" className="text-sm text-destructive">
          {renameError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      ) : (
        <ul className="grid gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <span className="font-medium">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameError(null);
                        setRenameTarget(t);
                      }}
                      className="gap-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(t)}
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
      )}

      <RenameDialog
        target={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSubmit={performRename}
        submitting={renameTag.isPending}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be detached from any todos that use it. This cannot be undone.`
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

function RenameDialog({
  target,
  onClose,
  onSubmit,
  submitting,
}: {
  target: Tag | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
  submitting: boolean;
}) {
  const [value, setValue] = useState('');

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (open && target) {
          setValue(target.name);
        } else {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename tag</DialogTitle>
          <DialogDescription>
            Pick a new name for &quot;{target?.name ?? ''}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(value);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rename-tag">New name</Label>
            <Input
              id="rename-tag"
              aria-label="New name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
