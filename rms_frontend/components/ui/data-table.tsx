"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const hasReactTable = typeof useReactTable === "function" && typeof getCoreRowModel === "function";

  if (!hasReactTable) {
    return (
      <div className="rounded-md border overflow-x-auto min-w-0 scrollbar-thin">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={(col as any).id || (col as any).accessorKey || idx}>
                  {typeof col.header === "string" ? col.header : "Column"}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row: any, rIdx) => (
                <TableRow key={row.id || rIdx}>
                  {columns.map((col, cIdx) => {
                    const key = (col as any).accessorKey;
                    return (
                      <TableCell key={cIdx}>
                        {key ? String(row[key] ?? "-") : "-"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: typeof getPaginationRowModel === "function" ? getPaginationRowModel() : undefined,
    enableRowSelection,
    state: {
      rowSelection,
    },
    onRowSelectionChange,
  });

  return (
    <div className="rounded-md border overflow-x-auto min-w-0 scrollbar-thin">
      <Table className="min-w-[600px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
