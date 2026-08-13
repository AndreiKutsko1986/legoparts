export type ProductColorId =
  | 'Red'
  | 'Blue'
  | 'Yellow'
  | 'Green'
  | 'White'
  | 'Black'
  | 'Light Bluish Gray'
  | 'Dark Bluish Gray'
  | 'Orange'
  | 'Dark Red'
  | 'Reddish Brown'
  | 'Tan'
  | 'Lime'
  | 'Bright Pink'
  | 'Dark Purple'
  | 'Medium Blue'
  | 'Dark Turquoise'
  | 'Transparent Red'
  | 'Transparent Green'
  | 'Transparent Blue'
  | 'Pearl Gold'
  | 'Flat Silver'
  | 'Chrome';

export type ProductColorOption = {
  id: ProductColorId;
  label: string;
  fill: string;
  border?: string;
  transparent?: boolean;
};

export const DEFAULT_PRODUCT_COLOR: ProductColorId = 'White';

export const NO_PRODUCT_COLOR_LABEL = 'Без цвета';

export const PRODUCT_COLORS: ProductColorOption[] = [
  { id: 'White', label: 'Белый', fill: '#ffffff', border: '#cbd5e1' },
  { id: 'Black', label: 'Черный', fill: '#05131d' },
  { id: 'Light Bluish Gray', label: 'Серый', fill: '#a0a5a9' },
  { id: 'Red', label: 'Красный', fill: '#c91a09' },
  { id: 'Blue', label: 'Синий', fill: '#0055bf' },
  { id: 'Yellow', label: 'Желтый', fill: '#f2cd37', border: '#c9a400' },
  { id: 'Green', label: 'Зеленый', fill: '#237841' },
  { id: 'Dark Bluish Gray', label: 'Темно-серый', fill: '#6c6e68' },
  { id: 'Orange', label: 'Оранжевый', fill: '#fe8a18' },
  { id: 'Dark Red', label: 'Темно-красный', fill: '#720e0f' },
  { id: 'Reddish Brown', label: 'Коричневый', fill: '#582a12' },
  { id: 'Tan', label: 'Бежевый', fill: '#d9c594', border: '#b8a06f' },
  { id: 'Lime', label: 'Салатовый', fill: '#bbe90b', border: '#8eb500' },
  { id: 'Bright Pink', label: 'Розовый', fill: '#f785b1' },
  { id: 'Dark Purple', label: 'Фиолетовый', fill: '#472f44' },
  { id: 'Medium Blue', label: 'Голубой', fill: '#5a93db' },
  { id: 'Dark Turquoise', label: 'Бирюзовый', fill: '#008f9b' },
  { id: 'Transparent Red', label: 'Прозрачно-красный', fill: 'rgba(201, 26, 9, 0.55)', transparent: true },
  { id: 'Transparent Green', label: 'Прозрачно-зеленый', fill: 'rgba(35, 120, 65, 0.55)', transparent: true },
  { id: 'Transparent Blue', label: 'Прозрачно-голубой', fill: 'rgba(90, 147, 219, 0.55)', transparent: true },
  { id: 'Pearl Gold', label: 'Золотой', fill: '#aa7f2e' },
  { id: 'Flat Silver', label: 'Серебряный', fill: '#898788' },
  { id: 'Chrome', label: 'Хромированный', fill: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 45%, #f8fafc 100%)' },
];

const colorById = new Map(PRODUCT_COLORS.map((color) => [color.id, color]));

export function getProductColorOption(colorId?: string | null): ProductColorOption {
  const match = colorById.get((colorId ?? DEFAULT_PRODUCT_COLOR) as ProductColorId);
  return match ?? colorById.get(DEFAULT_PRODUCT_COLOR)!;
}

export function normalizeProductColor(colorId?: string | null): ProductColorId {
  if (colorId && colorById.has(colorId as ProductColorId)) {
    return colorId as ProductColorId;
  }

  return DEFAULT_PRODUCT_COLOR;
}

export function parseStoredProductColor(colorId?: string | null): ProductColorId | null {
  if (!colorId?.trim()) {
    return null;
  }

  return normalizeProductColor(colorId);
}
