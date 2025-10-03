export interface Document {
  id: number;
  name: string;
  creatorId: number;
}

export type DocumentRole = 'Creator' | 'Editor' | 'Viewer';

export interface UserDocumentDto {
  document: Document;
  role: DocumentRole;
}

export interface DocumentParticipantFull {
  userId: number;
  username: string;
  name: string;
  surname: string;
  documentId: number;
  role: 'Creator' | 'Editor' | 'Viewer';
}

export interface DocumentDetails {
  id: number;
  name: string;
  creatorUsername: string;
  users: DocumentParticipantFull[];
}