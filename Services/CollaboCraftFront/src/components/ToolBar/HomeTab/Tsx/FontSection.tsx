import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { FaPlus, FaMinus, FaBold, FaItalic, FaStrikethrough, FaUnderline, FaSuperscript, FaSubscript, FaFont, FaFillDrip, FaEraser } from 'react-icons/fa';
import { MdTextFields } from 'react-icons/md';
import { FONT_SIZES, fontOptions } from '../Ts/constants';
import { increaseFontSize, decreaseFontSize } from '../Ts/utils';
import { ColorPickerDropdown } from './ColorPickerDropdown';
import { EditorAttributes, FontOption, FontSize } from '../Ts/types';

interface FontSectionProps {
  editor: Editor;
  currentAttributes: EditorAttributes;
  setCurrentAttributes?: (attributes: EditorAttributes) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  caseDropdownRef: React.RefObject<HTMLDivElement>;
  textColorRef: React.RefObject<HTMLDivElement>;
  highlightColorRef: React.RefObject<HTMLDivElement>;
  setFontDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setCaseDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTextColorPicker?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHighlightColorPicker?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FontSection: React.FC<FontSectionProps> = ({
  editor,
  currentAttributes,
  setCurrentAttributes,
  dropdownRef,
  caseDropdownRef,
  textColorRef,
  highlightColorRef,
  setFontDropdownOpen,
  setCaseDropdownOpen,
  setShowTextColorPicker,
  setShowHighlightColorPicker,
}) => {
  const [fontDropdownOpen, setFontDropdownOpenLocal] = useState(false);
  const [caseDropdownOpen, setCaseDropdownOpenLocal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const [showTextColorPicker, setShowTextColorPickerLocal] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPickerLocal] = useState(false);

  const bgColor = currentAttributes.highlight || '#fff';
  const currentFont = currentAttributes.fontFamily || 'Times New Roman';
  const currentFontSize = currentAttributes.fontSize || 14;
  const isBold = currentAttributes.bold || false;
  const isItalic = currentAttributes.italic || false;
  const isUnderline = currentAttributes.underline || false;
  const isStrike = currentAttributes.strike || false;
  const isSuperscript = currentAttributes.superscript || false;
  const isSubscript = currentAttributes.subscript || false;

  const onSelectFont = (font: string) => {
    editor.chain().focus().setFontFamily(font).run();
    setFontDropdownOpenLocal(false);
    setFontDropdownOpen?.(false);
    setSearchTerm('');
    setRecentFonts((prev) => {
      const newList = [font, ...prev.filter((f) => f !== font)];
      return newList.slice(0, 5);
    });
    if (setCurrentAttributes) {
      setCurrentAttributes({
        ...currentAttributes,
        fontFamily: font,
      });
    }
  };

  const updateAttributes = (updates: Partial<EditorAttributes>) => {
    if (setCurrentAttributes) {
      setCurrentAttributes({
        ...currentAttributes,
        ...updates,
      });
    }
  };

  const changeTextCase = (caseType: 'lowercase' | 'uppercase') => {
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to);
    const newText = caseType === 'lowercase' ? selectedText.toLowerCase() : selectedText.toUpperCase();

    editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
    setCaseDropdownOpenLocal(false);
    setCaseDropdownOpen?.(false);
  };

  const resetStyles = () => {
    editor
      .chain()
      .focus()
      .setFontFamily('Times New Roman')
      .setFontSize(14)
      .setColor('#000000')
      .unsetHighlight()
      .unsetBold()
      .unsetItalic()
      .unsetUnderline()
      .unsetStrike()
      .unsetSuperscript()
      .unsetSubscript()
      .setTextAlign('left')
      .run();
    updateAttributes({
      fontFamily: 'Times New Roman',
      fontSize: 14,
      color: '#000000',
      highlight: null,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      superscript: false,
      subscript: false,
      textAlign: 'left',
    });
  };

