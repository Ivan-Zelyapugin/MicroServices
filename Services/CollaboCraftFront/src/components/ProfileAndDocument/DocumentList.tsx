import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa6';
import { FaTrash } from 'react-icons/fa6';
import { FaGear } from 'react-icons/fa6';
import { getMyDocuments, getDocumentDetails } from '../../api/document';
import { Document, UserDocumentDto, DocumentRole, DocumentDetails, DocumentParticipantFull } from '../../models/document';
import { 

  documentHub,
  participantHub,
  startDocumentHub,
  startParticipantHub,
  sendDocumentMessage,
  sendParticipantMessage
} from '../../api/signalr';

interface DocumentListProps {
  onLogout: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ onLogout }) => {
  const [documents, setDocuments] = useState<UserDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [userInputs, setUserInputs] = useState([{ username: '', role: 'Viewer' as DocumentRole }]);
  const [showAddUserModal, setShowAddUserModal] = useState<number | null>(null);
  const [addUserInputs, setAddUserInputs] = useState([{ username: '', role: 'Viewer' as DocumentRole }]);
  const [showEditModal, setShowEditModal] = useState<number | null>(null);
  const [editDocumentInfo, setEditDocumentInfo] = useState<DocumentDetails | null>(null);
  const [tempUserRoles, setTempUserRoles] = useState<{ [userId: number]: DocumentRole }>({});

  useEffect(() => {
    startDocumentHub();
    startParticipantHub();
    fetchDocuments();

    documentHub.connection.on('DocumentCreated', (doc: Document) => {
      setDocuments(prev => [...prev, { document: doc, role: 'Creator' }]);
    });

    documentHub.connection.on('DocumentDeleted', (deletedId: number) => {
      setDocuments(prev => prev.filter(d => d.document.id !== deletedId));
    });

    participantHub.connection.on('AddedToDocument', () => {
      fetchDocuments();
    });

    participantHub.connection.on('UserRoleChanged', (documentId: number, userId: number, newRole: string) => {
      console.log('UserRoleChanged received:', { documentId, userId, newRole });
      if (showEditModal === documentId && editDocumentInfo) {
        setEditDocumentInfo(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            users: prev.users.map(user =>
              user.userId === userId ? { ...user, role: newRole as DocumentRole } : user
            ),
          };
        });
      }
    });

    participantHub.connection.on('UserRemoved', (documentId: number, userId: number) => {
      console.log('UserRemoved received:', { documentId, userId });
      setEditDocumentInfo(prev =>
        prev ? { ...prev, users: prev.users.filter(u => u.userId !== userId) } : prev
      );
      fetchDocumentInfo(documentId);
    });

    documentHub.connection.on('DocumentRenamed', (documentId: number, newName: string) => {
      if (showEditModal === documentId) {
        setEditDocumentInfo(prev => prev ? { ...prev, name: newName } : prev);
      }
      setDocuments(prev =>
        prev.map(d => d.document.id === documentId ? { ...d, document: { ...d.document, name: newName } } : d)
      );
    });

    return () => {
      documentHub.connection.off('DocumentCreated');
      documentHub.connection.off('DocumentDeleted');
      participantHub.connection.off('AddedToDocument');
      documentHub.connection.off('DocumentRenamed');
      participantHub.connection.off('UserRoleChanged');
      participantHub.connection.off('UserRemoved');
    };
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await getMyDocuments();
      setDocuments(data);
    } catch (error) {
      alert('Ошибка при загрузке документов.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentInfo = async (documentId: number) => {
    try {
      const data = await getDocumentDetails(documentId);
      setEditDocumentInfo(data);
    } catch (error) {
      console.error('Error fetching document info:', error);
      alert('Не удалось обновить данные документа.');
    }
  };

  const updateDocumentName = async (documentId: number, newName: string) => {
    if (!newName.trim()) {
      alert('Название документа обязательно.');
      return;
    }
    try {
      console.log('Updating document name:', { documentId, newName });
      if (documentHub.connection.state !== 'Connected') {
        throw new Error('SignalR connection is not active. Please reconnect.');
      }
      await sendDocumentMessage('RenameDocument', [documentId, newName]);
      setEditDocumentInfo(prev => (prev ? { ...prev, name: newName } : prev));
      console.log('Document name updated successfully');
    } catch (error) {
      console.error('Error updating document name:', error);
      alert('Ошибка при обновлении названия документа.');
    }
  };

  const updateUserRole = async (documentId: number, username: string, newRole: DocumentRole) => {
    try {
      console.log('Updating user role:', { documentId, username, newRole });
      if (participantHub.connection.state !== 'Connected') {
        throw new Error('SignalR connection is not active. Please reconnect.');
      }
      const user = editDocumentInfo?.users.find(u => u.username === username);
      if (!user) {
        alert('Пользователь не найден.');
        return;
      }
      if (!user.userId) {
        console.error('UserId is undefined for username:', username, 'in editDocumentInfo.users:', editDocumentInfo?.users);
        alert('Ошибка: ID пользователя не определен.');
        return;
      }

      setEditDocumentInfo(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map(u =>
            u.userId === user.userId ? { ...u, role: newRole } : u
          ),
        };
      });
      setTempUserRoles(prev => ({
        ...prev,
        [user.userId]: newRole,
      }));

      console.log('Sending ChangeUserRoleInDocument:', { documentId, userId: user.userId, newRole });
      await sendParticipantMessage('ChangeUserRoleInDocument', [documentId, user.userId, newRole]);
      console.log('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      fetchDocumentInfo(documentId);
      alert('Ошибка при обновлении роли пользователя.');
    }
  };

  const removeUserFromDocument = async (documentId: number, username: string) => {
    try {
      console.log('Removing user from document:', { documentId, username });
      if (participantHub.connection.state !== 'Connected') {
        throw new Error('SignalR connection is not active. Please reconnect.');
      }
      const user = editDocumentInfo?.users.find(u => u.username === username);
      if (!user) {
        alert('Пользователь не найден.');
        return;
      }
      if (!user.userId) {
        console.error('UserId is undefined for username:', username, 'in editDocumentInfo.users:', editDocumentInfo?.users);
        alert('Ошибка: ID пользователя не определен.');
        return;
      }
      console.log('Sending RemoveUserFromDocument:', { documentId, userId: user.userId });
      await sendParticipantMessage('RemoveUserFromDocument', [documentId, user.userId]);
      console.log('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Ошибка при удалении пользователя из документа.');
    }
  };

  const handleUserChange = (
    index: number,
    field: 'username' | 'role',
    value: string,
    isAddUserModal = false
  ) => {
    const updateInputs = (prev: { username: string; role: DocumentRole }[]) => {
      const updated = [...prev];
      if (field === 'role') {
        updated[index].role = value as DocumentRole;
      } else {
        updated[index].username = value;
      }
      return updated;
    };

    if (isAddUserModal) {
      setAddUserInputs(updateInputs);
    } else {
      setUserInputs(updateInputs);
    }
  };

  const addUserInput = (isAddUserModal = false) => {
    const newInput = { username: '', role: 'Viewer' as DocumentRole };
    if (isAddUserModal) {
      setAddUserInputs(prev => [...prev, newInput]);
    } else {
      setUserInputs(prev => [...prev, newInput]);
    }
  };

  const removeUserInput = (index: number, isAddUserModal = false) => {
    if (isAddUserModal) {
      setAddUserInputs(prev => prev.filter((_, i) => i !== index));
    } else {
      setUserInputs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addUsersToDocument = async (documentId: number, users: { username: string; role: DocumentRole }[]) => {
    const validUsers = users
      .map(u => ({ username: u.username.trim(), role: u.role }))
      .filter(u => u.username !== '');

    if (validUsers.length === 0) {
      alert('Добавьте хотя бы одного пользователя.');
      return;
    }

    try {
      await sendParticipantMessage('AddUsersToDocument', [{
        DocumentId: documentId,
        Usernames: validUsers.map(u => u.username),
        Roles: validUsers.map(u => u.role),
      }]);
    } catch (err: any) {
      const errorMessage = err.message?.includes('Пользователи не найдены:')
        ? `Не удалось добавить пользователей: ${err.message.match(/Пользователи не найдены:\s*(.*)/)?.[1] || ''}`
        : 'Ошибка при добавлении пользователей.';
      alert(errorMessage);
      throw err;
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      alert('Название документа обязательно.');
      return;
    }

    const users = userInputs
      .map(u => ({ username: u.username.trim(), role: u.role }))
      .filter(u => u.username !== '');

    try {
      await sendDocumentMessage('CreateDocument', [{
        Name: newDocTitle,
        Usernames: users.map(u => u.username),
        Roles: users.map(u => u.role),
      }]);
      setShowForm(false);
      setNewDocTitle('');
      setUserInputs([{ username: '', role: 'Viewer' }]);
    } catch (err: any) {
      const errorMessage = err.message?.includes('Пользователи не найдены:')
        ? `Документ не создан, не удалось добавить пользователей: ${err.message.match(/Пользователи не найдены:\s*(.*)/)?.[1] || ''}`
        : 'Ошибка при создании документа.';
      alert(errorMessage);
    }
  };

  const handleAddUsersToDocument = async (documentId: number) => {
    try {
      await addUsersToDocument(documentId, addUserInputs);
      setAddUserInputs([{ username: '', role: 'Viewer' }]);
      setShowAddUserModal(null);
      await fetchDocuments();
    } catch {}
  };

  const handleDeleteDocument = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот документ?')) return;
    try {
      await sendDocumentMessage('DeleteDocument', [id]);
    } catch {
      alert('Ошибка при удалении документа.');
    }
  };

  const handleOpenEditModal = async (documentId: number) => {
    try {
      const data = await getDocumentDetails(documentId);
      console.log('Fetched document details:', data);
      setEditDocumentInfo(data);
      setTempUserRoles(
        data.users.reduce((acc, user) => {
          if (user.userId) {
            acc[user.userId] = user.role;
          }
          return acc;
        }, {} as { [userId: number]: DocumentRole })
      );
      setShowEditModal(documentId);
    } catch (error) {
      console.error('Error fetching document details:', error);
      alert('Не удалось получить данные документа');

    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Мои документы</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(prev => !prev)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {showForm ? 'Отмена' : 'Создать документ'}
          </button>
          <Link to="/profile" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Профиль
          </Link>
          <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Выйти
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 mb-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Новый документ</h3>
          <input
            type="text"
            placeholder="Название документа"
            className="border px-2 py-1 w-full mb-4"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
          />
          <div className="space-y-2 mb-4">
            {userInputs.map((input, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Имя пользователя"
                  className="border px-2 py-1 flex-1"
                  value={input.username}
                  onChange={(e) => handleUserChange(index, 'username', e.target.value)}
                />
                <select
                  value={input.role}
                  onChange={(e) => handleUserChange(index, 'role', e.target.value as DocumentRole)}
                  className="border px-2 py-1"
                >
                  <option value="Viewer">Просмотр</option>
                  <option value="Editor">Редактор</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeUserInput(index)}
                  className="text-red-500 hover:text-red-700"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
            <button onClick={() => addUserInput()} className="text-blue-600 hover:underline text-sm">
              + Добавить пользователя
            </button>
          </div>
          <button
            onClick={handleCreateDocument}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Создать
          </button>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Добавить пользователя в документ</h3>
            <div className="space-y-2 mb-4">
              {addUserInputs.map((input, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Имя пользователя"
                    className="border px-2 py-1 flex-1"
                    value={input.username}
                    onChange={(e) => handleUserChange(index, 'username', e.target.value, true)}
                  />
                  <select
                    value={input.role}
                    onChange={(e) => handleUserChange(index, 'role', e.target.value as DocumentRole, true)}
                    className="border px-2 py-1"
                  >
                    <option value="Viewer">Просмотр</option>
                    <option value="Editor">Редактор</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeUserInput(index, true)}
                    className="text-red-500 hover:text-red-700"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addUserInput(true)} className="text-blue-600 hover:underline text-sm">
                + Добавить пользователя
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddUsersToDocument(showAddUserModal)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Добавить
              </button>
              <button
                onClick={() => setShowAddUserModal(null)}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editDocumentInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Информация о документе</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Название документа</label>
              <input
                type="text"
                className="border px-2 py-1 w-full"
                value={editDocumentInfo.name}
                onChange={(e) =>
                  setEditDocumentInfo(prev => (prev ? { ...prev, name: e.target.value } : prev))
                }
                onBlur={(e) => updateDocumentName(showEditModal!, e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Создатель</label>
              <p>{editDocumentInfo.creatorUsername || "Нет автора"}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Пользователи</label>
              {editDocumentInfo.users.length === 0 ? (
                <p>Пользователи не добавлены.</p>
              ) : (
                <ul className="space-y-2">
                  {editDocumentInfo.users.map((user: DocumentParticipantFull, index: number) => (
                    <li key={index} className="flex gap-2 items-center">
                      <span className="flex-1">{user.username}</span>
                      {user.role !== 'Creator' ? (
                        <>
                          <select
                            value={user.role}
                            onChange={(e) =>
                              updateUserRole(showEditModal!, user.username, e.target.value as DocumentRole)
                            }
                            className="border px-2 py-1"
                          >
                            <option value="Viewer">Просмотр</option>
                            <option value="Editor">Редактор</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeUserFromDocument(showEditModal!, user.username)}
                            className="text-red-500 hover:text-red-700"
                            title="Удалить пользователя"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">({user.role})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEditModal(null);
                  setEditDocumentInfo(null);
                }}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center">Загрузка...</div>
      ) : documents.length === 0 ? (
        <p>Документы не найдены.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map(({ document, role }) => (
            <li key={document.id} className="p-4 bg-white rounded shadow flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link to={`/document/${document.id}`} className="text-blue-500 hover:underline">
                  {document.name || '(Без названия)'}
                </Link>
                <span className="text-sm text-gray-500">({role})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddUserModal(document.id)}
                  className="text-green-500 hover:text-green-700"
                  title="Добавить пользователя"
                >
                  <FaPlus className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleOpenEditModal(document.id)}
                  className="text-blue-500 hover:text-blue-700"
                  title="Настройки документа"
                >
                  <FaGear className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteDocument(document.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Удалить документ"
                >
                  <FaTrash className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};