export interface EditorAttributes {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  color?: string;
  highlight?: string | null;
  textAlign?: 'left' | 'right' | 'center' | 'justify';
  bulletList?: boolean;
  orderedList?: boolean;

  // ✨ Новые поля для абзацев
  indent?: number;              // текущий отступ (кол-во шагов)
  indentLeft?: number;          // отступ слева
  indentRight?: number;         // отступ справа
  indentFirstLine?: number;     // отступ первой строки
  spacingBefore?: number;       // интервал перед абзацем
  spacingAfter?: number;        // интервал после абзаца
  lineHeight?: number;          // межстрочный интервал
}

export type FontOption = string;

export type FontSize = number;

export interface BulletListStyle {
  value: string;
  name: string;
}

export interface OrderedListStyle {
  value: string;
  level: number;
  name: string;
}