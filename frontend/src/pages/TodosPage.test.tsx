import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuth0Mock, withProviders } from '../test/utils';
import { TodosPage } from './TodosPage';

interface Call { url: string; method: string; body?: string }

const SAMPLE_TODOS = [
  {
    id: 't1',
    title: 'buy milk',
    description: null,
    dueDate: null,
    priority: 'MEDIUM',
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    tags: [{ id: 'tag1', name: 'home' }],
  },
];

describe('TodosPage', () => {
  let calls: Call[];

  beforeEach(() => {
    resetAuth0Mock();
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, method: init.method ?? 'GET', body: init.body as string | undefined });
        if (url.includes('/todos')) {
          return new Response(JSON.stringify(SAMPLE_TODOS));
        }
        if (url.includes('/tags')) {
          return new Response(JSON.stringify([{ id: 'tag1', name: 'home' }]));
        }
        return new Response('{}');
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders todo list', async () => {
    render(withProviders(<TodosPage />));
    expect(await screen.findByText('buy milk')).toBeInTheDocument();
    expect(screen.getByText(/#home/)).toBeInTheDocument();
  });

  it('shows empty state when no todos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/todos')) return new Response('[]');
        return new Response('[]');
      }),
    );
    render(withProviders(<TodosPage />));
    expect(await screen.findByText(/no todos/i)).toBeInTheDocument();
  });

  it('updates the URL when filters change', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.selectOptions(screen.getByLabelText('completed filter'), 'true');
    await waitFor(() => {
      const getCalls = calls.filter((c) => c.method === 'GET' && c.url.includes('/todos'));
      expect(getCalls.some((c) => c.url.includes('completed=true'))).toBe(true);
    });
  });

  it('toggles completion via the checkbox', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.click(screen.getByLabelText(/toggle buy milk/i));
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'PATCH' && c.url.includes('/completion'))).toBe(true),
    );
  });

  it('deletes a todo after confirmation', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: /confirm delete/i }),
    );
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  });

  it('skips delete when confirmation cancelled', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(calls.filter((c) => c.method === 'DELETE').length).toBe(0);
  });

  it('creates a new todo via the create form', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.type(screen.getByLabelText('title'), 'new task');
    await userEvent.click(screen.getByRole('button', { name: /add todo/i }));
    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST' && c.url.includes('/todos'));
      expect(post).toBeDefined();
      expect(JSON.parse(post!.body!).title).toBe('new task');
    });
  });

  it('opens edit dialog and submits an update', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit todo/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
  });

  it('closes edit dialog on cancel', async () => {
    render(withProviders(<TodosPage />));
    await screen.findByText('buy milk');
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    const dialog = await screen.findByRole('dialog', { name: /edit todo/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /edit todo/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('renders error alert when load fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/todos')) return new Response('boom', { status: 500 });
        return new Response('[]');
      }),
    );
    render(withProviders(<TodosPage />));
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load todos/i);
  });

  it('reads filters from URL search params', async () => {
    render(withProviders(<TodosPage />, { route: '/?completed=true&priority=HIGH&sort=dueDate&tag=tag1' }));
    await screen.findByText('buy milk');
    await waitFor(() => {
      const getCalls = calls.filter((c) => c.method === 'GET' && c.url.includes('/todos'));
      expect(
        getCalls.some(
          (c) =>
            c.url.includes('completed=true') &&
            c.url.includes('priority=HIGH') &&
            c.url.includes('sort=dueDate') &&
            c.url.includes('tag=tag1'),
        ),
      ).toBe(true);
    });
  });
});
