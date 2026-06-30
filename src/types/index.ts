export type ColumnType = "number" | "string" | "date";

export interface Column {
  name: string;
  type: ColumnType;
  index: number;
}

export type CellValue = number | string | null;

export interface Dataset {
  id: string;
  name: string;
  createdAt: number;
  columns: Column[];
  /** Row-major matrix aligned to `columns`. */
  rows: CellValue[][];
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  /** Tailwind-ish accent identifier used for the workspace card/avatar. */
  color: string;
  createdAt: number;
  updatedAt: number;
  datasets: Dataset[];
  activeDatasetId: string | null;
}
