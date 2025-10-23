import React, { useEffect, useRef, useState } from 'react';
import { startVoiceHub, voiceHub, sendVoiceMessage } from '../../api/signalr';
import { Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';

interface VoiceChatProps {
  documentId: number;
  username: string;
  documentTitle?: string;
}

interface Participant {
  connectionId: string;
  username: string;
  userId: number; 
  muted?: boolean;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  documentId,
  username,
  documentTitle = 'Документ',
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);

  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const localStream = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // 🔹 Инициализация соединения
  useEffect(() => {
    const connection = voiceHub.connection;

    const init = async () => {
      await startVoiceHub();

      // Подключаемся к комнате
      await sendVoiceMessage('JoinRoom', [documentId, 0, username]);

      // Запрашиваем микрофон
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Не удалось получить доступ к микрофону:', err);
        return;
      }

      // 🎚️ Инициализируем анализ громкости
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(localStream.current);
      analyserRef.current = audioContext.createAnalyser();
      source.connect(analyserRef.current);
      detectSpeaking();
    };

    // 🔸 Подписки SignalR
    connection.on('ParticipantJoined', (p: Participant) => {
      console.log('👤 joined', p);
      setParticipants(prev => [...prev, p]);
      createPeer(p.connectionId, true);
    });

    connection.on('ParticipantLeft', (id: string) => {
      console.log('👋 left', id);
      if (peers.current[id]) {
        peers.current[id].close();
        delete peers.current[id];
      }
      setParticipants(prev => prev.filter(p => p.connectionId !== id));
    });

    connection.on('ReceiveOffer', async (fromId, offer) => {
      const pc = createPeer(fromId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendVoiceMessage('SendAnswer', [fromId, JSON.stringify(answer)]);
    });

    connection.on('ReceiveAnswer', async (fromId, answer) => {
      const pc = peers.current[fromId];
      if (!pc) return;

      const desc = new RTCSessionDescription(JSON.parse(answer));
      if (pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(desc);
        } catch (err) {
          console.warn('⚠️ Ошибка setRemoteDescription (ReceiveAnswer):', err);
        }
      } else {
        console.log('🟡 Игнорируем дублирующий answer (состояние stable)');
      }
    });

    connection.on('ReceiveIceCandidate', async (fromId, candidate) => {
      const pc = peers.current[fromId];
      if (pc && candidate) await pc.addIceCandidate(JSON.parse(candidate));
    });

    // 🟢 Подписка на ParticipantMuted
    connection.on('ParticipantMuted', (connectionId: string, isMuted: boolean) => {
      console.log('🔇 ParticipantMuted', connectionId, isMuted);
      setParticipants(prev =>
        prev.map(p =>
          p.connectionId === connectionId ? { ...p, muted: isMuted } : p
        )
      );
    });

    init();

    // Очистка
    return () => {
      connection.off('ParticipantJoined');
      connection.off('ParticipantLeft');
      connection.off('ReceiveOffer');
      connection.off('ReceiveAnswer');
      connection.off('ReceiveIceCandidate');
      connection.off('ParticipantMuted');
    };
  }, [documentId, username]);

  // 🎤 Анализ громкости микрофона
  const detectSpeaking = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      if (volume > 15) setSpeakingUser(username);
      else if (speakingUser === username) setSpeakingUser(null);
      requestAnimationFrame(checkVolume);
    };

    checkVolume();
  };

  // 🎧 Создание PeerConnection
  function createPeer(targetId: string, initiator: boolean) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peers.current[targetId] = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current!));
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        sendVoiceMessage('SendIceCandidate', [targetId, JSON.stringify(event.candidate)]);
      }
    };

    pc.ontrack = event => {
      const audio = document.createElement('audio');
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };

    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
        });
    }

    return pc;
  }

  // 🎙️ Переключение микрофона
  const toggleMute = async () => {
  // Если микрофон ещё не получен, запрашиваем доступ
  if (!localStream.current) {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Не удалось получить микрофон:', err);
      return;
    }
  }

  // Находим своего участника по username
  const self = participants.find(p => p.username === username);
  if (!self) {
    console.warn('Не найден текущий участник для mute');
    return;
  }

  // Переключаем локальный микрофон
  const newMuted = !muted;
  localStream.current.getAudioTracks().forEach(track => (track.enabled = !newMuted));
  setMuted(newMuted);

  // Отправляем на сервер правильный userId
  try {
    await sendVoiceMessage('ToggleMute', [documentId, self.userId, newMuted]);
    console.log(`🔇 Отправлено ToggleMute для userId=${self.userId}, muted=${newMuted}`);
  } catch (e) {
    console.warn('Не удалось отправить ToggleMute на сервер', e);
  }
};


  // 🖥️ Трансляция экрана
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      displayStream.getTracks().forEach(track => {
        Object.values(peers.current).forEach(pc => pc.addTrack(track, displayStream));
      });
      setScreenSharing(true);
    } else {
      Object.values(peers.current).forEach(pc =>
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === 'video') sender.track.stop();
        })
      );
      setScreenSharing(false);
    }
  };

  // 🧩 Интерфейс
  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-inner p-3">
      <div className="font-semibold text-lg mb-3 border-b pb-1 text-gray-700">
        {documentTitle}
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {participants.map(p => (
          <div
            key={p.connectionId}
            className={`p-2 rounded-md text-sm transition-all flex items-center justify-between ${
              speakingUser === p.username ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
            }`}
          >
            <span>{p.username}</span>
            {p.muted && <MicOff size={16} className="text-red-400" />}
          </div>
        ))}
        <div
          className={`p-2 rounded-md text-sm transition-all flex items-center justify-between ${
            speakingUser === username ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
          }`}
        >
          <span>{username} (Вы)</span>
          {muted && <MicOff size={16} className="text-red-400" />}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-3 pt-2 border-t">
        <button
          onClick={toggleMute}
          title={muted ? 'Включить микрофон' : 'Выключить микрофон'}
          className="p-2 rounded-full hover:bg-gray-100 transition"
        >
          {muted ? <MicOff size={24} className="text-red-500" /> : <Mic size={24} />}
        </button>

        <button
          onClick={toggleScreenShare}
          title={screenSharing ? 'Остановить трансляцию' : 'Начать трансляцию'}
          className="p-2 rounded-full hover:bg-gray-100 transition"
        >
          {screenSharing ? (
            <Monitor size={24} className="text-red-500" />
          ) : (
            <MonitorOff size={24} />
          )}
        </button>
      </div>
    </div>
  );
};
