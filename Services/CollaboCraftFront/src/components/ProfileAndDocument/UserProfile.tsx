import React, { useEffect, useState } from 'react';
import {
  getMe,
  updateMe,
  changePassword,
  User,
  UpdateUserRequest,
  ChangePasswordRequest,
} from '../../api/user';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data);
        setOriginalUser(data);
      })
      .catch(() => setError('Ошибка загрузки профиля'));
  }, []);

  if (!user || !originalUser) return <div>Загрузка...</div>;

  const isProfileChanged =
    user.username !== originalUser.username || user.email !== originalUser.email;

  const handleUpdate = async () => {
    if (!isProfileChanged) return;

    setLoadingProfile(true);
    setMessage('');
    setError('');

    try {
      const data: UpdateUserRequest = {};

  // Отправляем username, только если изменился
  if (user.username !== originalUser.username) {
    data.username = user.username;
  }

  // Отправляем email, только если изменился
  if (user.email !== originalUser.email) {
    data.email = user.email;
  }

  if (Object.keys(data).length === 0) {
    setMessage('Нет изменений');
    return;
  }
      await updateMe(data);
      setOriginalUser({ ...user });
      setMessage('Профиль обновлён');
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.detail ||
          'Ошибка обновления профиля'
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Заполните все поля пароля');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    setLoadingPassword(true);
    setMessage('');
    setError('');

    try {
      await changePassword(passwordData);
      setMessage('Пароль успешно изменён');
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          e.response?.data?.detail ||
          'Ошибка смены пароля'
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Профиль</h2>

      {message && <div className="mb-4 text-green-600">{message}</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <label className="block font-semibold mt-2">Имя пользователя</label>
      <input
        className="w-full mb-2 p-2 border rounded"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
        disabled={loadingProfile || loadingPassword}
      />

      <label className="block font-semibold mt-2">Email</label>
      <input
        className="w-full mb-4 p-2 border rounded"
        type="email"
        value={user.email}
        onChange={(e) => setUser({ ...user, email: e.target.value })}
        disabled={loadingProfile || loadingPassword}
      />

      <button
        onClick={handleUpdate}
        disabled={!isProfileChanged || loadingProfile || loadingPassword}
        className={`w-full py-2 rounded mb-6 ${
          isProfileChanged
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loadingProfile ? 'Сохранение...' : 'Сохранить'}
      </button>

      <h3 className="text-lg font-semibold mb-2">Смена пароля</h3>

      <label className="block font-semibold mt-2">Текущий пароль</label>
      <input
        type="password"
        className="w-full mb-2 p-2 border rounded"
        value={passwordData.currentPassword}
        onChange={(e) =>
          setPasswordData({
            ...passwordData,
            currentPassword: e.target.value,
          })
        }
        disabled={loadingProfile || loadingPassword}
      />

      <label className="block font-semibold mt-2">Новый пароль</label>
      <input
        type="password"
        className="w-full mb-4 p-2 border rounded"
        value={passwordData.newPassword}
        onChange={(e) =>
          setPasswordData({
            ...passwordData,
            newPassword: e.target.value,
          })
        }
        disabled={loadingProfile || loadingPassword}
      />

      <button
        onClick={handleChangePassword}
        disabled={loadingProfile || loadingPassword}
        className={`w-full py-2 rounded ${
          loadingPassword
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {loadingPassword ? 'Смена пароля...' : 'Сменить пароль'}
      </button>
    </div>
  );
};