import type { Product } from './api';

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartLineWithProduct = {
  product: Product;
  quantity: number;
};

const STORAGE_KEY = 'legoparts-cart';

export function loadCart(): CartLine[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((line: CartLine | { product?: { id: string }; quantity: number }) => {
        if ('productId' in line && line.productId) {
          return { productId: line.productId, quantity: line.quantity };
        }

        if ('product' in line && line.product?.id) {
          return { productId: line.product.id, quantity: line.quantity };
        }

        return null;
      })
      .filter((line): line is CartLine => line !== null && line.quantity > 0);
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(lines: CartLineWithProduct[]) {
  return lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}

export function addToCart(lines: CartLine[], product: Product, quantity = 1): CartLine[] {
  const existing = lines.find((line) => line.productId === product.id);
  const currentQty = existing?.quantity ?? 0;
  const nextQty = currentQty + quantity;

  if (nextQty > product.stockQuantity) {
    return lines;
  }

  if (existing) {
    return lines.map((line) =>
      line.productId === product.id ? { ...line, quantity: nextQty } : line,
    );
  }

  return [...lines, { productId: product.id, quantity }];
}

export function updateQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
  stockQuantity?: number,
): CartLine[] {
  const cappedQuantity =
    stockQuantity === undefined ? quantity : clampProductQuantity(quantity, stockQuantity, true);

  if (cappedQuantity <= 0) {
    return lines.filter((line) => line.productId !== productId);
  }

  return lines.map((line) =>
    line.productId === productId ? { ...line, quantity: cappedQuantity } : line,
  );
}

export function removeFromCart(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

export function cartQuantityForProduct(lines: CartLine[], productId: string) {
  return lines.find((line) => line.productId === productId)?.quantity ?? 0;
}

export function clampProductQuantity(quantity: number, stockQuantity: number, allowZero = false) {
  if (stockQuantity <= 0) {
    return 0;
  }

  const minQuantity = allowZero ? 0 : 1;
  return Math.min(Math.max(minQuantity, quantity), stockQuantity);
}

export function reconcileCartLines(lines: CartLine[], products: Product[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  let adjusted = false;
  const next: CartLine[] = [];

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) {
      adjusted = true;
      continue;
    }

    const quantity = clampProductQuantity(line.quantity, product.stockQuantity, true);
    if (quantity <= 0) {
      adjusted = true;
      continue;
    }

    if (quantity !== line.quantity) {
      adjusted = true;
    }

    next.push({ productId: line.productId, quantity });
  }

  if (next.length !== lines.length) {
    adjusted = true;
  }

  return { lines: next, adjusted };
}

export function hydrateCartLines(lines: CartLine[], products: Product[]): CartLineWithProduct[] {
  const { lines: reconciled } = reconcileCartLines(lines, products);
  const productMap = new Map(products.map((product) => [product.id, product]));

  return reconciled
    .map((line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        return null;
      }

      return { product, quantity: line.quantity };
    })
    .filter((line): line is CartLineWithProduct => line !== null);
}

export function canAddToCart(lines: CartLine[], product: Product, quantity = 1) {
  return cartQuantityForProduct(lines, product.id) + quantity <= product.stockQuantity;
}
