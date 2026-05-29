import { describe, expect, it } from 'vitest';
import { buildQuery } from './useTodos';

describe('buildQuery', () => {
  it('returns empty string when no filters', () => {
    expect(buildQuery({})).toBe('');
  });

  it('encodes every filter, including booleans', () => {
    const q = buildQuery({ completed: false, priority: 'HIGH', tag: 't1', sort: 'dueDate' });
    expect(q).toBe('?completed=false&priority=HIGH&tag=t1&sort=dueDate');
  });

  it('encodes completed=true', () => {
    expect(buildQuery({ completed: true })).toBe('?completed=true');
  });
});
