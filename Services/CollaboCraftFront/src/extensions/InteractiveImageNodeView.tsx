import React, { useRef, useEffect, useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Editor } from '@tiptap/react';
import { showImageMenu } from './imageMenu';

interface Props {
  node: ProseMirrorNode;
  editor: Editor;
  getPos: () => number;
}

export const InteractiveImageComponent: React.FC<Props> = ({ node, editor, getPos }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [selected, setSelected] = useState(false);

  // Drag/resize
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });
  const resizeRef = useRef({ resizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  // Выделение
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    setSelected(true);
  };

  // Снятие выделения
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSelected(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Контекстное меню
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showImageMenu(e.clientX, e.clientY, node, editor, getPos);
  };

  // Drag
  const handleMouseDownDrag = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  e.preventDefault();
  dragRef.current.dragging = true;
  dragRef.current.startX = e.clientX;
  dragRef.current.startY = e.clientY;
};

  const handleMouseMove = (e: MouseEvent) => {
  if (dragRef.current.dragging && imgRef.current) {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // сохраняем смещение во временном атрибуте
    imgRef.current.dataset.dx = dx.toString();
    imgRef.current.dataset.dy = dy.toString();
    imgRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  // Resize как раньше
  if (resizeRef.current.resizing && imgRef.current) {
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const newWidth = Math.max(20, resizeRef.current.startWidth + dx);
    const newHeight = Math.max(20, resizeRef.current.startHeight + dy);
    imgRef.current.style.width = `${newWidth}px`;
    imgRef.current.style.height = `${newHeight}px`;
  }
};

  const handleMouseUp = () => {
  if (dragRef.current.dragging && imgRef.current) {
    dragRef.current.dragging = false;

    // вычисляем смещение
    const dx = parseFloat(imgRef.current.dataset.dx || '0');
    const dy = parseFloat(imgRef.current.dataset.dy || '0');

    const pos = getPos();
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      width: imgRef.current.width,
      height: imgRef.current.height,
      left: (node.attrs.left || 0) + dx,
      top: (node.attrs.top || 0) + dy,
    });
    editor.view.dispatch(tr);

    // сброс transform
    imgRef.current.style.transform = '';
    imgRef.current.dataset.dx = '0';
    imgRef.current.dataset.dy = '0';
  }

  // Resize сохраняется как раньше
  if (resizeRef.current.resizing && imgRef.current) {
    resizeRef.current.resizing = false;
    const pos = getPos();
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      width: imgRef.current.width,
      height: imgRef.current.height,
    });
    editor.view.dispatch(tr);
  }
};

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    const img = imgRef.current;
    img?.addEventListener('click', handleClick);
    img?.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      img?.removeEventListener('click', handleClick);
      img?.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Resize handle
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current.resizing = true;
    resizeRef.current.startX = e.clientX;
    resizeRef.current.startY = e.clientY;
    if (imgRef.current) {
      resizeRef.current.startWidth = imgRef.current.width;
      resizeRef.current.startHeight = imgRef.current.height;
    }
  };

  return (
    <NodeViewWrapper
  ref={wrapperRef}
  style={{
    display: 'inline-block',
    cursor: 'pointer',
    border: selected ? '2px solid blue' : 'none',
    position: 'relative',
    left: node.attrs.left || 0,
    top: node.attrs.top || 0,
    userSelect: 'none',
  }}
  onMouseDown={handleMouseDownDrag}
>
      <img
        ref={imgRef}
        src={node.attrs.src}
        style={{
          width: node.attrs.width || 'auto',
          height: node.attrs.height || 'auto',
          display: 'block',
          pointerEvents: 'all',
        }}
        alt=""
      />
      {selected && (
        <div
          style={{
            width: '10px',
            height: '10px',
            background: 'blue',
            position: 'absolute',
            right: '-5px',
            bottom: '-5px',
            cursor: 'nwse-resize',
          }}
          onMouseDown={handleMouseDownResize}
        />
      )}
    </NodeViewWrapper>
  );
};
