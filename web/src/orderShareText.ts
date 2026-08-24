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

export async function openViberShare(text: string): Promise<'shared' | 'clipboard' | 'cancelled'> {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // On mobile, Web Share API pre-fills the text in whichever app the user picks.
  if (isMobile && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
      // Fall through to clipboard approach on other errors.
    }
  }

  // Desktop or no Web Share API: copy text then open Viber chat.
  try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }

  if (isMobile) {
    window.location.assign(`viber://chat?number=%2B${TELEGRAM_ORDER_PHONE}`);
  } else {
    window.open(`viber://chat?number=%2B${TELEGRAM_ORDER_PHONE}`, '_blank', 'noopener,noreferrer');
  }
  return 'clipboard';
}
