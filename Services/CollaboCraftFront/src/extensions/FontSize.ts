import { Extension, CommandProps } from '@tiptap/core'

export const FontSize = Extension.create({
  name: 'fontSize',

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
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize?.replace('px', ''),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) return {}
              return {
                style: `font-size: ${attributes.fontSize}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize:
        (size: number) =>
        ({ chain }: CommandProps) => {
          return chain().setMark('textStyle', { fontSize: size }).run()
        },
    }
  },
})
