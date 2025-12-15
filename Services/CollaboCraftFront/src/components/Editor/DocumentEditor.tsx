import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import VoiceChat from './VoiceChat';
import { useDebouncedCallback } from 'use-debounce';
import { startBlockHub, sendBlockMessage, blockHub } from '../../api/signalr';
import { getBlocksByDocument } from '../../api/block';
import { getMyDocuments, getCurrentUser } from '../../api/document';
import { RichTextBlockEditor } from './RichTextBlockEditor';
import { EditorToolbar } from '../ToolBar/EditorToolbar';
import { Block } from '../../models/block';
import { DocumentRole } from '../../models/document';
import { Editor, useEditor } from '@tiptap/react';
import { commonExtensions } from './editorExtensions';
import { EditorAttributes } from '../ToolBar/HomeTab/Ts/types';
import { getEditorAttributes } from './editorUtils'

export const DocumentEditor: React.FC = () => {
  const baseUrl = '/minio';
  const { documentId } = useParams<{ documentId: string }>();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [role, setRole] = useState<DocumentRole | null>(null);
  const [currentAttributes, setCurrentAttributes] = useState<EditorAttributes>({});
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editorRefs = useRef<Record<number, Editor>>({});
  const [documentTitle, setDocumentTitle] = useState<string>('Документ');
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

  const fallbackEditor = useEditor({
    extensions: commonExtensions,
    content: '<p></p>',
    editable: role === 'Creator' || role === 'Editor',
    onUpdate: ({ editor }) => {
      setCurrentAttributes(getEditorAttributes(editor));
    },
  });

  useEffect(() => {
  const loadUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser({ id: user.id, name: user.username });
      localStorage.setItem('username', user.username);
    } catch (error) {
      console.error('Не удалось получить текущего пользователя:', error);
    }
  };

  loadUser();
}, []);

  useEffect(() => {
    if (fallbackEditor) {
      fallbackEditor.setEditable(role === 'Creator' || role === 'Editor');
    }
  }, [fallbackEditor, role]);

  const save = useDebouncedCallback((id: number, json: any) => {
    console.log('Saving block:', id, json);
    sendBlockMessage('EditBlock', [
      {
        id,
        editedText: JSON.stringify(json),
      },
    ]);
  }, 200);

  useEffect(() => {
    if (!documentId) return;

    const fetchData = async () => {
    try {
      const fetched = await getBlocksByDocument(Number(documentId), new Date(0).toISOString());
      const docs = await getMyDocuments();
      setBlocks(fetched);
      setRole(docs.find(d => d.document.id === Number(documentId))?.role ?? null);
      const currentDoc = docs.find(d => d.document.id === Number(documentId));
      setDocumentTitle(currentDoc?.document.name ?? 'Документ');
    } catch (error) {
      console.error('Error fetching blocks or documents:', error);
    }
  };

  fetchData();

    blockHub.connection.on('ReceiveBlock', (newBlock: Block) => {
  console.log('Received new block:', newBlock);

  setBlocks(prev => {
    // предотвращаем дубликаты
    if (prev.find(b => b.id === newBlock.id)) return prev;
    return [...prev, newBlock];
  });
});

    blockHub.connection.on('BlockEdited', (b: Block) => {
  console.log('Block edited:', b);

  setBlocks(prev => prev.map(p => (p.id === b.id ? b : p)));

  // обновляем содержимое редактора блока, если он есть
  const editor = editorRefs.current[b.id] || activeEditor || fallbackEditor;
  if (editor && b.text) {
    try {
      const json = JSON.parse(b.text);
      editor.commands.setContent(json, false); // false = не триггерить onUpdate
    } catch (e) {
      console.error('Ошибка при обновлении редактора блока:', e);
    }
  }
});

   blockHub.connection.on('ReceiveBlockImage', (blockImage: { id: number; url: string }) => {
  const editor = editorRefs.current[blockImage.id] || activeEditor || fallbackEditor;
  if (!editor) return;

  const { state, view } = editor;

  const imageNode = state.schema.nodes.image.create({
    src: `${baseUrl}/${blockImage.url}`,
    width: 300,
    height: 200,
    imageId: blockImage.id,
  });

  const transaction = state.tr.insert(state.selection.to, imageNode);
  view.dispatch(transaction);
  editor.view.focus();
});


    return () => {
      blockHub.connection.off('ReceiveBlock');
      blockHub.connection.off('BlockEdited');
      blockHub.connection.off('ReceiveBlockImage');
    };
  }, [documentId, baseUrl, activeEditor, fallbackEditor]);

  useEffect(() => {
  const panel = document.getElementById('voice-chat-panel');
  if (!panel) return;

  let offsetX = 0, offsetY = 0, isDragging = false;

  const onMouseDown = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    panel.style.transition = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    panel.style.left = `${e.clientX - offsetX}px`;
    panel.style.top = `${e.clientY - offsetY}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  };

  const onMouseUp = () => {
    isDragging = false;
    panel.style.transition = 'all 0.1s ease';
  };

  panel.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    panel.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}, []);

  const handleBlockChange = (id: number, json: any) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, text: JSON.stringify(json) } : b)));
    save(id, json);
  };

  const handleImagePaste = async (
    blockId: number,
    file: File,
    insertAtCursor: (url: string) => void
  ) => {
    if (blockHub.connection.state !== 'Connected') {
      alert('Подключение не активно. Попробуйте позже.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const fileUpload = {
        fileName: file.name,
        contentType: file.type,
        contentBase64: base64,
      };

      const request = {
        blockId,
        url: '',
        uploadedOn: new Date().toISOString(),
        userId: 0,
      };

      await sendBlockMessage('SendBlockImage', [request, fileUpload]);
    } catch (error) {
      console.error('❌ Ошибка при вставке изображения:', error);
      alert('Ошибка при загрузке изображения.');
    }
  };

  const handleAddBlock = () => {
    if (!documentId) return;
    console.log('Adding new block for document:', documentId);
    sendBlockMessage('SendBlock', [{ text: '{}', documentId: Number(documentId) }]);
  };

  // Показываем тулбар только если есть валидный редактор
  if (!activeEditor && !fallbackEditor) {
    return (
      <div className="min-h-screen bg-gray-100 w-full">
        <div className="text-center text-gray-500 py-4">Редактор загружается...</div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-100 w-full relative">
    {/* 🧰 Панель инструментов */}
    <EditorToolbar
      editor={activeEditor || (fallbackEditor as Editor)}
      onAddBlock={handleAddBlock}
      currentAttributes={currentAttributes}
      setCurrentAttributes={setCurrentAttributes}
      blocks={blocks}
    />

    {/* 📝 Основная область редактора */}
    <div className="flex w-full">
      <main className="mx-auto w-[794px] p-8 flex flex-col space-y-1 bg-white">
        {blocks.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Нет блоков для редактирования
          </div>
        )}

        {blocks.map(block => {
          let content: any = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }],
          };

          try {
            const parsed = JSON.parse(block.text || '{}');
            if (parsed?.type === 'doc') content = parsed;
          } catch (e) {
            console.warn('Невалидный JSON в блоке', block.id, e);
          }

          return (
            <div key={block.id}>
              <RichTextBlockEditor
                content={content}
                editable={role === 'Creator' || role === 'Editor'}
                onFocus={() => {
                  if (editorRefs.current[block.id]) {
                    setActiveEditor(editorRefs.current[block.id]);
                    setCurrentAttributes(
                      getEditorAttributes(editorRefs.current[block.id])
                    );
                  }
                }}
                onEditorReady={editor => {
                  editorRefs.current[block.id] = editor;
                  if (!activeEditor && blocks[0]?.id === block.id)
                    setActiveEditor(editor);
                }}
                onChange={json => handleBlockChange(block.id, json)}
                onImagePaste={(file, insertAtCursor) =>
                  handleImagePaste(block.id, file, insertAtCursor)
                }
                onSelectionUpdate={setCurrentAttributes}
              />
            </div>
          );
        })}
      </main>
    </div>

    
    
  </div>
);

};