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
  audioState?: 'Active' | 'Inactive';
  isScreenSharing?: boolean;
}

interface RemoteStream {
  connectionId: string;
  stream: MediaStream;
  type: 'audio' | 'screen';
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  documentId,
  username,
  userId,
  documentTitle = 'Документ',
}) => {
  // state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [viewingConnectionId, setViewingConnectionId] = useState<string | null>(null);

  // refs
  const connectionRef = useRef(voiceHub.connection);
  const peersAudio = useRef<Record<string, RTCPeerConnection>>({});
  const peersScreen = useRef<Record<string, RTCPeerConnection>>({});
  const localAudioStream = useRef<MediaStream | null>(null);
  const localScreenStream = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoViewRef = useRef<HTMLVideoElement | null>(null);
  const participantsRef = useRef<Participant[]>([]);

  // helpers to keep ref in sync
  const setParticipantsAndRef = (updater: (prev: Participant[]) => Participant[]) => {
    setParticipants(prev => {
      const next = updater(prev);
      participantsRef.current = next;
      return next;
    });
  };

  const addRemoteStream = (connectionId: string, stream: MediaStream, type: 'audio' | 'screen') => {
    setRemoteStreams(prev => {
      if (prev.some(r => r.connectionId === connectionId && r.type === type)) return prev;
      return [...prev, { connectionId, stream, type: type === 'screen' ? 'screen' : 'audio' }];
    });
  };

  // create audio-only peer
  const createAudioPeer = (targetConnId: string, initiator: boolean) => {
    if (peersAudio.current[targetConnId]) return peersAudio.current[targetConnId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersAudio.current[targetConnId] = pc;

    // add local audio tracks if available
    if (localAudioStream.current) {
      localAudioStream.current.getAudioTracks().forEach(t => pc.addTrack(t, localAudioStream.current!));
    }

    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      addRemoteStream(targetConnId, stream, 'audio');
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendVoiceMessage('SendIceCandidate', [targetConnId, JSON.stringify(ev.candidate)]);
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceMessage('SendOffer', [targetConnId, JSON.stringify(pc.localDescription)]);
        }
      } catch (err) {
        console.warn('audio onnegotiationneeded error', err);
      }
    };

    // if initiator, kick off initial offer
    if (initiator) {
      (async () => {
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendVoiceMessage('SendOffer', [targetConnId, JSON.stringify(pc.localDescription)]);
          }
        } catch (err) {
          console.warn('audio initial offer error', err);
        }
      })();
    }

    return pc;
  };

  // create screen-only peer (video)
  const createScreenPeer = (targetConnId: string, initiator: boolean) => {
    if (peersScreen.current[targetConnId]) return peersScreen.current[targetConnId];

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersScreen.current[targetConnId] = pc;

    // add local screen tracks if available
    if (localScreenStream.current) {
      localScreenStream.current.getVideoTracks().forEach(t => pc.addTrack(t, localScreenStream.current!));
    }

    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      addRemoteStream(targetConnId, stream, 'screen');
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendVoiceMessage('SendIceCandidate', [targetConnId, JSON.stringify(ev.candidate)]);
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceMessage('SendOffer', [targetConnId, JSON.stringify(pc.localDescription)]);
        }
      } catch (err) {
        console.warn('screen onnegotiationneeded error', err);
      }
    };

    if (initiator) {
      (async () => {
        try {
          if (pc.signalingState === 'stable') {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendVoiceMessage('SendOffer', [targetConnId, JSON.stringify(pc.localDescription)]);
          }
        } catch (err) {
          console.warn('screen initial offer error', err);
        }
      })();
    }

    return pc;
  };

  // attach video viewer when remote screen chosen
  useEffect(() => {
    const remote = remoteStreams.find(r => r.type === 'screen' && r.connectionId === viewingConnectionId);
    if (videoViewRef.current) {
      if (remote) {
        try {
          videoViewRef.current.srcObject = remote.stream;
        } catch (e) {
          console.warn('attach screen stream failed', e);
        }
      } else {
        // clear
        try { (videoViewRef.current as HTMLVideoElement).srcObject = null; } catch {}
      }
    }
  }, [viewingConnectionId, remoteStreams]);

  // receive offer/answer/ice and route to audio/screen peer by SDP content
  useEffect(() => {
    const connection = voiceHub.connection;
    connectionRef.current = connection;

    // init local audio and join
    const init = async () => {
      try {
        await startVoiceHub();

        // get mic
        try {
          localAudioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          console.error('getUserMedia audio failed', err);
        }

        // analyser for speaking visualization (optional)
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(localAudioStream.current!);
          analyserRef.current = audioCtx.createAnalyser();
          source.connect(analyserRef.current);
          // we don't start heavy analyzer loop here to keep code simple (you can add if needed)
        } catch {}

        // join room on server
        await sendVoiceMessage('JoinRoom', [documentId, userId, username]);
      } catch (err) {
        console.error('VoiceChat init error', err);
      }
    };

    // helpers to parse incoming descriptor and route by sdp (video or not)
    const isVideoDesc = (descJson: any) => {
      try {
        const sdp: string = descJson.sdp || '';
        return sdp.includes('\nm=video') || sdp.includes('m=video');
      } catch {
        return false;
      }
    };

    // ExistingParticipants: server sends list of already connected participants (we need to show them and create peers)
    connection.on('ExistingParticipants', (existing: any) => {
      const arr = Array.isArray(existing) ? existing : (existing ? Object.values(existing) : []);
      const parsed: Participant[] = arr.map((p: any) => ({
        connectionId: p.connectionId,
        username: p.username,
        userId: p.userId,
        audioState: p.audioState === 'Inactive' ? 'Inactive' : 'Active',
        isScreenSharing: !!p.isScreenSharing,
      }));

      // merge into participants (dedupe by userId)
      setParticipantsAndRef(prev => {
        const map = new Map<number, Participant>();
        // keep local if exist
        prev.forEach(x => map.set(x.userId, x));
        parsed.forEach(x => map.set(x.userId, x));
        // ensure local is present
        if (!map.has(userId)) {
          map.set(userId, { connectionId: connection.connectionId || '', username, userId, audioState: 'Active', isScreenSharing: false });
        }
        return Array.from(map.values());
      });

      // create audio peers to existing others
      parsed.forEach(p => {
        if (p.connectionId && p.userId !== userId) {
          createAudioPeer(p.connectionId, true);
          // if they already share screen, create screen peer too (initiator)
          if (p.isScreenSharing) createScreenPeer(p.connectionId, true);
        }
      });
    });

    // participant joined
    connection.on('ParticipantJoined', (p: any) => {
      const part: Participant = {
        connectionId: p.connectionId,
        username: p.username,
        userId: p.userId,
        audioState: p.audioState === 'Inactive' ? 'Inactive' : 'Active',
        isScreenSharing: !!p.isScreenSharing,
      };

      setParticipantsAndRef(prev => {
        if (prev.some(x => x.userId === part.userId)) return prev;
        return [...prev, part];
      });

      // create audio peer to them
      if (part.connectionId && part.userId !== userId) {
        createAudioPeer(part.connectionId, true);
        if (part.isScreenSharing) createScreenPeer(part.connectionId, true);
      }
    });

    // participant left
    connection.on('ParticipantLeft', (leftUserId: number) => {
      const left = participantsRef.current.find(p => p.userId === leftUserId);
      if (left) {
        // close peers
        const conn = left.connectionId;
        if (peersAudio.current[conn]) {
          try { peersAudio.current[conn].close(); } catch {}
          delete peersAudio.current[conn];
        }
        if (peersScreen.current[conn]) {
          try { peersScreen.current[conn].close(); } catch {}
          delete peersScreen.current[conn];
        }
      }
      setParticipantsAndRef(prev => prev.filter(p => p.userId !== leftUserId));
      setRemoteStreams(prev => prev.filter(r => r.connectionId !== (left?.connectionId)));
      // if the left user was being viewed, close view
      if (left?.connectionId === viewingConnectionId) setViewingConnectionId(null);
    });

    // audio state changed (mute/unmute)
    connection.on('AudioStateChanged', (changedUserId: number, newState: string) => {
      setParticipantsAndRef(prev => prev.map(p => p.userId === changedUserId ? { ...p, audioState: newState === 'Inactive' ? 'Inactive' : 'Active' } : p));
    });

    // screen share state changed
    connection.on('ScreenShareStateChanged', (changedUserId: number, isSharing: boolean) => {
      // update flag
      setParticipantsAndRef(prev => prev.map(p => p.userId === changedUserId ? { ...p, isScreenSharing: isSharing } : p));
      // if someone started sharing, create screen peer for them (initiator)
      const participant = participantsRef.current.find(p => p.userId === changedUserId);
      if (isSharing && participant?.connectionId) {
        if (!peersScreen.current[participant.connectionId]) createScreenPeer(participant.connectionId, true);
      } else if (!isSharing) {
        // remove their remote screen streams
        setRemoteStreams(prev => prev.filter(r => !(r.connectionId === participant?.connectionId && r.type === 'screen')));
        if (viewingConnectionId === participant?.connectionId) setViewingConnectionId(null);
      }
    });

    // ReceiveOffer: fromId is sender's connectionId, offer is localDescription JSON string
    connection.on('ReceiveOffer', async (fromConnId: string, offerStr: string) => {
      try {
        const descObj = JSON.parse(offerStr);
        const isVideo = isVideoDesc(descObj);

        const pc = isVideo ? createScreenPeer(fromConnId, false) : createAudioPeer(fromConnId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(descObj));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendVoiceMessage('SendAnswer', [fromConnId, JSON.stringify(pc.localDescription)]);
      } catch (err) {
        console.error('ReceiveOffer handler error', err);
      }
    });

    // ReceiveAnswer
    connection.on('ReceiveAnswer', async (fromConnId: string, answerStr: string) => {
      try {
        const descObj = JSON.parse(answerStr);
        const isVideo = isVideoDesc(descObj);
        const pc = isVideo ? peersScreen.current[fromConnId] : peersAudio.current[fromConnId];
        if (!pc) return;
        // set remote
        await pc.setRemoteDescription(new RTCSessionDescription(descObj));
      } catch (err) {
        console.warn('ReceiveAnswer error', err);
      }
    });

    // ReceiveIceCandidate
    connection.on('ReceiveIceCandidate', async (fromConnId: string, candidateStr: string) => {
      try {
        const candidate = JSON.parse(candidateStr);
        const pcAudio = peersAudio.current[fromConnId];
        const pcScreen = peersScreen.current[fromConnId];
        if (pcAudio) await pcAudio.addIceCandidate(candidate);
        if (pcScreen) await pcScreen.addIceCandidate(candidate);
      } catch (err) {
        console.warn('ReceiveIceCandidate error', err);
      }
    });

    // Join room error
    connection.on('JoinRoomError', (msg: string) => {
      console.error('JoinRoomError from server:', msg);
    });

    init();

    return () => {
      connection.off('ExistingParticipants');
      connection.off('ParticipantJoined');
      connection.off('ParticipantLeft');
      connection.off('AudioStateChanged');
      connection.off('ScreenShareStateChanged');
      connection.off('ReceiveOffer');
      connection.off('ReceiveAnswer');
      connection.off('ReceiveIceCandidate');
      connection.off('JoinRoomError');

      // close all peers
      Object.values(peersAudio.current).forEach(pc => { try { pc.close(); } catch {} });
      Object.values(peersScreen.current).forEach(pc => { try { pc.close(); } catch {} });
      peersAudio.current = {};
      peersScreen.current = {};
      // stop local media
      try { localAudioStream.current?.getTracks().forEach(t => t.stop()); } catch {}
      try { localScreenStream.current?.getTracks().forEach(t => t.stop()); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, username, userId]);

  // toggle mute locally + inform server (via ToggleAudio)
  const toggleMute = async () => {
    if (!localAudioStream.current) return;
    const newMuted = !muted;
    localAudioStream.current.getAudioTracks().forEach(t => (t.enabled = !newMuted));
    // also ensure senders tracks enabled
    Object.values(peersAudio.current).forEach(pc =>
      pc.getSenders().forEach(s => { if (s.track?.kind === 'audio') (s.track.enabled = !newMuted); })
    );
    setMuted(newMuted);
    // notify server: ToggleAudio(documentId, userId, MediaState)
    await sendVoiceMessage('ToggleAudio', [documentId, userId, newMuted ? 'Inactive' : 'Active']);
  };

  // toggle screen share
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        localScreenStream.current = display;
        // add track(s) to existing screen peers or create peers
        const videoTrack = display.getVideoTracks()[0];
        for (const [connId, pc] of Object.entries(peersScreen.current)) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            try { sender.replaceTrack(videoTrack); } catch { pc.addTrack(videoTrack, display); }
          } else {
            pc.addTrack(videoTrack, display);
          }
        }
        // create peers to participants that don't have screen pc yet
        participantsRef.current.forEach(p => {
          if (p.userId !== userId && p.connectionId && !peersScreen.current[p.connectionId]) {
            createScreenPeer(p.connectionId, true);
          }
        });

        // also set up local preview in UI
        setScreenSharing(true);
        await sendVoiceMessage('ToggleScreenShare', [documentId, userId, true]);

        // when screen stops
        videoTrack.onended = async () => {
          await stopScreenShare();
        };
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
      localScreenStream.current = null;
    }
    // remove video senders
    for (const pc of Object.values(peersScreen.current)) {
      pc.getSenders().forEach(s => { if (s.track?.kind === 'video') { try { s.track.stop(); } catch {} } });
    }
    setScreenSharing(false);
    await sendVoiceMessage('ToggleScreenShare', [documentId, userId, false]);

    // renegotiate peers so they drop m-lines if needed
    for (const [targetId, pc] of Object.entries(peersScreen.current)) {
      try {
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceMessage('SendOffer', [targetId, JSON.stringify(pc.localDescription)]);
        }
      } catch (err) {
        console.warn('renegotiate after stopScreen failed', err);
      }
    }
  };

  // view/unview someone's screen
  const viewScreen = (connectionId: string) => {
    setViewingConnectionId(prev => (prev === connectionId ? null : connectionId));
  };

  // UI render
  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-inner p-3">
      <div className="font-semibold text-lg mb-3 border-b pb-1 text-gray-700">{documentTitle}</div>

      {/* Participants box */}
      <div className="flex-1 overflow-auto space-y-2 mb-2">
        {participants.map(p => (
          <div key={p.connectionId || p.userId} className={`p-2 rounded-md text-sm flex justify-between items-center ${p.audioState === 'Active' ? 'bg-white' : 'bg-gray-100 opacity-80'}`}>
            <div className="flex items-center gap-3">
              <span className="font-medium">{p.username || 'Unknown'}</span>
              {p.isScreenSharing && (
                <button onClick={() => viewScreen(p.connectionId)} title={viewingConnectionId === p.connectionId ? 'Закрыть просмотр' : 'Просмотреть экран'} className="text-sm p-1">
                  <Monitor size={16} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {p.audioState === 'Inactive' ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} />}
            </div>
          </div>
        ))}
      </div>

      {/* screen viewer */}
      {viewingConnectionId && (
        <div className="mb-2">
          <div className="text-sm font-medium mb-1">Просмотр экрана</div>
          <video ref={videoViewRef} autoPlay playsInline className="w-full rounded-lg border" />
        </div>
      )}

      {/* local screen preview */}
      {screenSharing && localScreenStream.current && (
        <div className="mb-2">
          <div className="text-sm font-medium mb-1">Вы транслируете экран (локально)</div>
          <video ref={el => { if (el) { try { el.srcObject = localScreenStream.current!; } catch {} } }} autoPlay muted playsInline className="w-full rounded-lg border" />
        </div>
      )}

      {/* hidden audio elements for remote audio */}
      {remoteStreams.filter(r => r.type === 'audio').map(r => (
        <audio
          key={r.connectionId + '-a'}
          ref={el => { if (el) { try { el.srcObject = r.stream; } catch {} } }}
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
