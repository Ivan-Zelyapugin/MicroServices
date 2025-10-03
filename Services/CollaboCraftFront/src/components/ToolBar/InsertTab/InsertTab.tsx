import React from 'react';
import { Editor } from '@tiptap/core';

interface InsertTabProps {
  editor: Editor;
}

export const InsertTab: React.FC<InsertTabProps> = ({ editor }) => {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
        title="Вставить горизонтальную линию"
      >
        ────────────
      </button>
    </div>
  );
};