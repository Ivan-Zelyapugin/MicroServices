import React, { useEffect, useState } from 'react';
import { getMe, updateMe, changePassword, User, ChangePassword } from '../../api/user';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User>({
    username: '',
    email: '',
    name: '',
    surname: '',
  });

  const [passwordData, setChangePassword] = useState<ChangePassword>({
    OldPassword: '',
    NewPassword: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setError('Ошибка загрузки профиля'));
  }, []);

  const handleUpdate = async () => {
    try {
      setMessage('');
      setError('');
      await updateMe(user);
      setMessage('Профиль обновлён');
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.message || e.response?.data?.detail || 'Ошибка обновления профиля';
      setError(msg);
    }
  };

  const handleChangePassword = async () => {
    try {
      setMessage('');
      setError('');
      console.log(passwordData);
      await changePassword(passwordData);
      setMessage('Пароль успешно изменён');
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.message || e.response?.data?.detail || 'Ошибка смены пароля';
      setError(msg);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Профиль</h2>

      {message && <div className="mb-4 text-green-600">{message}</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <label className="block font-semibold mt-2">Имя пользователя (username)</label>
      <input
        className="w-full mb-2 p-2 border rounded"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
      />

      <label className="block font-semibold mt-2">Email</label>
      <input
        className="w-full mb-2 p-2 border rounded"
        value={user.email}
        onChange={(e) => setUser({ ...user, email: e.target.value })}
      />

      <label className="block font-semibold mt-2">Имя</label>
      <input
        className="w-full mb-2 p-2 border rounded"
        value={user.name}
        onChange={(e) => setUser({ ...user, name: e.target.value })}
      />

      <label className="block font-semibold mt-2">Фамилия</label>
      <input
        className="w-full mb-4 p-2 border rounded"
        value={user.surname}
        onChange={(e) => setUser({ ...user, surname: e.target.value })}
      />

      <button
        onClick={handleUpdate}
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 mb-6"
      >
        Сохранить
      </button>

      <h3 className="text-lg font-semibold mb-2">Смена пароля</h3>

      <label className="block font-semibold mt-2">Старый пароль</label>
      <input
        type="password"
        className="w-full mb-2 p-2 border rounded"
        value={passwordData.OldPassword}
        onChange={(e) => setChangePassword({ ...passwordData, OldPassword: e.target.value })}
      />

      <label className="block font-semibold mt-2">Новый пароль</label>
      <input
        type="password"
        className="w-full mb-4 p-2 border rounded"
        value={passwordData.NewPassword}
        onChange={(e) => setChangePassword({ ...passwordData, NewPassword: e.target.value })}
      />

      <button
        onClick={handleChangePassword}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Сменить пароль
      </button>
    </div>
  );
};
