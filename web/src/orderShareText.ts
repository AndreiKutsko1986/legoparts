import type { CartLineWithProduct } from './cart';
import { cartTotal } from './cart';
import { formatPrice } from './labels';
import { productDisplayName } from './productColorFromName';

export function buildOrderShareText(
  lines: CartLineWithProduct[],
  customerName: string,
  notes: string,
): string {
  const itemLines = lines.map((line, index) => {
    const name = productDisplayName(line.product.nameRu, line.product.name);
    const unitPrice = formatPrice(line.product.price);
    const lineTotal = formatPrice(line.product.price * line.quantity);
    const partNumber = line.product.partNumber?.trim();
    const partLabel = partNumber ? `, № ${partNumber}` : '';

    return `${index + 1}. ${name} (${line.product.sku}${partLabel}) — ${line.quantity} шт. × ${unitPrice} = ${lineTotal}`;
  });

  const parts = ['Заказ Legoparts', '', `Имя: ${customerName.trim()}`];

  if (notes.trim()) {
    parts.push(`Комментарий: ${notes.trim()}`);
  }

  parts.push('', 'Товары:', ...itemLines, '', `Итого: ${formatPrice(cartTotal(lines))}`);

  return parts.join('\n');
}

export const TELEGRAM_ORDER_PHONE = '375447972716';

export function buildTelegramShareUrl(text: string) {
  return `https://t.me/+${TELEGRAM_ORDER_PHONE}?text=${encodeURIComponent(text)}`;
}

export function openTelegramShare(text: string) {
  const encoded = encodeURIComponent(text);
  const webUrl = buildTelegramShareUrl(text);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.assign(`tg://resolve?phone=${TELEGRAM_ORDER_PHONE}&text=${encoded}`);
    return;
  }

  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

export function openViberShare() {
  // Viber's URL scheme does not support pre-filling message text,
  // so the caller must copy the text to clipboard before calling this.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.assign(`viber://chat?number=%2B${TELEGRAM_ORDER_PHONE}`);
    return;
  }

  window.open(`viber://chat?number=%2B${TELEGRAM_ORDER_PHONE}`, '_blank', 'noopener,noreferrer');
}
