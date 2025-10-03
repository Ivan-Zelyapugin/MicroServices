// src/components/ToolBar/tsx/HomeTab/ParagraphSection.tsx
import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  FaAlignLeft,
  FaAlignRight,
  FaAlignCenter,
  FaAlignJustify,
  FaListUl,
  FaListOl,
  FaIndent,
  FaOutdent,
  FaGear,
} from 'react-icons/fa6';
import { bulletListStyles, orderedListStyles } from '../Ts/constants';
import { EditorAttributes, BulletListStyle, OrderedListStyle } from '../Ts/types';
import ParagraphSettingsModal from './ParagraphSettingsModal';

const DEFAULT_TAB = 47;

interface ParagraphSectionProps {
  editor: Editor;
  currentAttributes: EditorAttributes;
  setCurrentAttributes?: (attributes: EditorAttributes) => void;
  bulletListDropdownRef: React.RefObject<HTMLDivElement>;
  orderedListDropdownRef: React.RefObject<HTMLDivElement>;
  setBulletListDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setOrderedListDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ParagraphSection: React.FC<ParagraphSectionProps> = ({
  editor,
  currentAttributes,
  setCurrentAttributes,
  bulletListDropdownRef,
  orderedListDropdownRef,
  setBulletListDropdownOpen,
  setOrderedListDropdownOpen,
}) => {
  const [bulletListDropdownOpen, setBulletListDropdownOpenLocal] = useState(false);
  const [orderedListDropdownOpen, setOrderedListDropdownOpenLocal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentTextAlign = currentAttributes.textAlign || 'left';

  const updateAttributes = (updates: Partial<EditorAttributes>) => {
    if (setCurrentAttributes) {
      setCurrentAttributes({
        ...currentAttributes,
        ...updates,
      });
    }
  };

  const changeIndent = (delta: number) => {
  const currentIndent = currentAttributes.indentLeft || 0;
  const newIndent = Math.max(0, currentIndent + delta* DEFAULT_TAB);
  editor.chain().focus().updateAttributes('paragraph', { indentLeft: newIndent }).run();
  updateAttributes({ indentLeft: newIndent });
};

  const setTextAlign = (align: 'left' | 'right' | 'center' | 'justify') => {
    editor.chain().focus().setTextAlign(align).run();
    updateAttributes({ textAlign: align });
  };

  const setBulletList = (style: string) => {
    if (style === 'none') {
      if (editor.isActive('bulletList')) {
        editor.chain().focus().toggleBulletList().run();
      }
      updateAttributes({ bulletList: false });
    } else {
      editor.chain().focus().toggleBulletList().run();
      if (editor.isActive('bulletList')) {
        editor.commands.setNode('bulletList', {
          class: `list-${style}`,
        });
      }
      updateAttributes({ bulletList: editor.isActive('bulletList') });
    }
    setBulletListDropdownOpenLocal(false);
    setBulletListDropdownOpen?.(false);
  };

  const setOrderedList = (level: number, style: string) => {
    if (style === 'none') {
      if (editor.isActive('orderedList')) {
        editor.chain().focus().toggleOrderedList().run();
      }
      updateAttributes({ orderedList: false });
    } else {
      editor.chain().focus().toggleOrderedList().run();
      if (editor.isActive('orderedList')) {
        editor.commands.setNode('orderedList', {
          class: `list-${style}-level-${level}`,
        });
      }
      updateAttributes({ orderedList: editor.isActive('orderedList') });
    }
    setOrderedListDropdownOpenLocal(false);
    setOrderedListDropdownOpen?.(false);
  };

  return (
    <div className="flex flex-col border-r pr-4 max-w-max relative">
      <span className="text-sm font-semibold text-gray-500 mb-1 flex items-center justify-between">
        Абзац
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="ml-2 p-1 hover:bg-gray-200 rounded"
          title="Параметры абзаца"
        >
          <FaGear />
        </button>
      </span>
      <div className="flex gap-4 items-center flex-wrap">
        {/* Выравнивание */}
        <button
          type="button"
          onClick={() => setTextAlign('left')}
          className={`p-2 rounded ${currentTextAlign === 'left' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
          title="Выровнять по левому краю"
        >
          <FaAlignLeft />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('center')}
          className={`p-2 rounded ${currentTextAlign === 'center' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
          title="Выровнять по центру"
        >
          <FaAlignCenter />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('right')}
          className={`p-2 rounded ${currentTextAlign === 'right' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
          title="Выровнять по правому краю"
        >
          <FaAlignRight />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign('justify')}
          className={`p-2 rounded ${currentTextAlign === 'justify' ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
          title="Выровнять по ширине"
        >
          <FaAlignJustify />
        </button>
      </div>
      <div className="flex gap-4 items-center flex-wrap">
        {/* Отступы */}
        <button
          type="button"
          onClick={() => changeIndent(+1)}
          className="p-2 rounded hover:bg-gray-200"
          title="Увеличить отступ"
        >
          <FaIndent />
        </button>
        <button
          type="button"
          onClick={() => changeIndent(-1)}
          className="p-2 rounded hover:bg-gray-200"
          title="Уменьшить отступ"
        >
          <FaOutdent />
        </button>

        {/* Маркированный список */}
        <div className="relative" ref={bulletListDropdownRef}>
          <button
            type="button"
            className={`p-2 rounded ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            onClick={() => {
              setBulletListDropdownOpenLocal((prev) => !prev);
              setBulletListDropdownOpen?.((prev) => !prev);
            }}
            title="Маркированный список"
          >
            <FaListUl />
          </button>
          {bulletListDropdownOpen && (
            <div className="absolute z-50 bg-white border rounded shadow mt-1 w-40">
              {bulletListStyles.map((style: BulletListStyle) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setBulletList(style.value)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    editor.isActive('bulletList') &&
                    editor.getAttributes('bulletList').class?.includes(`list-${style.value}`)
                      ? 'bg-blue-100'
                      : ''
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Нумерованный список */}
        <div className="relative" ref={orderedListDropdownRef}>
          <button
            type="button"
            className={`p-2 rounded ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}
            onClick={() => {
              setOrderedListDropdownOpenLocal((prev) => !prev);
              setOrderedListDropdownOpen?.((prev) => !prev);
            }}
            title="Нумерованный список"
          >
            <FaListOl />
          </button>
          {orderedListDropdownOpen && (
            <div className="absolute z-50 bg-white border rounded shadow mt-1 w-40">
              {orderedListStyles.map((style: OrderedListStyle) => (
                <button
                  key={style.level}
                  type="button"
                  onClick={() => setOrderedList(style.level, style.value)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  {style.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isSettingsOpen && (
  <ParagraphSettingsModal
    initialValues={currentAttributes}   // ✅ сюда попадут уже обновлённые indentLeft
    onClose={() => setIsSettingsOpen(false)}
    onSave={(settings) => {
      editor.chain().focus().updateAttributes('paragraph', settings).run();
      updateAttributes(settings);
    }}
  />
)}
    </div>
  );
};