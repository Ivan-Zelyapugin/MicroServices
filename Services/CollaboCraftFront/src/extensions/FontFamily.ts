import { Extension, CommandProps } from '@tiptap/core'

export const FontFamily = Extension.create({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.fontFamily?.replace(/['"]/g, ''),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontFamily) return {}
              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontFamily:
        (font: string) =>
        ({ chain }: CommandProps) => {
          return chain().setMark('textStyle', { fontFamily: font }).run()
        },
    }
  },
})
