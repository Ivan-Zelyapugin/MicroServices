import { api } from './baseUrl';
import { LoginModel, RegisterModel, RegisterResponse, AuthResponse } from '../models/auth';

export const login = async (model: LoginModel): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', model);
  return response.data;
};

export const register = async (model: RegisterModel): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>('/auth/register', model);
  return response.data;
};

export const confirmEmail = async (data: { userId: number; code: string }): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/confirm-email', data);
  return response.data;
};
