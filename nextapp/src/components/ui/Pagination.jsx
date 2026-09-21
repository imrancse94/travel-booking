'use client';

import './Pagination.css';

/** Page-number + prev/next pagination, driven by `{page,limit,total,totalPages}`. */
export function Pagination({ page, limit, total = 0, totalPages = 1, onPageChange }) {
  if (!total) return null;

  const pages = getPageList(page, totalPages || 1);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="ui-pagination">
      <span className="ui-pagination__summary">
        Showing {start}-{end} of {total}
      </span>
      <div className="ui-pagination__controls">
        <button
          type="button"
          className="ui-pagination__btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="ui-pagination__ellipsis">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`ui-pagination__btn ${p === page ? 'ui-pagination__btn--active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="ui-pagination__btn"
          disabled={page >= (totalPages || 1)}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getPageList(current, totalPages) {
  const delta = 1;
  const range = [];
  for (let i = Math.max(1, current - delta); i <= Math.min(totalPages, current + delta); i++) {
    range.push(i);
  }
  if (range[0] > 1) {
    if (range[0] > 2) range.unshift('...');
    range.unshift(1);
  }
  if (range[range.length - 1] < totalPages) {
    if (range[range.length - 1] < totalPages - 1) range.push('...');
    range.push(totalPages);
  }
  return range;
}

export default Pagination;
