import type { ReactNode } from 'react';

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  width?: string;
};

export type TableProps<T> = {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
};

export function Table<T>({ columns, rows, rowKey, caption }: TableProps<T>) {
  return (
    <table className="table">
      {caption && <caption className="muted">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.header} style={col.width ? { width: col.width } : undefined}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td key={col.header}>{col.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
