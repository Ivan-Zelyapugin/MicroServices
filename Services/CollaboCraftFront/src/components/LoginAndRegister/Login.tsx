import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginModel } from '../../models/auth';

interface LoginProps {
  onLogin: (model: LoginModel) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    if (!login) {
      setError('Имя пользователя или Email обязателен.');
      return;
    }
    if (!password) {
      setError('Пароль обязателен.');
      return;
    }
    
    try {
      await onLogin({ login, password });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Произошла ошибка при входе. Пожалуйста, попробуйте снова.';
      setError(errorMessage);
    }
  };

  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-4">Вход</h2>
      <div>
        {error && (
          <p className="text-red-500 mb-4 text-center">{error}</p>
        )}
        <div className="mb-4">
          <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
            Имя пользователя или Email
          </label>
          <input
            id="login"
            type="text"
            placeholder="Введите имя пользователя или Email"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
        >
          Войти
        </button>
        <p className="mt-2 text-center">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-blue-500 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};