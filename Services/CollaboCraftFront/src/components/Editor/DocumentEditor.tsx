import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { sendBlockMessage, blockHub } from '../../api/signalr';
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
import { useVoiceChat } from '../../models/useVoiceChat';

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
  const {
    toggleMute,
    toggleScreenShare,
    participants,
    isMuted,
    isScreenSharing,
    screenShares,
  } = useVoiceChat(Number(documentId));
  const [expandedShareConnectionId, setExpandedShareConnectionId] = useState<string | null>(null);

  const expandedShare = screenShares.find((s) => s.connectionId === expandedShareConnectionId) ?? null;

  useEffect(() => {
    if (!expandedShareConnectionId) return;
    if (!screenShares.some((s) => s.connectionId === expandedShareConnectionId)) {
      setExpandedShareConnectionId(null);
    }
  }, [expandedShareConnectionId, screenShares]);

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

  const activeEditorRef = useRef<Editor | null>(null);

  useEffect(() => {
    activeEditorRef.current = activeEditor;
  }, [activeEditor]);

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

        // Присоединяемся к группе документа в BlockHub
        await sendBlockMessage('JoinDocument', [Number(documentId)]);
      } catch (error) {
        console.error('Error fetching blocks or documents:', error);
      }
    };

    fetchData();

    return () => {
      sendBlockMessage('LeaveDocument', [Number(documentId)]).catch(err => 
        console.error('Error leaving document group:', err)
      );
    };
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    const handleReceiveBlock = (newBlock: Block) => {
      console.log('Received new block:', newBlock);
      setBlocks(prev => {
        if (prev.find(b => b.id === newBlock.id)) return prev;
        return [...prev, newBlock];
      });
    };

    const handleBlockEdited = (b: Block) => {
      console.log('Block edited:', b);
      setBlocks(prev => prev.map(p => (p.id === b.id ? b : p)));

      const editor = editorRefs.current[b.id];
      if (editor && b.text) {
        try {
          const json = JSON.parse(b.text);
          if (editor.isFocused) return;

          const currentJson = editor.getJSON();
          if (JSON.stringify(currentJson) === JSON.stringify(json)) return;

          editor.commands.setContent(json, false);
        } catch (e) {
          console.error('Ошибка при обновлении редактора блока:', e);
        }
      }
    };

    const handleReceiveBlockImage = (blockImage: { id: number; blockId: number; url: string }) => {
      console.log('Received block image:', blockImage);
      const editor = editorRefs.current[blockImage.blockId] || activeEditorRef.current || fallbackEditor;
      if (!editor) return;

      // Проверяем, нет ли уже этой картинки в редакторе
      let imageExists = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'image' && node.attrs.imageId === blockImage.id) {
          imageExists = true;
          return false;
        }
      });

      if (imageExists) {
        console.log('Image already exists in editor, skipping insertion');
        return;
      }

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
    };

    const handleBlockDeleted = (blockId: number) => {
      console.log('Block deleted:', blockId);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      if (activeEditorRef.current && editorRefs.current[blockId] === activeEditorRef.current) {
        setActiveEditor(null);
      }
      delete editorRefs.current[blockId];
    };

    blockHub.connection.on('ReceiveBlock', handleReceiveBlock);
    blockHub.connection.on('BlockEdited', handleBlockEdited);
    blockHub.connection.on('ReceiveBlockImage', handleReceiveBlockImage);
    blockHub.connection.on('BlockDeleted', handleBlockDeleted);

    return () => {
      blockHub.connection.off('ReceiveBlock', handleReceiveBlock);
      blockHub.connection.off('BlockEdited', handleBlockEdited);
      blockHub.connection.off('ReceiveBlockImage', handleReceiveBlockImage);
      blockHub.connection.off('BlockDeleted', handleBlockDeleted);
    };
  }, [documentId, baseUrl, fallbackEditor]);

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

  const handleDeleteBlock = () => {
    if (!activeEditor) return;

    const blockEntry = Object.entries(editorRefs.current)
      .find(([, editor]) => editor === activeEditor);

    if (!blockEntry) return;

    const blockId = Number(blockEntry[0]);

    if (!window.confirm('Удалить блок? Это действие нельзя отменить.')) return;

    sendBlockMessage('DeleteBlock', [blockId]);
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
      onDeleteBlock={handleDeleteBlock}
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
{/* 🎤 Voice Chat Panel */}


{expandedShare && (
  <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
    <div className="bg-gray-950 w-full max-w-6xl h-[85vh] rounded-xl border border-gray-700 overflow-hidden flex flex-col">
      <div className="px-4 py-3 bg-gray-900 text-gray-100 flex items-center justify-between">
        <span className="text-sm">
          {expandedShare.isSelf ? 'Ваш экран (полный просмотр)' : `Экран ${expandedShare.username}`}
        </span>
        <button
          onClick={() => setExpandedShareConnectionId(null)}
          className="text-xs px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700"
        >
          Закрыть
        </button>
      </div>
      <div className="flex-1 p-3">
        <video
          autoPlay
          playsInline
          muted={expandedShare.isSelf}
          controls
          className="w-full h-full rounded bg-black object-contain"
          ref={(node) => {
            if (node && node.srcObject !== expandedShare.stream) {
              node.srcObject = expandedShare.stream;
            }
          }}
        />
      </div>
    </div>
  </div>
)}
    
    
  </div>
);

};