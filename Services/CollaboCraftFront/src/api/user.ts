import { api } from './baseUrl'

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.error('401 Unauthorized');
    }
    return Promise.reject(err);
  }
);

// Тип для получения данных пользователя
export interface User {
  id: number;
  username: string;
  email: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Получение данных текущего пользователя
export const getMe = async (): Promise<User> => {
  const res = await api.get('/users/me');
  return res.data;
};

// Обновление данных текущего пользователя
export const updateMe = async (
  data: UpdateUserRequest
): Promise<void> => {
  await api.put('/users/me', data);
};

// Смена пароля
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<void> => {
  await api.put('/users/me/password', data);
};
