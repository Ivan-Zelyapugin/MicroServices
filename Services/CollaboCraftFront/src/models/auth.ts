export interface RegisterModel {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginModel {
  login: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}
