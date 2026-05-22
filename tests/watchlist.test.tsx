/**
 * Watchlist tests.
 *
 * Uses real AuthContext + WatchlistContext providers against a mocked
 * supabase client. Covers:
 *  - guest click on WatchlistButton triggers the login modal hook
 *  - authed click optimistically updates state and calls supabase.insert
 *  - failed insert reverts the optimistic state change
 *  - delete path when removing a previously-saved item
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../src/context/AuthContext';
import { WatchlistProvider, useWatchlist } from '../src/context/WatchlistContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import WatchlistButton from '../src/components/WatchlistButton';

// ── Supabase mock ────────────────────────────────────────────────────────

const TEST_USER = { id: 'user-1', email: 'test@test.com' };
// Mutable session controlling whether AuthContext reports a logged-in user
let mockSession: { user: typeof TEST_USER } | null = null;
// Mutable initial watchlist returned by the select-on-mount query
let initialWatchlist: Array<{ item_type: string; course_id: string | null; lesson_id: string | null }> = [];
// Error to return from insert/delete; null = success
let nextWriteError: { message: string } | null = null;

const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock('../src/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mockSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: (table: string) => {
      if (table === 'user_watchlist') {
        // Both initial select and toggle delete chain `.eq().eq()`. We expose a
        // thenable at every step so callers can await at any depth.
        const resolveSelect = () =>
          Promise.resolve({ data: initialWatchlist, error: null });
        const resolveDelete = () => {
          mockDelete();
          return Promise.resolve({ data: null, error: nextWriteError });
        };
        return {
          select: () => {
            // First .eq returns another chainable; both that and the next .eq
            // are thenables, so awaiting at either depth works.
            const second = {
              eq: () => resolveSelect(),
              then: (onFulfilled: (v: unknown) => unknown) =>
                resolveSelect().then(onFulfilled),
            };
            return { eq: () => second };
          },
          insert: (row: unknown) => {
            mockInsert(row);
            return Promise.resolve({ data: null, error: nextWriteError });
          },
          delete: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => resolveDelete(),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      // AuthContext also fetches the user's purchases on session restore.
      // These tests don't exercise that flow, so return an empty list.
      if (table === 'user_course_purchases') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  },
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WatchlistProvider>{children}</WatchlistProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

beforeEach(() => {
  mockSession = null;
  initialWatchlist = [];
  nextWriteError = null;
  mockInsert.mockClear();
  mockDelete.mockClear();
});

describe('WatchlistButton', () => {
  it('opens login modal when an unauthenticated user clicks', async () => {
    const onRequireLogin = vi.fn();
    render(
      <Providers>
        <WatchlistButton itemType="course" itemId="course-1" onRequireLogin={onRequireLogin} />
      </Providers>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onRequireLogin).toHaveBeenCalledTimes(1);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('inserts when an authed user saves an unsaved course', async () => {
    mockSession = { user: TEST_USER };
    render(
      <Providers>
        <WatchlistButton itemType="course" itemId="course-42" onRequireLogin={vi.fn()} />
      </Providers>,
    );

    // Wait for the WatchlistProvider's initial fetch to complete so toggle has
    // an up-to-date Set to work from
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false'));

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockInsert).toHaveBeenCalledTimes(1));
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: TEST_USER.id,
      item_type: 'course',
      course_id: 'course-42',
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('deletes when an authed user removes an already-saved item', async () => {
    mockSession = { user: TEST_USER };
    initialWatchlist = [{ item_type: 'course', course_id: 'course-1', lesson_id: null }];

    render(
      <Providers>
        <WatchlistButton itemType="course" itemId="course-1" onRequireLogin={vi.fn()} />
      </Providers>,
    );

    // Initially saved (from the seeded select result)
    await waitFor(() => expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'));

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('WatchlistProvider', () => {
  it('reverts the optimistic add when insert errors', async () => {
    mockSession = { user: TEST_USER };
    nextWriteError = { message: 'boom' };

    function Probe() {
      const { courses, toggle } = useWatchlist();
      return (
        <div>
          <span data-testid="count">{courses.size}</span>
          <button onClick={() => toggle('course-1')}>toggle</button>
        </div>
      );
    }

    render(
      <Providers>
        <Probe />
      </Providers>,
    );

    // Initial fetch completes — empty
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));

    // Suppress the expected console.error from the rollback path
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await userEvent.click(screen.getByText('toggle'));

    // After the failed insert resolves, the Set should be back to 0
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    errSpy.mockRestore();
  });
});
