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
  username: string;
  email: string;
  name: string;
  surname: string;
}

export interface ChangePassword {
  OldPassword: string;
  NewPassword: string;
}

// Получение данных текущего пользователя
export const getMe = async (): Promise<User> => {
  const res = await api.get('/user/me');
  return res.data;
};

// Обновление данных текущего пользователя
export const updateMe = async (data: User): Promise<void> => {
  await api.put('/user/me', data);
};

// Смена пароля
export const changePassword = async (data: ChangePassword): Promise<void> => {
  await api.put('/user/password', data);
};
