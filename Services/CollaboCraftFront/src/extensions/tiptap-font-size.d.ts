import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType = any> {
    fontSize: {
      setFontSize: (size: number) => ReturnType
    }
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType = any> {
    fontFamily: {
      setFontFamily: (font: string) => ReturnType
    }
  }
}