import { BulletListStyle, OrderedListStyle } from './types';

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64];

export const fontOptions = [
  'Arial', 'Arial Black', 'Brush Script MT', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
  'Constantia', 'Corbel', 'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Gill Sans',
  'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Optima', 'Palatino Linotype', 'Segoe Print',
  'Segoe Script', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
];

export const colorPalette = [
  ['#000000', '#404040', '#808080', '#BFBFBF', '#FFFFFF'],
  ['#7F0E0E', '#B22222', '#E57373', '#F8BBD0', '#FFEBEE'],
  ['#7F3F00', '#D2691E', '#FFB74D', '#FFE0B2', '#FFF3E0'],
  ['#7F6A00', '#DAA520', '#FFD54F', '#FFF9C4', '#FFFDE7'],
  ['#2E7D32', '#4CAF50', '#81C784', '#C8E6C9', '#F1F8E9'],
  ['#00695C', '#26A69A', '#4DB6AC', '#B2DFDB', '#E0F2F1'],
  ['#01579B', '#2196F3', '#64B5F6', '#BBDEFB', '#E3F2FD'],
  ['#1A237E', '#3F51B5', '#7986CB', '#C5CAE9', '#E8EAF6'],
  ['#4A148C', '#9C27B0', '#BA68C8', '#E1BEE7', '#F3E5F5'],
  ['#880E4F', '#E91E63', '#F06292', '#F9C1D9', '#FCE4EC'],
];

export const bulletListStyles: BulletListStyle[] = [
  { name: 'Круг', value: 'circle' },
  { name: 'Нет', value: 'none' },
];

export const orderedListStyles: OrderedListStyle[] = [
  { value: 'decimal', level: 1, name: '1, 2, 3' },
];