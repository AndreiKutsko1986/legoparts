import type { AdminProduct } from '../adminApi';
import { productDisplayNameEn, productDisplayNameRu } from '../productColorFromName';

export type ProductImportRow = {
  id?: string;
  sku: string;
  partNumber?: string;
  name?: string;
  nameRu?: string;
  description?: string;
  color?: string;
  categoryName?: string;
  subCategoryName?: string;
  price?: number;
  initialQuantity?: number;
  stockQuantity?: number;
  popularityRating?: number;
  imageUrl?: string;
  isActive?: boolean;
};

export type ProductImportResult = {
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
};

const HEADER_MAP: Record<string, keyof ProductImportRow> = {
  id: 'id',
  'id товара': 'id',
  sku: 'sku',
  артикул: 'partNumber',
  'part number': 'partNumber',
  partnumber: 'partNumber',
  'название en': 'name',
  'название (en)': 'name',
  name: 'name',
  'название ru': 'nameRu',
  'название (ru)': 'nameRu',
  nameru: 'nameRu',
  описание: 'description',
  description: 'description',
  цвет: 'color',
  color: 'color',
  категория: 'categoryName',
  category: 'categoryName',
  categoryname: 'categoryName',
  подкатегория: 'subCategoryName',
  subcategory: 'subCategoryName',
  subcategoryname: 'subCategoryName',
  цена: 'price',
  price: 'price',
  'начальное кол-во': 'initialQuantity',
  'начальное количество': 'initialQuantity',
  initialquantity: 'initialQuantity',
  'на складе': 'stockQuantity',
  stockquantity: 'stockQuantity',
  склад: 'stockQuantity',
  популярность: 'popularityRating',
  popularityrating: 'popularityRating',
  'url изображения': 'imageUrl',
  imageurl: 'imageUrl',
  изображение: 'imageUrl',
  активен: 'isActive',
  isactive: 'isActive',
  active: 'isActive',
};

const EXPORT_HEADERS = [
  'ID',
  'SKU',
  'Артикул',
  'Название EN',
  'Название RU',
  'Описание',
  'Цвет',
  'Категория',
  'Подкатегория',
  'Цена',
  'Начальное кол-во',
  'На складе',
  'Продано',
  'Популярность',
  'URL изображения',
  'Активен',
] as const;

function normalizeHeader(value: string) {
  return value
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseBooleanCell(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'да', 'активен', 'active'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'нет', 'неактивен', 'inactive'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumberCell(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value).trim().replace(',', '.');
  if (normalized === '') {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStringCell(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text === '' ? undefined : text;
}

function buildExportRows(products: AdminProduct[]): string[][] {
  const rows: string[][] = [Array.from(EXPORT_HEADERS)];

  for (const product of products) {
    rows.push([
      product.id,
      product.sku,
      product.partNumber,
      productDisplayNameEn(product.name),
      productDisplayNameRu(product.nameRu),
      product.description,
      product.color,
      product.categoryName,
      product.subCategoryName,
      String(product.price),
      String(product.initialQuantity),
      String(product.stockQuantity),
      String(product.soldQuantity),
      String(product.popularityRating),
      product.imageUrl ?? '',
      product.isActive ? 'Да' : 'Нет',
    ]);
  }

  return rows;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildExportFilename(extension: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `products-${stamp}.${extension}`;
}

export async function exportProductsToExcel(products: AdminProduct[]) {
  const XLSX = await import('xlsx');
  const rows = buildExportRows(products);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    buildExportFilename('xlsx'),
  );
}

function mapRowRecord(record: Record<string, unknown>): ProductImportRow | null {
  const mapped: Partial<ProductImportRow> = {};

  for (const [header, value] of Object.entries(record)) {
    const normalized = normalizeHeader(header);
    if (normalized === 'продано' || normalized === 'soldquantity' || normalized === 'sold quantity') {
      continue;
    }

    const key = HEADER_MAP[normalized];
    if (!key) {
      continue;
    }

    if (key === 'isActive') {
      const parsed = parseBooleanCell(value);
      if (parsed !== undefined) {
        mapped.isActive = parsed;
      }
      continue;
    }

    if (['price', 'initialQuantity', 'stockQuantity', 'popularityRating'].includes(key)) {
      const parsed = parseNumberCell(value);
      if (parsed !== undefined) {
        mapped[key] = parsed as never;
      }
      continue;
    }

    const parsed = parseStringCell(value);
    if (parsed !== undefined) {
      mapped[key] = parsed as never;
    }
  }

  const sku = mapped.sku?.trim() ?? '';
  if (!sku) {
    return null;
  }

  return { ...mapped, sku };
}

function sheetRowsToImportRows(matrix: unknown[][]): ProductImportRow[] {
  if (matrix.length === 0) {
    return [];
  }

  const headerRow = matrix[0].map((cell) => String(cell ?? ''));
  const rows: ProductImportRow[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const line = matrix[rowIndex];
    if (!line || line.every((cell) => cell === undefined || cell === null || String(cell).trim() === '')) {
      continue;
    }

    const record: Record<string, unknown> = {};
    headerRow.forEach((header, columnIndex) => {
      if (!header.trim()) {
        return;
      }
      record[header] = line[columnIndex];
    });

    const mapped = mapRowRecord(record);
    if (mapped) {
      rows.push(mapped);
    }
  }

  return rows;
}

export async function parseProductsSpreadsheet(file: File): Promise<ProductImportRow[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  return sheetRowsToImportRows(matrix);
}

export function formatProductImportResult(result: ProductImportResult) {
  const parts = [
    `Добавлено: ${result.createdCount}`,
    `Обновлено: ${result.updatedCount}`,
    `Ошибок: ${result.failedCount}`,
  ];

  if (result.errors.length > 0) {
    parts.push(result.errors.slice(0, 8).join('\n'));
    if (result.errors.length > 8) {
      parts.push(`... и ещё ${result.errors.length - 8} ошибок`);
    }
  }

  return parts.join('\n');
}