  const filteredFonts = fontOptions
    .sort((a: FontOption, b: FontOption) => a.localeCompare(b))
    .filter((f: FontOption) => f.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col border-r pr-4 max-w-max">
      <span className="text-sm font-semibold text-gray-500 mb-1">Шрифт</span>
      <div className="flex flex-col gap-2">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 relative" ref={dropdownRef}>
            <button
              type="button"
              className="w-full border px-3 py-1 rounded bg-white text-left cursor-pointer"
              onClick={() => {
                setFontDropdownOpenLocal((open) => !open);
                setFontDropdownOpen?.((open) => !open);
              }}
              style={{ fontFamily: currentFont }}
            >
              {currentFont}
            </button>
            {fontDropdownOpen && (
              <div className="absolute z-50 bg-white border rounded shadow mt-1 max-h-60 overflow-auto w-full">
                <input
                  type="text"
                  placeholder="Поиск шрифта..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1 border-b outline-none"
                  autoFocus
                />
                {recentFonts.length > 0 && (
                  <div className="p-2 border-b">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Недавно использованные</div>
                    {recentFonts.map((font) => (
                      <div
                        key={font}
                        onClick={() => onSelectFont(font)}
                        className="cursor-pointer px-2 py-1 rounded hover:bg-blue-100"
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-2">
                  {filteredFonts.length > 0 ? (
                    filteredFonts.map((font: FontOption) => (
                      <div
                        key={font}
                        onClick={() => onSelectFont(font)}
                        className="cursor-pointer px-2 py-1 rounded hover:bg-blue-100"
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 px-2 py-1">Шрифты не найдены</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 min-w-[160px]">
            <select
              className="border px-2 py-1 rounded bg-gray-50 w-full"
              value={currentFontSize}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (val < 8) val = 8;
                else if (val > 64) val = 64;
                editor.chain().focus().setFontSize(val).run();
                updateAttributes({ fontSize: val });
              }}
            >
              {FONT_SIZES.map((size: FontSize) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button
              type="button"
              className="p-2 border rounded hover:bg-gray-200 flex items-center justify-center"
              onClick={() => {
                const newSize = increaseFontSize(currentFontSize);
                editor.chain().focus().setFontSize(newSize).run();
                updateAttributes({ fontSize: newSize });
              }}
              title="Увеличить размер шрифта"
            >
              <FaPlus />
            </button>
            <button
              type="button"
              className="p-2 border rounded hover:bg-gray-200 flex items-center justify-center"
              onClick={() => {
                const newSize = decreaseFontSize(currentFontSize);
                editor.chain().focus().setFontSize(newSize).run();
                updateAttributes({ fontSize: newSize });
              }}
              title="Уменьшить размер шрифта"
            >
              <FaMinus />
            </button>
            <div className="relative" ref={caseDropdownRef}>
              <button
                type="button"
                className="p-2 border rounded hover:bg-gray-200 flex items-center justify-center"
                onClick={() => {
                  setCaseDropdownOpenLocal((prev) => !prev);
                  setCaseDropdownOpen?.((prev) => !prev);
                }}
                title="Изменить регистр"
              >
                <MdTextFields />
              </button>
              {caseDropdownOpen && (
                <div className="absolute z-50 bg-white border rounded shadow mt-1 w-40">
                  <button
                    type="button"
                    onClick={() => changeTextCase('lowercase')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Строчные
                  </button>
                  <button
                    type="button"
                    onClick={() => changeTextCase('uppercase')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Прописные
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleBold().run();
              updateAttributes({ bold: editor.isActive('bold') });
            }}
            className={`p-2 rounded ${isBold ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Жирный"
          >
            <FaBold />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleItalic().run();
              updateAttributes({ italic: editor.isActive('italic') });
            }}
            className={`p-2 rounded ${isItalic ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Курсив"
          >
            <FaItalic />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleUnderline().run();
              updateAttributes({ underline: editor.isActive('underline') });
            }}
            className={`p-2 rounded ${isUnderline ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Подчеркнутый"
          >
            <FaUnderline />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleStrike().run();
              updateAttributes({ strike: editor.isActive('strike') });
            }}
            className={`p-2 rounded ${isStrike ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Зачеркнутый"
          >
            <FaStrikethrough />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleSuperscript().run();
              updateAttributes({ superscript: editor.isActive('superscript') });
            }}
            className={`p-2 rounded ${isSuperscript ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Надстрочный"
          >
            <FaSuperscript />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().toggleSubscript().run();
              updateAttributes({ subscript: editor.isActive('subscript') });
            }}
            className={`p-2 rounded ${isSubscript ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            title="Подстрочный"
          >
            <FaSubscript />
          </button>
          <button
            type="button"
            onClick={resetStyles}
            className="p-2 rounded hover:bg-gray-200"
            title="Очистить форматирование"
          >
            <FaEraser />
          </button>
          <div className="relative" ref={textColorRef}>
            <button
              type="button"
              className="w-10 h-8 rounded border flex items-center justify-center"
              style={{ backgroundColor: currentAttributes.color || '#000000' }}
              onClick={() => {
                setShowTextColorPickerLocal((prev) => !prev);
                setShowTextColorPicker?.((prev) => !prev);
                setShowHighlightColorPickerLocal(false);
                setShowHighlightColorPicker?.(false);
              }}
              title="Цвет текста"
            >
              <FaFont color="#fff" />
            </button>
            {showTextColorPicker && (
              <ColorPickerDropdown
                onSelect={(color: string) => {
                  editor.chain().focus().setColor(color).run();
                  setShowTextColorPickerLocal(false);
                  setShowTextColorPicker?.(false);
                  updateAttributes({ color });
                }}
              />
            )}
          </div>
          <div className="relative" ref={highlightColorRef}>
            <span className="sr-only">Цвет подсветки</span>
            <button
              type="button"
              className="w-10 h-8 rounded border flex items-center justify-center"
              style={{ backgroundColor: bgColor || '#FFFF00' }}
              onClick={() => {
                setShowHighlightColorPickerLocal((show) => !show);
                setShowHighlightColorPicker?.((show) => !show);
                setShowTextColorPickerLocal(false);
                setShowTextColorPicker?.(false);
              }}
              title="Цвет подсветки"
            >
              <FaFillDrip color="#fff" />
            </button>
            {showHighlightColorPicker && (
              <ColorPickerDropdown
                onSelect={(color: string) => {
                  editor.chain().focus().setHighlight({ color }).run();
                  setShowHighlightColorPickerLocal(false);
                  setShowHighlightColorPicker?.(false);
                  updateAttributes({ highlight: color });
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};