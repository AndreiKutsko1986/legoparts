import { PRODUCT_COLORS, normalizeProductColor, type ProductColorId } from './admin/productColors';

const NO_COLOR_TOKENS = new Set([
  'без цвета',
  'no color',
  'any color',
  'no color/any color',
  '[no color/any color]',
  'без цвета/любой',
]);

const EXTRA_ALIASES: Record<string, ProductColorId> = {
  'желтый': 'Yellow',
  'жёлтый': 'Yellow',
  'зеленый': 'Green',
  'зелёный': 'Green',
  'черный': 'Black',
  'чёрный': 'Black',
  'темно-серый': 'Dark Bluish Gray',
  'тёмно-серый': 'Dark Bluish Gray',
  'светло-серый': 'Light Bluish Gray',
  'темно-красный': 'Dark Red',
  'коричневый': 'Reddish Brown',
  'салатовый': 'Lime',
  'лайм': 'Lime',
  'розовый': 'Bright Pink',
  'фиолетовый': 'Dark Purple',
  'голубой': 'Medium Blue',
  'бирюзовый': 'Dark Turquoise',
  'прозрачный голубой': 'Transparent Blue',
  'прозрачный неоново-зеленый': 'Transparent Green',
  'прозрачный ярко-зеленый': 'Transparent Green',
  'прозрачный коричневый': 'Reddish Brown',
  'жемчужное золото': 'Pearl Gold',
  'золотой': 'Pearl Gold',
  'серебряный': 'Flat Silver',
  'хромированный': 'Chrome',
  'trans-light blue': 'Transparent Blue',
  'trans-neon green': 'Transparent Green',
  'trans-bright green': 'Transparent Green',
  'trans-red': 'Transparent Red',
  'trans-green': 'Transparent Green',
  'dark brown': 'Reddish Brown',
};

const colorTokenLookup = new Map<string, ProductColorId>();

function normalizeColorToken(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

for (const color of PRODUCT_COLORS) {
  colorTokenLookup.set(normalizeColorToken(color.id), color.id);

  const labelMatch = color.label.match(/^(.+?)\s*\((.+)\)$/);
  if (labelMatch) {
    colorTokenLookup.set(normalizeColorToken(labelMatch[1]), color.id);
    colorTokenLookup.set(normalizeColorToken(labelMatch[2]), color.id);
  } else {
    colorTokenLookup.set(normalizeColorToken(color.label), color.id);
  }
}

for (const [alias, colorId] of Object.entries(EXTRA_ALIASES)) {
  colorTokenLookup.set(normalizeColorToken(alias), colorId);
}

function extractColorTokenFromName(name: string) {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match?.[1]?.trim() ?? null;
}

function isRecognizedColorToken(token: string) {
  const normalized = normalizeColorToken(token);
  if (NO_COLOR_TOKENS.has(normalized)) {
    return true;
  }

  return colorTokenLookup.has(normalized);
}

export function stripThicknessFromProductName(name: string): string {
  let result = name
    .replace(/,?\s*толстая/gi, '')
    .replace(/,?\s*тонкая/gi, '')
    .replace(/,?\s*Thick\b/gi, '')
    .replace(/,?\s*Thin\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ', ');

  return result.trim().replace(/,\s*$/, '');
}

export function normalizeProductName(name: string): string {
  return stripThicknessFromProductName(stripColorFromProductName(name));
}

export function stripColorFromProductName(name: string): string {
  const token = extractColorTokenFromName(name);
  if (!token || !isRecognizedColorToken(token)) {
    return name;
  }

  return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

export function productDisplayName(nameRu: string, name: string): string {
  if (nameRu.trim()) {
    return normalizeProductName(nameRu);
  }

  return normalizeProductName(name);
}

export function productDisplayNameEn(name: string): string {
  return normalizeProductName(name);
}

export function productDisplayNameRu(nameRu: string): string {
  return normalizeProductName(nameRu);
}

function resolveToken(token: string): ProductColorId | null {
  const normalized = normalizeColorToken(token);
  if (NO_COLOR_TOKENS.has(normalized)) {
    return null;
  }

  return colorTokenLookup.get(normalized) ?? null;
}

export function resolveProductColorFromName(nameRu: string, name: string): ProductColorId | null {
  for (const field of [nameRu, name]) {
    if (!field.trim()) {
      continue;
    }

    const token = extractColorTokenFromName(field);
    if (!token) {
      continue;
    }

    const resolved = resolveToken(token);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function resolveProductDisplayColor(
  color: string | null | undefined,
  nameRu: string,
  name: string,
): ProductColorId | null {
  const fromName = resolveProductColorFromName(nameRu, name);
  if (fromName) {
    return fromName;
  }

  if (!color?.trim()) {
    return null;
  }

  return normalizeProductColor(color);
}

export function productMatchesColorFilter(
  nameRu: string,
  name: string,
  selectedColor: ProductColorId,
  color?: string | null,
): boolean {
  return resolveProductDisplayColor(color, nameRu, name) === selectedColor;
}
