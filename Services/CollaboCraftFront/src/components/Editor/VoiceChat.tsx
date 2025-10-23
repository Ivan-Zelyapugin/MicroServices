import React, { useEffect, useRef, useState } from 'react';
import { startVoiceHub, voiceHub, sendVoiceMessage } from '../../api/signalr';
import { Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';

interface VoiceChatProps {
  documentId: number;
  username: string;
  documentTitle?: string; // добавим для отображения названия документа
}

interface Participant {
  connectionId: string;
  username: string;
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

  useEffect(() => {
    const connection = voiceHub.connection;

    const init = async () => {
      await startVoiceHub();
      await sendVoiceMessage('JoinRoom', [documentId, 0, username]);
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 🎚️ Запускаем анализ громкости (определяем кто говорит)
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(localStream.current);
      analyserRef.current = audioContext.createAnalyser();
      source.connect(analyserRef.current);

      detectSpeaking();
    };

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
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
    });

    connection.on('ReceiveIceCandidate', async (fromId, candidate) => {
      const pc = peers.current[fromId];
      if (pc && candidate) await pc.addIceCandidate(JSON.parse(candidate));
    });

    init();

    return () => {
      connection.off('ParticipantJoined');
      connection.off('ParticipantLeft');
      connection.off('ReceiveOffer');
      connection.off('ReceiveAnswer');
      connection.off('ReceiveIceCandidate');
    };
  }, [documentId, username]);

  /** 🎤 Анализ громкости микрофона — подсветка активного говорящего */
  const detectSpeaking = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      if (volume > 15) {
        setSpeakingUser(username);
      } else if (speakingUser === username) {
        setSpeakingUser(null);
      }
      requestAnimationFrame(checkVolume);
    };

    checkVolume();
  };

  /** Создание PeerConnection */
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

  /** 🎚️ Переключение микрофона */
  const toggleMute = () => {
    if (!localStream.current) return;
    const enabled = !muted;
    localStream.current.getAudioTracks().forEach(track => (track.enabled = enabled));
    setMuted(!enabled);
  };

  /** 🖥️ Переключение трансляции экрана */
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

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-inner p-3">
      {/* 🔹 Заголовок */}
      <div className="font-semibold text-lg mb-3 border-b pb-1 text-gray-700">
        {documentTitle}
      </div>

      {/* 👥 Участники */}
      <div className="flex-1 overflow-auto space-y-2">
        {participants.map(p => (
          <div
            key={p.connectionId}
            className={`p-2 rounded-md text-sm transition-all ${
              speakingUser === p.username ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
            }`}
          >
            {p.username}
          </div>
        ))}
        {/* отображаем текущего пользователя */}
        <div
          className={`p-2 rounded-md text-sm transition-all ${
            speakingUser === username ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
          }`}
        >
          {username} (Вы)
        </div>
      </div>

      {/* 🎛️ Кнопки управления */}
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
            <MonitorOff size={24} className="text-red-500" />
          ) : (
            <Monitor size={24} />
          )}
        </button>
      </div>
    </div>
  );
};
