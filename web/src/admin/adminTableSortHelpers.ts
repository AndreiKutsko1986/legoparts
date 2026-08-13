const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { sensitivity: 'base' });

export function compareActiveFirst<T extends { isActive: boolean }>(left: T, right: T) {
  return Number(right.isActive) - Number(left.isActive);
}

export function finalizeAdminTableSort<T extends { isActive: boolean }>(
  result: number,
  left: T,
  right: T,
  getAlphabeticalLabel: (item: T) => string,
) {
  if (result !== 0) {
    return result;
  }

  const activeResult = compareActiveFirst(left, right);
  if (activeResult !== 0) {
    return activeResult;
  }

  return compareText(getAlphabeticalLabel(left), getAlphabeticalLabel(right));
}
