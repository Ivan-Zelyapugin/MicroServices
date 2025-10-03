import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RegisterModel, RegisterResponse, AuthResponse } from '../../models/auth';
import * as authApi from '../../api/auth';

interface RegisterProps {
  onRegisterSuccess: (auth: AuthResponse) => void;
  onRegister: (registerModel: RegisterModel) => Promise<void>;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [userId, setUserId] = useState<number | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!email || !username || !password || !confirmPassword) {
      setError('Все поля обязательны.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    try {
      const res: RegisterResponse = await authApi.register({ email, username, password, confirmPassword });
      setUserId(res.userId);
      setShowConfirmationModal(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации.');
    }
  };

  const handleConfirmEmail = async () => {
    if (!userId || !confirmationCode) {
      setConfirmError('Введите код подтверждения.');
      return;
    }

    try {
      const authResponse: AuthResponse = await authApi.confirmEmail({ userId, code: confirmationCode });
      setShowConfirmationModal(false);
      onRegisterSuccess(authResponse); // передаем токены наверх
    } catch (err: any) {
      setConfirmError(err.response?.data?.error || 'Ошибка подтверждения.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Регистрация</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Подтверждение пароля"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <button
          onClick={handleRegister}
          className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
        >
          Зарегистрироваться
        </button>

        <p className="mt-4 text-center">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">
            Войти
          </Link>
        </p>
      </div>

      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3">Подтверждение Email</h3>
            <input
              type="text"
              placeholder="Введите код из письма"
              value={confirmationCode}
              onChange={e => setConfirmationCode(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            />
            <button
              onClick={handleConfirmEmail}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
            >
              Подтвердить
            </button>
            {confirmError && <p className="text-red-500 mt-2 text-center">{confirmError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
