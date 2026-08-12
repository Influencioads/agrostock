import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-backed multi-select filter state.
 *
 * Every facet lives in the query string, which is what makes the whole panel
 * work: results refresh the moment a box is ticked (the query key changes, so
 * React Query refetches), the back button walks the filter history, and a
 * narrowed view is a link someone can paste to a colleague.
 *
 * A multi-select facet is ONE comma-separated param (`?country=India,Turkey`)
 * rather than a repeated key. That keeps the API's `Record<string, string>`
 * query parsing intact, keeps a shared URL readable, and — because a single
 * value is just a list of one — leaves every deep link the site already emits
 * (`/market?categoryId=…`, `/market?market=kandla`) meaning what it always did.
 */

/** Params that are not filters, so they never reach the badge count. */
export const NON_FILTER_PARAMS = ['sort', 'page', 'view'] as const;

/**
 * What Clear all keeps. `sort`/`view` are how the buyer wants results
 * *presented*, not what they want to see — resetting them is an unasked-for
 * change. `page` is deliberately absent: clearing filters returns you to page 1.
 */
const PRESERVED_ON_CLEAR = ['sort', 'view'] as const;

/**
 * A taxonomy pick travels as a stable id plus its human-readable name. Map the
 * name to its id twin so the pair counts once — and count the NAME only when the
 * id is absent, because a deep link may legitimately carry either one alone.
 */
const ID_TWIN: Record<string, string> = { category: 'categoryId', subcategory: 'subcategoryId' };

/** `"a,b"` → `['a','b']`; blanks and duplicates dropped. */
export function splitValues(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
}

/** `['a','b']` → `"a,b"`; an empty selection is `null`, i.e. drop the param. */
export function joinValues(values: string[]): string | null {
  const picked = [...new Set(values.map((s) => s.trim()).filter(Boolean))];
  return picked.length ? picked.join(',') : null;
}

/** Add or remove one value from a selection, order preserved. */
export function toggleValue(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

/**
 * How many filters are on — the badge on the collapsed mobile panel, so an
 * active filter is never hidden behind a closed disclosure.
 *
 * Each value of a multi-select counts separately (three countries is three
 * filters), `sort`/`page` do not count at all, and an id param is skipped in
 * favour of its human-readable twin so one choice is never counted twice.
 */
export function countActiveFilters(params: URLSearchParams): number {
  let n = 0;
  for (const [key, value] of params.entries()) {
    if (!value) continue;
    if ((NON_FILTER_PARAMS as readonly string[]).includes(key)) continue;
    const twin = ID_TWIN[key];
    if (twin && params.get(twin)) continue;
    n += splitValues(value).length;
  }
  return n;
}

export interface FilterParams {
  /** The raw params, for anything the helpers below do not cover. */
  params: URLSearchParams;
  /** Selected values of a multi-select facet. */
  values: (key: string) => string[];
  /** Single-value read (search box, price bounds, sort). */
  value: (key: string) => string;
  /** Is this box ticked? */
  has: (key: string, value: string) => boolean;
  /** Tick / untick one box. */
  toggle: (key: string, value: string) => void;
  /** Replace a whole selection. */
  setValues: (key: string, values: string[]) => void;
  /** Write a single-value param; `null` removes it. */
  setValue: (key: string, value: string | null) => void;
  /** Several writes as ONE history entry — paired params, dependent resets. */
  patch: (mutate: (next: URLSearchParams) => void) => void;
  /** Swap the whole query string — for folding legacy deep-link params in. */
  replaceAll: (next: URLSearchParams) => void;
  /** Drop every filter, keeping sort/view (they are not filters). */
  clearAll: () => void;
  /** Badge count for the collapsed mobile panel. */
  activeCount: number;
}

export function useFilterParams(): FilterParams {
  const [params, setParams] = useSearchParams();

  // `replace: true` throughout: ticking six boxes should be six *states* you can
  // walk back through, but not six entries you have to press Back through to
  // leave the page. Router history keeps the page-level entry either way.
  const commit = useCallback(
    (next: URLSearchParams) => setParams(next, { replace: true }),
    [setParams],
  );

  /**
   * Any filter write resets to page 1. Landing on page 4 of a result set that
   * just shrank to one page is a blank grid that looks like "no matches".
   * Paging itself obviously does not reset.
   */
  const patch = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      commit(next);
    },
    [params, commit],
  );

  const setValue = useCallback(
    (key: string, value: string | null) =>
      patch((next) => {
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
      }),
    [patch],
  );

  const setValues = useCallback(
    (key: string, values: string[]) => setValue(key, joinValues(values)),
    [setValue],
  );

  const values = useCallback((key: string) => splitValues(params.get(key)), [params]);

  const toggle = useCallback(
    (key: string, value: string) => setValues(key, toggleValue(splitValues(params.get(key)), value)),
    [params, setValues],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    for (const key of PRESERVED_ON_CLEAR) {
      const kept = params.get(key);
      if (kept) next.set(key, kept);
    }
    commit(next);
  }, [params, commit]);

  const activeCount = useMemo(() => countActiveFilters(params), [params]);

  return {
    params,
    values,
    value: (key: string) => params.get(key) ?? '',
    has: (key: string, value: string) => splitValues(params.get(key)).includes(value),
    toggle,
    setValues,
    setValue,
    patch,
    replaceAll: commit,
    clearAll,
    activeCount,
  };
}
