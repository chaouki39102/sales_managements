// DataTable/internal/usePagination.ts — pagination (server/client)
// Extracted verbatim from the DataTable component body (no behaviour change).

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { buildPageNumbers } from '../utils';
import type { ResolvedProps } from './resolveProps';
import type { URLState } from './useDataTableState';
import type { SearchFilterSortState } from './useSearchFilterSort';
import type { RowPipelineState } from './useRowPipeline';

type Params<T> =
  Pick<ResolvedProps<T>, 'pagination'>
  & { url: URLState; isQuickFiltered: boolean; quickFilterTotal: number }
  & Pick<SearchFilterSortState<T>, 'isServerPaged' | 'localPage' | 'localPerPage' | 'setLocalPage' | 'setLocalPerPage'>
  & Pick<RowPipelineState<T>, 'processedData'>;

export function usePagination<T>(p: Params<T>) {
  const {
    pagination, url, isQuickFiltered, quickFilterTotal, isServerPaged, localPage,
    localPerPage, setLocalPage, setLocalPerPage, processedData,
  } = p;

  // ── Pagination (state مُعرَّف أعلاه قبل filters) ────────────────────────

  const paginationRef = useRef(pagination);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);
  const lastPageRef = useRef(1);

  const curPage = isServerPaged ? pagination!.page : localPage;
  const perPage = isServerPaged ? pagination!.perPage : localPerPage;

  const total = isServerPaged ? pagination!.total : isQuickFiltered ? quickFilterTotal : processedData.length;
  const lastPage = isServerPaged
    ? pagination!.lastPage
    : Math.max(1, Math.ceil((isQuickFiltered ? quickFilterTotal : processedData.length) / localPerPage));

  useEffect(() => {
    lastPageRef.current = lastPage;
  }, [lastPage]);

  const goToPage = useCallback(
    (p: number) => {
      const c = Math.max(1, Math.min(p, lastPageRef.current));
      if (isServerPaged) paginationRef.current!.onPage(c);
      else setLocalPage(c);
      url.writePage(c);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
    [isServerPaged, url],
  );

  const changePerPage = useCallback(
    (n: number) => {
      if (isServerPaged) {
        paginationRef.current!.onPerPage(n);
        paginationRef.current!.onPage(1);
      } else {
        setLocalPerPage(n);
        setLocalPage(1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs / state setters from sibling hooks are stable
    [isServerPaged],
  );

  const pageNumbers = useMemo(() => buildPageNumbers(curPage, lastPage), [curPage, lastPage]);

  return { curPage, perPage, total, lastPage, goToPage, changePerPage, pageNumbers };
}

export type PaginationState<T> = ReturnType<typeof usePagination<T>>;
