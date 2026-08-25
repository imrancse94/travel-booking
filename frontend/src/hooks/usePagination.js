import { useCallback, useState } from 'react';

/**
 * Manages page/limit state for a paginated list. Pairs with the
 * `{ page, limit, total, totalPages }` envelope returned by list endpoints
 * (see backend/src/utils/apiResponse.js `paginated()`) and the <Pagination/> component.
 */
export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);

  const setLimit = useCallback((nextLimit) => {
    setLimitState(nextLimit);
    setPage(1);
  }, []);

  const reset = useCallback(() => setPage(1), []);

  return { page, limit, setPage, setLimit, reset };
}

export default usePagination;
