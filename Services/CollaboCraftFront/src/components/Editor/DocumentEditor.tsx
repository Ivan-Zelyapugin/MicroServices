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

  blockHub.connection.on('BlockDeleted', (blockId: number) => {
  console.log('Block deleted:', blockId);

  setBlocks(prev => prev.filter(b => b.id !== blockId));

  if (activeEditor && editorRefs.current[blockId] === activeEditor) {
    setActiveEditor(null);
  }

  delete editorRefs.current[blockId];
});

    return () => {
      blockHub.connection.off('ReceiveBlock');
      blockHub.connection.off('BlockEdited');
      blockHub.connection.off('ReceiveBlockImage');
      blockHub.connection.off('BlockDeleted');
    };
  }, [documentId, baseUrl, activeEditor, fallbackEditor]);

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
<aside
  id="voice-chat-panel"
  className="fixed bottom-6 right-6 w-[340px] max-h-[80vh] overflow-hidden bg-white/95 backdrop-blur shadow-2xl rounded-2xl border border-gray-200 z-50"
>
  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-sm text-gray-900">Голосовой чат</p>
        <p className="text-xs text-gray-500">Документ #{documentId}</p>
      </div>
      <div className="text-xs text-gray-600 bg-white rounded-full px-2 py-1 border border-gray-200">
        {participants.length} online
      </div>
    </div>
  </div>

  <div className="p-3 flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => toggleMute().catch((err) => console.error(err))}
        className={`text-xs font-medium px-3 py-2 rounded-lg transition ${
          isMuted
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        }`}
      >
        {isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
      </button>

      <button
        onClick={() => toggleScreenShare().catch((err) => console.error(err))}
        className={`text-xs font-medium px-3 py-2 rounded-lg transition ${
          isScreenSharing
            ? 'bg-violet-100 text-violet-700 border border-violet-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}
      >
        {isScreenSharing ? 'Остановить экран' : 'Шарить экран'}
      </button>
    </div>

    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700 mb-2">Участники</p>
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {participants.length === 0 && (
          <div className="text-xs text-gray-400">Пока никого нет</div>
        )}

        {participants.map((participant) => (
          <div
            key={participant.connectionId}
            className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  participant.isSpeaking ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="truncate text-gray-700">
                {participant.isSelf ? 'Вы' : participant.username}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              {participant.isMuted && (
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">mute</span>
              )}
              {participant.isScreenSharing && (
                <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">screen</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-xl border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700 mb-2">Трансляция экрана</p>
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {screenShares.length === 0 && (
          <div className="text-xs text-gray-400">Никто не делится экраном</div>
        )}

        {screenShares.map((share) => (
          <div key={share.connectionId} className="bg-white border border-gray-100 rounded-lg p-2">
            <p className="text-[11px] text-gray-600 mb-1">
              {share.isSelf ? 'Ваш экран' : `Экран: ${share.username}`}
            </p>
            <video
              autoPlay
              playsInline
              muted={share.isSelf}
              className="w-full h-28 rounded border border-gray-200 bg-black object-cover"
              ref={(node) => {
                if (node && node.srcObject !== share.stream) {
                  node.srcObject = share.stream;
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
</aside>
    
    
  </div>
);

};