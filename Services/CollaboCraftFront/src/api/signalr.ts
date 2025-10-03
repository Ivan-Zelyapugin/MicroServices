import { hubFactory } from './signalrHubFactory';

// Создаем хабы
export const documentHub = hubFactory.createHub('/documenthub');
export const blockHub = hubFactory.createHub('/blockhub');
export const participantHub = hubFactory.createHub('/participanthub');

// Старты хабов
export const startDocumentHub = () => hubFactory.startHub('/documenthub');
export const startBlockHub = () => hubFactory.startHub('/blockhub');
export const startParticipantHub = () => hubFactory.startHub('/participanthub');

// Отправка сообщений
export const sendDocumentMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/documenthub', method, args);

export const sendBlockMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/blockhub', method, args);

export const sendParticipantMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/participanthub', method, args);
