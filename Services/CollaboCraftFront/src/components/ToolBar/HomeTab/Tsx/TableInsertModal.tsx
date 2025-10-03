import React, { useState } from 'react';

interface TableInsertModalProps {
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

const TableInsertModal: React.FC<TableInsertModalProps> = ({ onClose, onInsert }) => {
  const [rows, setRows] = useState<number>(2);
  const [cols, setCols] = useState<number>(2);
  const [highlightedRows, setHighlightedRows] = useState<number>(0);
  const [highlightedCols, setHighlightedCols] = useState<number>(0);

  // Обработка числового ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'rows' | 'cols') => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
    if (type === 'rows') {
      setRows(value);
      setHighlightedRows(value);
    } else {
      setCols(value);
      setHighlightedCols(value);
    }
  };

  // Обработка выбора сетки
  const handleGridHover = (row: number, col: number) => {
    setHighlightedRows(row + 1);
    setHighlightedCols(col + 1);
    setRows(row + 1);
    setCols(col + 1);
  };

  // Обработка вставки таблицы
  const handleInsert = () => {
    onInsert(rows, cols);
    onClose();
  };

  // Создание сетки 10x10
  const grid = Array.from({ length: 10 }, (_, rowIndex) =>
    Array.from({ length: 10 }, (_, colIndex) => (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={`w-5 h-5 border border-gray-300 ${
          rowIndex < highlightedRows && colIndex < highlightedCols
            ? 'bg-blue-200'
            : 'bg-white'
        }`}
        onMouseEnter={() => handleGridHover(rowIndex, colIndex)}
        onClick={handleInsert}
      />
    ))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Вставить таблицу</h2>

        {/* Числовой ввод */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Строк:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={rows}
                onChange={(e) => handleInputChange(e, 'rows')}
                className="mt-1 w-20 p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Столбцов:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={cols}
                onChange={(e) => handleInputChange(e, 'cols')}
                className="mt-1 w-20 p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Сетка 10x10 */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Выберите размер: {highlightedRows}x{highlightedCols}
          </div>
          <div className="grid grid-cols-10 gap-0 w-fit">
            {grid}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Вставить
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableInsertModal;