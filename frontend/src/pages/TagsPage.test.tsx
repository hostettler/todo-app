import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAuth0Mock, withProviders } from '../test/utils';
import { TagsPage } from './TagsPage';

interface FetchCall {
  url: string;
  method: string;
  body?: string;
}

describe('TagsPage', () => {
  let calls: FetchCall[];
  let listResponse: () => Response;
  let mutationResponse: () => Response;

  beforeEach(() => {
    resetAuth0Mock();
    calls = [];
    listResponse = () => new Response('[]', { status: 200 });
    mutationResponse = () => new Response('{}', { status: 200 });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const method = init.method ?? 'GET';
        calls.push({ url, method, body: init.body as string | undefined });
        if (method === 'GET') return listResponse();
        return mutationResponse();
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openDeleteDialog() {
    await userEvent.click(
      screen.getByRole('button', { name: /^delete$/i }),
    );
    return screen.findByRole('alertdialog');
  }

  async function openRenameDialog() {
    await userEvent.click(
      screen.getByRole('button', { name: /^rename$/i }),
    );
    return screen.findByRole('dialog');
  }

  it('lists tags returned by the API', async () => {
    listResponse = () =>
      new Response(
        JSON.stringify([
          { id: '1', name: 'work' },
          { id: '2', name: 'home' },
        ]),
      );
    render(withProviders(<TagsPage />));
    expect(await screen.findByText('work')).toBeInTheDocument();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('creates a tag when the form is submitted', async () => {
    render(withProviders(<TagsPage />));
    await screen.findByRole('button', { name: /^add$/i });

    await userEvent.type(screen.getByLabelText(/new tag name/i), 'new');
    mutationResponse = () =>
      new Response(JSON.stringify({ id: 'n', name: 'new' }), { status: 201 });
    listResponse = () => new Response(JSON.stringify([{ id: 'n', name: 'new' }]));
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const postCall = calls.find((c) => c.method === 'POST')!;
    expect(postCall.url).toContain('/tags');
    expect(JSON.parse(postCall.body!)).toEqual({ name: 'new' });
  });

  it('surfaces 409 from create as an inline duplicate message', async () => {
    render(withProviders(<TagsPage />));
    await screen.findByRole('button', { name: /^add$/i });

    await userEvent.type(screen.getByLabelText(/new tag name/i), 'dup');
    mutationResponse = () =>
      new Response(JSON.stringify({ code: 'CONFLICT' }), { status: 409 });
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('ignores blank tag names', async () => {
    render(withProviders(<TagsPage />));
    await screen.findByRole('button', { name: /^add$/i });
    const before = calls.length;
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(calls.length).toBe(before);
  });

  it('renames a tag through the rename dialog', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openRenameDialog();
    const input = within(dialog).getByLabelText(/new name/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'career');
    mutationResponse = () =>
      new Response(JSON.stringify({ id: '1', name: 'career' }));
    listResponse = () =>
      new Response(JSON.stringify([{ id: '1', name: 'career' }]));
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(JSON.parse(put.body!)).toEqual({ name: 'career' });
  });

  it('surfaces 409 on rename as an inline error', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openRenameDialog();
    const input = within(dialog).getByLabelText(/new name/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'career');
    mutationResponse = () => new Response('{}', { status: 409 });
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('does not rename when the dialog is cancelled', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openRenameDialog();
    const before = calls.length;
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(calls.length).toBe(before);
  });

  it('does not rename when the new value equals the current name', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openRenameDialog();
    const before = calls.length;
    await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));
    expect(calls.length).toBe(before);
  });

  it('deletes a tag after confirmation', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openDeleteDialog();
    mutationResponse = () => new Response(null, { status: 204 });
    listResponse = () => new Response('[]');
    await userEvent.click(
      within(dialog).getByRole('button', { name: /confirm delete/i }),
    );

    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  });

  it('skips delete when confirmation is cancelled', async () => {
    listResponse = () => new Response(JSON.stringify([{ id: '1', name: 'work' }]));
    render(withProviders(<TagsPage />));
    await screen.findByText('work');

    const dialog = await openDeleteDialog();
    const before = calls.length;
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(calls.filter((c) => c.method === 'DELETE').length).toBe(0);
    expect(calls.length).toBe(before);
  });

  it('renders an alert when the list query fails', async () => {
    listResponse = () => new Response('boom', { status: 500 });
    render(withProviders(<TagsPage />));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /failed to load tags/i,
    );
  });
});
