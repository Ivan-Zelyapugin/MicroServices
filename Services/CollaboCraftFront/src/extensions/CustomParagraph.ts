// src/extensions/CustomParagraph.ts
import Paragraph from '@tiptap/extension-paragraph';
import { mergeAttributes } from '@tiptap/core';

const DEFAULT_TAB = 47;
export const CustomParagraph = Paragraph.extend({
  // addAttributes возвращает новые атрибуты + родительские
  addAttributes() {
    return {
      ...this.parent?.(),

      // шаговый отступ (кол-во шагов, 1 шаг = 24px — можно изменить)
      indent: {
        default: 0,
        parseHTML: element => {
          const ml = element.style.marginLeft;
          if (!ml) return 0;
          return Math.round(parseFloat(ml)) / 24;
        },
      },

      // явные пиксельные отступы (если задаём через модалку)
      indentLeft: {
        default: 0,
        parseHTML: element => parseFloat(element.style.marginLeft || '0') || 0,
      },
      indentRight: {
        default: 0,
        parseHTML: element => parseFloat(element.style.marginRight || '0') || 0,
      },

      // отступ первой строки в px
      indentFirstLine: {
        default: 0,
        parseHTML: element => parseFloat(element.style.textIndent || '0') || 0,
      },

      spacingBefore: {
        default: 0,
        parseHTML: element => parseFloat(element.style.marginTop || '0') || 0,
      },
      spacingAfter: {
        default: 0,
        parseHTML: element => parseFloat(element.style.marginBottom || '0') || 0,
      },

      lineHeight: {
        default: 1.5,
        parseHTML: element => parseFloat(element.style.lineHeight || '1.5') || 1.5,
      },
    };
  },

  // собираем итоговый style в одном месте, чтобы не затирать другие атрибуты
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as Record<string, any>;
    const styles: string[] = [];

    // Приоритет: если задан indentLeft (пиксели) — используем его,
    // иначе используем шаговый indent (steps * 24px)
    if (attrs.indentLeft && attrs.indentLeft > 0) {
      styles.push(`margin-left: ${attrs.indentLeft }px`);
    } else if (attrs.indent && attrs.indent > 0) {
      styles.push(`margin-left: ${attrs.indent * 24}px`);
    }

    if (attrs.indentRight && attrs.indentRight > 0) {
      styles.push(`margin-right: ${attrs.indentRight }px`);
    }

    if (attrs.indentFirstLine && attrs.indentFirstLine > 0) {
      styles.push(`text-indent: ${attrs.indentFirstLine}px`);
    }

    if (attrs.lineHeight) {
      styles.push(`line-height: ${attrs.lineHeight}`);
    }

    if (attrs.spacingBefore && attrs.spacingBefore > 0) {
      styles.push(`margin-top: ${attrs.spacingBefore}px`);
    }

    if (attrs.spacingAfter && attrs.spacingAfter > 0) {
      styles.push(`margin-bottom: ${attrs.spacingAfter}px`);
    }

    const styleString = styles.join('; ');

    return ['p', mergeAttributes(HTMLAttributes, styleString ? { style: styleString } : {}), 0];
  },
});
