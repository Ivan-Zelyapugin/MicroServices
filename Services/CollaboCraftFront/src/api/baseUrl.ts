import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обрабатываем 401 Unauthorized
api.interceptors.response.use(
  res => res,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - возможно, токен истёк');
      try {
        await refreshAccessToken(); // функция ниже
        return api(error.config);    // повторяем исходный запрос
      } catch {
        console.error('❌ Не удалось обновить токен');
        // здесь можно редирект на логин
      }
    }
    return Promise.reject(error);
  }
);

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('Нет refresh токена');

  const res = await axios.put('/api/auth/refresh-token', { refreshToken }); // ✅ тело запроса
  const { accessToken, refreshToken: newRefreshToken } = res.data;

  localStorage.setItem('accessToken', accessToken);

  if (newRefreshToken && newRefreshToken !== refreshToken) {
    localStorage.setItem('refreshToken', newRefreshToken);
  }

  return accessToken;
};
