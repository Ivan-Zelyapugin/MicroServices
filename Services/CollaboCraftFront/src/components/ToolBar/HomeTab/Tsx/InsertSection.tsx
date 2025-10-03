import React, { useState } from 'react';
import { Editor } from '@tiptap/core';
import { FaTable, FaTrash, FaPlus, FaMinus, FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import TableInsertModal from './TableInsertModal';

interface InsertTabProps {
  editor: Editor;
}

export const InsertTab: React.FC<InsertTabProps> = ({ editor }) => {
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  const handleInsertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  const handleDeleteTable = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().deleteTable().run();
    }
  };

  // Добавление строки сверху
  const handleAddRowBefore = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().addRowBefore().run();
    }
  };

  // Добавление строки снизу
  const handleAddRowAfter = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().addRowAfter().run();
    }
  };

  // Удаление текущей строки (по курсору)
  const handleDeleteRow = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().deleteRow().run();
    }
  };

  // Добавление столбца слева
  const handleAddColumnBefore = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().addColumnBefore().run();
    }
  };

  // Добавление столбца справа
  const handleAddColumnAfter = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().addColumnAfter().run();
    }
  };

  // Удаление текущего столбца (по курсору)
  const handleDeleteColumn = () => {
    if (editor.isActive('table')) {
      editor.chain().focus().deleteColumn().run();
    }
  };



  return (
  <div className="flex flex-col border-r pr-4 max-w-max relative">
    <span className="text-sm font-semibold text-gray-500 mb-1">Вставка</span>

    <div className="flex gap-4 items-center flex-wrap">
      {/* Вставка горизонтальной линии */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
        title="Вставить горизонтальную линию"
      >
        ──────────
      </button>

      {/* Вставка таблицы */}
      <button
        type="button"
        className="p-1 rounded hover:bg-gray-200"
        onClick={() => setIsTableModalOpen(true)}
        title="Вставить таблицу"
      >
        <FaTable size={16} />
      </button>

      {/* Удалить таблицу */}
      <button
        type="button"
        className={`p-1 rounded text-gray-600 hover:bg-gray-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleDeleteTable}
        disabled={!editor.isActive('table')}
        title="Удалить таблицу"
      >
        <FaTrash size={14} />
      </button>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
      {/* Добавление строк */}
      <button
        type="button"
        className={`p-1 rounded hover:bg-blue-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleAddRowBefore}
        disabled={!editor.isActive('table')}
        title="Добавить строку сверху"
      >
        <FaPlus size={12} /> <FaArrowUp size={12} />
      </button>

      <button
        type="button"
        className={`p-1 rounded hover:bg-blue-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleAddRowAfter}
        disabled={!editor.isActive('table')}
        title="Добавить строку снизу"
      >
        <FaPlus size={12} /> <FaArrowDown size={12} />
      </button>

      <button
        type="button"
        className={`p-1 rounded hover:bg-red-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleDeleteRow}
        disabled={!editor.isActive('table')}
        title="Удалить текущую строку"
      >
        <FaMinus size={12} />
      </button>

      {/* Добавление столбцов */}
      <button
        type="button"
        className={`p-1 rounded hover:bg-blue-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleAddColumnBefore}
        disabled={!editor.isActive('table')}
        title="Добавить столбец слева"
      >
        <FaPlus size={12} /> <FaArrowLeft size={12} />
      </button>

      <button
        type="button"
        className={`p-1 rounded hover:bg-blue-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleAddColumnAfter}
        disabled={!editor.isActive('table')}
        title="Добавить столбец справа"
      >
        <FaPlus size={12} /> <FaArrowRight size={12} />
      </button>

      <button
        type="button"
        className={`p-1 rounded hover:bg-red-100 ${
          editor.isActive('table') ? '' : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={handleDeleteColumn}
        disabled={!editor.isActive('table')}
        title="Удалить текущий столбец"
      >
        <FaMinus size={12} />
      </button>
    </div>

    {isTableModalOpen && (
      <TableInsertModal
        onClose={() => setIsTableModalOpen(false)}
        onInsert={handleInsertTable}
      />
    )}
  </div>
);

};