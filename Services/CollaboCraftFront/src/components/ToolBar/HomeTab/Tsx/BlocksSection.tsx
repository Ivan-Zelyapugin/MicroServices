import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Editor } from '@tiptap/core';

interface BlocksSectionProps {
  editor: Editor;
  onAddBlock: () => void;
  onDeleteBlock: () => void;
}

export const BlocksSection: React.FC<BlocksSectionProps> = ({
  editor,
  onAddBlock,
  onDeleteBlock,
}) => {
  const canDelete = editor?.isEditable;

  return (
    <div className="flex flex-col border-r pr-4 min-w-[140px]">
      <span className="text-sm font-semibold text-gray-500 mb-1">Блоки</span>

      <button
        type="button"
        onClick={onAddBlock}
        className="bg-blue-600 text-white px-3 py-1 mb-2 rounded hover:bg-blue-700 flex items-center gap-2"
      >
        <FaPlus /> Добавить
      </button>

      <button
        type="button"
        onClick={onDeleteBlock}
        disabled={!canDelete}
        className={`px-3 py-1 rounded flex items-center gap-2 ${
          canDelete
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-300 text-white cursor-not-allowed'
        }`}
      >
        <FaTrash /> Удалить
      </button>
    </div>
  );
};
