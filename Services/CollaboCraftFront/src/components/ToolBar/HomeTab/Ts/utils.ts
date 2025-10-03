import { FONT_SIZES } from './constants';

export function increaseFontSize(currentSize: number): number {
  for (let size of FONT_SIZES) {
    if (size > currentSize) return size;
  }
  return FONT_SIZES[FONT_SIZES.length - 1];
}

export function decreaseFontSize(currentSize: number): number {
  for (let i = FONT_SIZES.length - 1; i >= 0; i--) {
    if (FONT_SIZES[i] < currentSize) return FONT_SIZES[i];
  }
  return FONT_SIZES[0];
}