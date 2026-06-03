import React, { useEffect, useRef } from 'react';
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
  // Держим актуальный onImagePaste в ref, т.к. editorProps фиксируется при создании редактора.
  const onImagePasteRef = useRef(onImagePaste);
  onImagePasteRef.current = onImagePaste;

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
    editorProps: {
      // Обрабатываем вставку картинок сами и возвращаем true, чтобы подавить
      // нативную вставку ProseMirror (иначе картинка из HTML/data-URL буфера
      // вставляется повторно поверх той, что приходит с сервера по ReceiveBlockImage).
      handlePaste: (_view, event) => {
        const onImagePasteCb = onImagePasteRef.current;
        if (!onImagePasteCb) return false;

        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              onImagePasteCb(file, () => {});
              return true;
            }
          }
        }
        return false;
      },
    },
  });


  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  if (!editor) return <div className="text-red-500">Редактор не инициализирован</div>;

  return (
    <div className="prose min-h-[100px] w-full p-2 border border-gray-300 rounded-sm bg-white outline-none whitespace-pre-wrap break-words focus:ring-2 focus:ring-blue-400 hover:bg-gray-50 transition-all">
      <EditorContent editor={editor} spellCheck={false} />
    </div>
  );
};
