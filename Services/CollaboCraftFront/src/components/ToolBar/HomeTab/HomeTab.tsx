import React, { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { BlocksSection } from './Tsx/BlocksSection';
import { FontSection } from './Tsx/FontSection';
import { ParagraphSection } from './Tsx/ParagraphSection';
import { EditorAttributes } from './Ts/types';
import { InsertTab } from './Tsx/InsertSection'

interface HomeTabProps {
  editor: Editor;
  onAddBlock: () => void;
  currentAttributes: EditorAttributes;
  setCurrentAttributes?: (attributes: EditorAttributes) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  caseDropdownRef: React.RefObject<HTMLDivElement>;
  bulletListDropdownRef: React.RefObject<HTMLDivElement>;
  orderedListDropdownRef: React.RefObject<HTMLDivElement>;
  textColorRef: React.RefObject<HTMLDivElement>;
  highlightColorRef: React.RefObject<HTMLDivElement>;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  editor,
  onAddBlock,
  currentAttributes,
  setCurrentAttributes,
  dropdownRef,
  caseDropdownRef,
  bulletListDropdownRef,
  orderedListDropdownRef,
  textColorRef,
  highlightColorRef,
}) => {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        caseDropdownRef.current &&
        !caseDropdownRef.current.contains(event.target as Node) &&
        bulletListDropdownRef.current &&
        !bulletListDropdownRef.current.contains(event.target as Node) &&
        orderedListDropdownRef.current &&
        !orderedListDropdownRef.current.contains(event.target as Node) &&
        textColorRef.current &&
        !textColorRef.current.contains(event.target as Node) &&
        highlightColorRef.current &&
        !highlightColorRef.current.contains(event.target as Node)
      ) {
        // Закрытие всех выпадающих меню передаётся через пропсы в подкомпоненты
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef, caseDropdownRef, bulletListDropdownRef, orderedListDropdownRef, textColorRef, highlightColorRef]);

  return (
    <div className="flex gap-4 items-start">
      <BlocksSection editor={editor} onAddBlock={onAddBlock} />
      <FontSection
        editor={editor}
        currentAttributes={currentAttributes}
        setCurrentAttributes={setCurrentAttributes}
        dropdownRef={dropdownRef}
        caseDropdownRef={caseDropdownRef}
        textColorRef={textColorRef}
        highlightColorRef={highlightColorRef}
      />
      <ParagraphSection
        editor={editor}
        currentAttributes={currentAttributes}
        setCurrentAttributes={setCurrentAttributes}
        bulletListDropdownRef={bulletListDropdownRef}
        orderedListDropdownRef={orderedListDropdownRef}
      />
      <InsertTab
        editor={editor}
      />

    </div>
  );
};