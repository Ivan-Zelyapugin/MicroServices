import React, { useEffect } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import { commonExtensions } from './editorExtensions';
import { getEditorAttributes } from './editorUtils'

interface Props {
  content: any;
  editable: boolean;
  onFocus?: () => void;
  onEditorReady?: (editor: Editor) => void;
  onChange: (json: any) => void;
  onImagePaste?: (file: File, insertAtCursor: (url: string) => void) => void;
  onSelectionUpdate?: (attributes: any) => void; 
}

export const RichTextBlockEditor: React.FC<Props> = ({
  content,
  editable,
  onFocus,
  onChange,
  onImagePaste,
  onEditorReady,
  onSelectionUpdate,
}) => {
  const editor = useEditor({
    extensions: commonExtensions,
    editable,
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onFocus: () => onFocus?.(),
    onCreate: () => console.log('Editor created'),
    onSelectionUpdate: ({ editor }) => {
      onSelectionUpdate?.(getEditorAttributes(editor));
    },
  });


  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || !onImagePaste) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onImagePaste(file, (url: string) => {
              editor.chain().focus().setImage({ src: url }).run();
            });
          }
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('paste', handlePaste);
    return () => dom.removeEventListener('paste', handlePaste);
  }, [editor, onImagePaste]);

  if (!editor) return <div className="text-red-500">Редактор не инициализирован</div>;

  return (
    <div className="prose min-h-[100px] w-full p-2 border border-gray-300 rounded-sm bg-white outline-none whitespace-pre-wrap break-words focus:ring-2 focus:ring-blue-400 hover:bg-gray-50 transition-all">
      <EditorContent editor={editor} spellCheck={false} />
    </div>
  );
};
