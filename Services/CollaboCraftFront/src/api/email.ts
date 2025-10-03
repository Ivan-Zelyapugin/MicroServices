import { api } from './baseUrl';

export const sendEmail = async (data: any): Promise<void> => {
  await api.post('/email/send', data);
};