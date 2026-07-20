import type { ReactNode } from 'react';
import { cn } from './cn';

export interface TableColumn<Row> {
  key: string;
  header: string;
  render?: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  getKey?: (row: Row, index: number) => string | number;
  className?: string;
}

export function Table<Row extends Record<string, unknown>>({
  columns,
  rows,
  getKey,
  className,
}: TableProps<Row>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-3 py-3', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getKey ? getKey(row, i) : i} className="border-b border-surface-border/70 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-3 text-ink',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}
                >
                  {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
