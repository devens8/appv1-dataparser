import type { Column, Dataset } from "@/types";
import { numericColumn } from "@/lib/csv";

export function numericColumns(dataset: Dataset): Column[] {
  return dataset.columns.filter((c) => c.type === "number");
}

export function columnValues(dataset: Dataset, index: number): number[] {
  return numericColumn(dataset.rows, index);
}

export function columnByName(
  dataset: Dataset,
  name: string,
): Column | undefined {
  return dataset.columns.find((c) => c.name === name);
}
