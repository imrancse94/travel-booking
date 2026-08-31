'use client';

import './Table.css';

/**
 * Generic data table. `columns`: [{ key, header, render(row), sortable, width }].
 * Sorting is click-driven via `sort` ({key,dir}) + `onSortChange`; loading shows
 * skeleton rows; an empty `rows` array shows `emptyMessage`.
 */
export function Table({
  columns,
  rows,
  rowKey = (row) => row.id,
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'No records found.',
  sort,
  onSortChange,
  onRowClick,
}) {
  function handleSort(col) {
    if (!col.sortable || !onSortChange) return;
    const isSame = sort?.key === col.key;
    const nextDir = isSame && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ key: col.key, dir: nextDir });
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={col.sortable ? 'ui-table__th--sortable' : ''}
                onClick={() => handleSort(col)}
              >
                <span className="ui-table__th-content">
                  {col.header}
                  {col.sortable && (
                    <span className="ui-table__sort-icon">
                      {sort?.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="ui-table__skeleton-row">
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className="ui-table__skeleton-block" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="ui-table__empty">
                {emptyMessage}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'ui-table__row--clickable' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
