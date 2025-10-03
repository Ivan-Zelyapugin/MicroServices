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
