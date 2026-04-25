import { hubFactory } from './signalrHubFactory';

// Создаем хабы
export const documentHub = hubFactory.createHub('/documenthub');
export const blockHub = hubFactory.createHub('/blockhub');
export const participantHub = hubFactory.createHub('/participanthub');
export const voiceHub = hubFactory.createHub('/voicehub');

// Старты хабов
export const startDocumentHub = () => hubFactory.startHub('/documenthub');
export const startBlockHub = () => hubFactory.startHub('/blockhub');
export const startParticipantHub = () => hubFactory.startHub('/participanthub');
export const startVoiceHub = () => hubFactory.startHub('/voicehub');

// Отправка сообщений
export const sendDocumentMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/documenthub', method, args);

export const sendBlockMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/blockhub', method, args);

export const sendParticipantMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/participanthub', method, args);

export const sendVoiceMessage = (method: string, args: any[]) =>
  hubFactory.sendMessage('/voicehub', method, args);