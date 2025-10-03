export interface Block {
  id: number;
  text: string;
  documentId: number;
  userId: number;
  sentOn: string;
  editedOn?: string;
}
