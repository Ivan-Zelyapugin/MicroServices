import { Block } from '../models/block';
import { api } from './baseUrl'


export const getBlocksByDocument = async (
  documentId: number,
  from: string
): Promise<Block[]> => {
  const response = await api.get<Block[]>(`/block/${documentId}`, {
    params: { from },
  });
  return response.data;
};
