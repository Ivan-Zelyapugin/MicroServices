import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Editor } from '@tiptap/core';

interface BlocksSectionProps {
  editor: Editor;
  onAddBlock: () => void;
}

export const BlocksSection: React.FC<BlocksSectionProps> = ({ editor, onAddBlock }) => {
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
        disabled
        className="bg-gray-300 text-white px-3 py-1 rounded cursor-not-allowed flex items-center gap-2"
      >
        <FaTrash /> Удалить
      </button>
    </div>
  );
};