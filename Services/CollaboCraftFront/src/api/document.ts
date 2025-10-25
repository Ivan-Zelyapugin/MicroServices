import { api } from './baseUrl'
import { UserDocumentDto, DocumentDetails } from '../models/document';

export const getMyDocuments = async (): Promise<UserDocumentDto[]> => {
  const res = await api.get<UserDocumentDto[]>('/document/my');
  return res.data;
};

export const getDocumentDetails = async (id: number): Promise<DocumentDetails> => {
  const res = await api.get<DocumentDetails>(`/document/${id}`);
  return res.data;
};

export const getCurrentUser = async (): Promise<{ id: number; username: string; email: string; role: string }> => {
  const res = await api.get('/document/me');
  return res.data;
};