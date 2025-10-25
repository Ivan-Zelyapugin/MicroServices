// src/components/Editor/VoiceChat.tsx
import React, { useEffect, useRef, useState } from 'react';
import { startVoiceHub, voiceHub, sendVoiceMessage } from '../../api/signalr';
import { Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';

interface VoiceChatProps {
  documentId: number;
  username: string;
  userId: number;
  documentTitle?: string;
}

interface Participant {
  connectionId: string;
  username: string;
  userId: number;
  muted?: boolean;
  role?: string;
  audioState?: string;
  videoState?: string;
  isScreenSharing?: boolean;
}

interface RemoteStream {
  connectionId: string;
  stream: MediaStream;
  type: 'audio' | 'video';
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  documentId,
  username,
  userId,
  documentTitle = 'Документ',
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);
  const [viewingScreenId, setViewingScreenId] = useState<string | null>(null);

  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const localAudioStream = useRef<MediaStream | null>(null);
  const localScreenStream = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const participantsRef = useRef<Participant[]>([]);
  const connectionRef = useRef(voiceHub.connection);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // keep participantsRef in sync with state to avoid stale closures
  const setParticipantsAndRef = (updater: (prev: Participant[]) => Participant[] ) => {
    setParticipants(prev => {
      const next = updater(prev);
      participantsRef.current = next;
      return next;
    });
  };

  // helper: add remote stream if not exists (unique on connectionId+type)
  const addRemoteStream = (connectionId: string, stream: MediaStream, type: 'audio' | 'video') => {
    setRemoteStreams(prev => {
      const exists = prev.some(s => s.connectionId === connectionId && s.type === type);
      if (exists) return prev;
      return [...prev, { connectionId, stream, type }];
    });
  };

  // --- Init
  useEffect(() => {
    const connection = voiceHub.connection;
    connectionRef.current = connection;

    const init = async () => {
      try {
        await startVoiceHub();

        // local audio
        localAudioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(localAudioStream.current);
        analyserRef.current = audioCtx.createAnalyser();
        source.connect(analyserRef.current);
        detectSpeaking();

        // join room
        await sendVoiceMessage('JoinRoom', [documentId, userId, username]);

        // add local participant row
        const localParticipant: Participant = {
          connectionId: connection.connectionId || '',
          username,
          userId,
          muted: false,
          audioState: 'Active',
          videoState: 'Inactive',
          isScreenSharing: false,
        };
        setParticipantsAndRef(() => [localParticipant]);
      } catch (e) {
        console.error('Ошибка инициализации голосового чата:', e);
      }
    };

    // --- Handlers

    connection.on('joinroomerror', (message: string) => {
      console.error('Ошибка подключения к комнате:', message);
    });

    // screenshare state changed (server broadcast)
    connection.on('screensharestatechanged', async (changedUserId: number, isSharing: boolean) => {
      console.log('📺 Screen share changed:', changedUserId, isSharing);
      // update participant flag
      setParticipantsAndRef(prev => prev.map(p => p.userId === changedUserId ? { ...p, isScreenSharing: isSharing } : p));

      // if someone started sharing, ensure we have a peer and request negotiation
      if (isSharing) {
        const participant = participantsRef.current.find(p => p.userId === changedUserId);
        if (participant) {
          const connId = participant.connectionId;
          if (!peers.current[connId]) {
            // create peer (initiator) - will trigger offer
            createPeer(connId, true);
          } else {
            // existing peer — request renegotiation so that sender adds video to the offer/answer exchange
            try {
              const pc = peers.current[connId];
              if (pc) {
                // createOffer only if stable
                if (pc.signalingState === 'stable') {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  await sendVoiceMessage('SendOffer', [connId, JSON.stringify(offer)]);
                } else {
                  console.log('Peer not stable for renegotiation', connId, pc.signalingState);
                }
              }
            } catch (err) {
              console.warn('Ошибка renegotiate after screenshare start', err);
            }
          }
        }
      } else {
        // if stopped sharing, remove remote video streams for that connection
        setRemoteStreams(prev => prev.filter(s => !(s.connectionId === (participantsRef.current.find(p => p.userId === changedUserId)?.connectionId) && s.type === 'video')));
      }
    });

    connection.on('ExistingParticipants', (existingRoomData: any) => {
      // server may send array OR object, normalize to array
      const rawList = Array.isArray(existingRoomData) ? existingRoomData : (existingRoomData ? Object.values(existingRoomData) : []);
      const list: Participant[] = rawList.map((p: any) => ({
        connectionId: p.connectionId,
        username: p.username,
        userId: p.userId,
        muted: p.audioState === 'Inactive',
        role: p.role,
        audioState: p.audioState,
        videoState: p.videoState,
        isScreenSharing: p.isScreenSharing,
      }));

      // Keep local participant first (if present)
      setParticipantsAndRef(prev => {
        const local = prev.find(x => x.userId === userId) || {
          connectionId: connection.connectionId || '',
          username,
          userId,
          muted: false,
          audioState: 'Active',
          videoState: 'Inactive',
          isScreenSharing: false,
        };
        // dedupe by userId (prev and list)
        const map = new Map<number, Participant>();
        map.set(local.userId, local);
        list.forEach(p => {
          if (p.userId !== local.userId) map.set(p.userId, p);
        });
        return Array.from(map.values());
      });

      // create peers for each existing (except self)
      list.forEach(p => {
        if (p.userId !== userId && p.connectionId && !peers.current[p.connectionId]) {
          createPeer(p.connectionId, true);
        }
      });
    });

    connection.on('ParticipantJoined', (p: Participant) => {
      // add participant if not exists and create peer
      setParticipantsAndRef(prev => {
        if (prev.some(x => x.connectionId === p.connectionId)) return prev;
        return [...prev, p];
      });
      if (p.connectionId && !peers.current[p.connectionId]) createPeer(p.connectionId, true);
    });

    connection.on('ParticipantLeft', (leftId: number) => {
      // remove participant and close peer
      const part = participantsRef.current.find(p => p.userId === leftId);
      if (part && peers.current[part.connectionId]) {
        try { peers.current[part.connectionId].close(); } catch {}
        delete peers.current[part.connectionId];
      }
      setParticipantsAndRef(prev => prev.filter(p => p.userId !== leftId));
      setRemoteStreams(prev => prev.filter(s => s.connectionId !== part?.connectionId));
    });

    connection.on('AudioStateChanged', (id: number, state: string) => {
      setParticipantsAndRef(prev => prev.map(p => p.userId === id ? { ...p, audioState: state, muted: state === 'Inactive' } : p));
    });

    connection.on('ReceiveOffer', async (fromId: string, offer: string) => {
      try {
        const pc = createPeer(fromId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendVoiceMessage('SendAnswer', [fromId, JSON.stringify(answer)]);
      } catch (err) {
        console.error('ReceiveOffer handler error', err);
      }
    });

    connection.on('ReceiveAnswer', async (fromId: string, answer: string) => {
      try {
        const pc = peers.current[fromId];
        if (!pc) return;
        // setRemoteDescription when it's valid — try/catch to log
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
      } catch (err) {
        console.warn('ReceiveAnswer error', err);
      }
    });

    connection.on('ReceiveIceCandidate', async (fromId: string, candidate: string) => {
      try {
        const pc = peers.current[fromId];
        if (pc && candidate) {
          await pc.addIceCandidate(JSON.parse(candidate));
        }
      } catch (err) {
        console.warn('ReceiveIceCandidate error', err);
      }
    });

    init();

    // cleanup handlers on unmount
    return () => {
      connection.off('ExistingParticipants');
      connection.off('ParticipantJoined');
      connection.off('ParticipantLeft');
      connection.off('AudioStateChanged');
      connection.off('ReceiveOffer');
      connection.off('ReceiveAnswer');
      connection.off('ReceiveIceCandidate');
      connection.off('joinroomerror');
      connection.off('screensharestatechanged');
      // close peers
      Object.values(peers.current).forEach(pc => {
        try { pc.close(); } catch {}
      });
      peers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, username, userId]);

  // --- detect speaking (visual) ---
  const detectSpeaking = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(Math.max(32, analyser.frequencyBinCount));
    const check = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeakingUser(volume > 15 ? username : null);
      requestAnimationFrame(check);
    };
    check();
  };

  // --- createPeer (central) ---
  const createPeer = (targetId: string, initiator: boolean) => {
    if (peers.current[targetId]) return peers.current[targetId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peers.current[targetId] = pc;

    // If negotiation is needed (e.g. after adding track) - send offer to target
    pc.onnegotiationneeded = async () => {
      try {
        // create and send offer only when stable
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
        } else {
          console.log('onnegotiationneeded skipped: signalingState=', pc.signalingState);
        }
      } catch (err) {
        console.warn('onnegotiationneeded error', err);
      }
    };

    // add local audio & screen tracks (if available)
    if (localAudioStream.current) {
      localAudioStream.current.getTracks().forEach(t => pc.addTrack(t, localAudioStream.current!));
    }
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(t => pc.addTrack(t, localScreenStream.current!));
    }

    pc.ontrack = event => {
      // event.streams[0] may be present, otherwise create from track
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      const kind = event.track.kind as 'audio' | 'video';
      console.log('ontrack:', targetId, kind, stream);
      addRemoteStream(targetId, stream, kind);
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        sendVoiceMessage('SendIceCandidate', [targetId, JSON.stringify(event.candidate)]);
      }
    };

    // if we are initiator, start offer flow (but let onnegotiationneeded also handle later renegotiations)
    if (initiator) {
      (async () => {
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
          }
        } catch (err) {
          console.warn('initial createOffer error', err);
        }
      })();
    }

    return pc;
  };

  // --- Mute toggle ---
  const toggleMute = async () => {
    if (!localAudioStream.current) return;
    const newMuted = !muted;
    localAudioStream.current.getAudioTracks().forEach(t => (t.enabled = !newMuted));
    Object.values(peers.current).forEach(pc =>
      pc.getSenders().forEach(s => {
        if (s.track?.kind === 'audio') s.track.enabled = !newMuted;
      })
    );
    setMuted(newMuted);
    await sendVoiceMessage('ToggleAudio', [documentId, userId, newMuted ? 'Inactive' : 'Active']);
  };

  // --- Screen share toggle ---
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenStream.current = displayStream;
        const videoTrack = displayStream.getVideoTracks()[0];

        // attach/replace on each peer. prefer replaceTrack if sender exists
        Object.values(peers.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            try {
              sender.replaceTrack(videoTrack);
            } catch {
              // if replaceTrack fails, addTrack (less ideal)
              pc.addTrack(videoTrack, displayStream);
            }
          } else {
            pc.addTrack(videoTrack, displayStream);
          }
        });

        videoTrack.onended = stopScreenShare;

        setScreenSharing(true);
        await sendVoiceMessage('ToggleScreenShare', [documentId, userId, true]);

        // After adding/replace track, trigger renego for all peers (some browsers need explicit offer)
        for (const [targetId, pc] of Object.entries(peers.current)) {
          try {
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
            }
          } catch (err) {
            console.warn('renegotiate after adding screen track failed', targetId, err);
          }
        }
      } catch (err) {
        console.error('getDisplayMedia failed', err);
      }
    } else {
      await stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(t => t.stop());
      // remove screen tracks from senders (stop/pause)
      Object.values(peers.current).forEach(pc =>
        pc.getSenders().forEach(s => {
          if (s.track?.kind === 'video') {
            try { s.track.stop(); } catch {}
          }
        })
      );
      localScreenStream.current = null;
    }
    setScreenSharing(false);
    await sendVoiceMessage('ToggleScreenShare', [documentId, userId, false]);

    // renegotiate so remote peers drop video (optional)
    for (const [targetId, pc] of Object.entries(peers.current)) {
      try {
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
        }
      } catch (err) {
        console.warn('renegotiate after stop screen failed', targetId, err);
      }
    }
  };

  // --- view screen handler ---
  const viewScreen = (connectionId: string) => {
    setViewingScreenId(prev => (prev === connectionId ? null : connectionId));
  };

  // find stream (video) to display in viewer
  const screenStreamToView = remoteStreams.find(s => s.type === 'video' && s.connectionId === viewingScreenId);

  // attach videoRef when stream changes
  useEffect(() => {
    if (screenStreamToView && videoRef.current) {
      console.log('🎬 attach remote screen stream', screenStreamToView);
      try {
        (videoRef.current as HTMLVideoElement).srcObject = screenStreamToView.stream;
      } catch (e) {
        console.warn('attach video srcObject failed', e);
      }
    } else if (videoRef.current) {
      (videoRef.current as HTMLVideoElement).srcObject = null;
    }
  }, [screenStreamToView]);

  // UI
  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-inner p-3">
      <div className="font-semibold text-lg mb-3 border-b pb-1 text-gray-700">{documentTitle}</div>

      {/* Participants list */}
      <div className="flex-1 overflow-auto space-y-2">
        {participants.map(p => (
          <div
            key={p.connectionId || p.userId}
            className={`p-2 rounded-md text-sm flex justify-between items-center ${
              speakingUser === p.username ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.username || 'Unknown'}</span>
              {p.isScreenSharing && (
                <button
                  onClick={() => viewScreen(p.connectionId)}
                  title={viewingScreenId === p.connectionId ? 'Закрыть просмотр' : 'Просмотреть экран'}
                  className="text-sm p-1"
                >
                  <Monitor size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {p.muted && <MicOff size={16} className="text-red-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* remote screen viewer */}
      {screenStreamToView && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg border mt-2 mb-2"
        />
      )}

      {/* local screen preview */}
      {screenSharing && localScreenStream.current && (
        <video
          ref={el => { if (el) el && (el.srcObject = localScreenStream.current); }}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg border mb-2"
        />
      )}

      {/* audio elements for remote audio */}
      {remoteStreams
        .filter(s => s.type === 'audio')
        .map(s => (
          <audio
            key={s.connectionId + '-a'}
            ref={el => { if (el) el && (el.srcObject = s.stream); }}
            autoPlay
          />
        ))}

      {/* controls */}
      <div className="flex justify-center gap-4 mt-3 pt-2 border-t">
        <button onClick={toggleMute} title={muted ? 'Включить микрофон' : 'Выключить микрофон'} className="p-2 rounded-full hover:bg-gray-100 transition">
          {muted ? <MicOff size={24} className="text-red-500" /> : <Mic size={24} />}
        </button>

        <button onClick={toggleScreenShare} title={screenSharing ? 'Остановить трансляцию' : 'Начать трансляцию'} className="p-2 rounded-full hover:bg-gray-100 transition">
          {screenSharing ? <Monitor size={24} className="text-red-500" /> : <MonitorOff size={24} />}
        </button>
      </div>
    </div>
  );
};
