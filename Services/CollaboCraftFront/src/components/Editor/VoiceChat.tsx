// src/components/Editor/VoiceChat.tsx
import React, { useEffect, useRef, useState } from 'react';
import { startVoiceHub, voiceHub, sendVoiceMessage } from '../../api/signalr';
import { Mic, MicOff, Monitor, MonitorOff } from 'lucide-react';

interface VoiceChatProps {
  documentId: number;
  userId: number;
  username: string;
  documentTitle?: string;
}

interface Participant {
  userId: number;
  username: string;
  connectionId: string;
  audioState?: string;
  isScreenSharing?: boolean;
  speaking?: boolean;
}

interface RemoteStreamItem {
  connectionId: string;
  stream: MediaStream;
  type: 'audio' | 'video';
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
  documentId,
  userId,
  username,
  documentTitle = 'Документ',
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [viewingConnectionId, setViewingConnectionId] = useState<string | null>(null);

  // local streams
  const localAudioStream = useRef<MediaStream | null>(null);
  const localScreenStream = useRef<MediaStream | null>(null);

  // separate peer maps
  const audioPeers = useRef<Map<string, RTCPeerConnection>>(new Map()); 
  const screenPeers = useRef<Map<string, RTCPeerConnection>>(new Map()); 

  // remote media elements refs
  const remoteAudioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteVideoEls = useRef<Map<string, HTMLVideoElement>>(new Map());

  // analyser for speaking detection
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // helper to update participants state immutably and keep dedupes by connectionId/userId
  const upsertParticipants = (items: Participant[]) => {
    setParticipants(prev => {
      const mapByUser = new Map<number, Participant>();
      // keep local existing first
      prev.forEach(p => mapByUser.set(p.userId, p));
      items.forEach(p => mapByUser.set(p.userId, { ...mapByUser.get(p.userId), ...p } as Participant));
      return Array.from(mapByUser.values());
    });
  };

  // --- Initialization: start hub, get existing participants, setup local audio ---
  useEffect(() => {
    let conn = voiceHub.connection;
    let mounted = true;

    const registerHandlers = () => {
      conn.on('JoinRoomError', (msg: string) => {
        console.error('JoinRoomError from server:', msg);
      });

      conn.on('ExistingParticipants', (existing: any) => {
        // normalize incoming structure (server sends array of anonymous objects)
        const arr = Array.isArray(existing) ? existing : (existing ? Object.values(existing) : []);
        const parsed: Participant[] = arr.map((p: any) => ({
          userId: p.userId,
          username: p.username,
          connectionId: p.connectionId,
          audioState: p.audioState,
          isScreenSharing: p.isScreenSharing,
        }));

        // keep local participant at top
        upsertParticipants(parsed);

        // create audio peers to existing participants (we are initiator)
        parsed.forEach(p => {
          if (p.connectionId && p.userId !== userId && !audioPeers.current.has(p.connectionId)) {
            createAudioPeer(p.connectionId, true).catch(e => console.warn('createAudioPeer error', e));
          }
        });
      });

      conn.on('ParticipantJoined', (p: any) => {
        const part: Participant = {
          userId: p.userId,
          username: p.username,
          connectionId: p.connectionId,
          audioState: p.audioState,
          isScreenSharing: p.isScreenSharing,
        };
        setParticipants(prev => (prev.some(x => x.connectionId === part.connectionId) ? prev : [...prev, part]));
        // create audio peer (we are initiator to the joining participant)
        if (!audioPeers.current.has(part.connectionId) && part.connectionId !== (conn.connectionId || '')) {
          createAudioPeer(part.connectionId, true).catch(e => console.warn('createAudioPeer error', e));
        }
      });

      conn.on('ParticipantLeft', (leftUserId: number) => {
        setParticipants(prev => prev.filter(p => p.userId !== leftUserId));
        // close peers for that user
        // find connectionId(s)
        audioPeers.current.forEach((pc, connId) => {
          const p = participants.find(x => x.connectionId === connId);
          if (p?.userId === leftUserId) {
            try { pc.close(); } catch {}
            audioPeers.current.delete(connId);
            const el = remoteAudioEls.current.get(connId);
            if (el) { try { el.srcObject = null; el.remove(); } catch {} }
            remoteAudioEls.current.delete(connId);
          }
        });
        screenPeers.current.forEach((pc, connId) => {
          const p = participants.find(x => x.connectionId === connId);
          if (p?.userId === leftUserId) {
            try { pc.close(); } catch {}
            screenPeers.current.delete(connId);
            const v = remoteVideoEls.current.get(connId);
            if (v) { try { v.srcObject = null; v.remove(); } catch {} }
            remoteVideoEls.current.delete(connId);
          }
        });
      });

      conn.on('AudioStateChanged', (changedUserId: number, newState: string) => {
        setParticipants(prev => prev.map(p => (p.userId === changedUserId ? { ...p, audioState: newState } : p)));
      });

      conn.on('ScreenShareStateChanged', (changedUserId: number, isSharing: boolean) => {
        setParticipants(prev => prev.map(p => (p.userId === changedUserId ? { ...p, isScreenSharing: isSharing } : p)));
        // If someone started sharing, create screen peer to them (initiator)
        if (isSharing) {
          const p = participants.find(x => x.userId === changedUserId);
          if (p && p.connectionId && !screenPeers.current.has(p.connectionId)) {
            createScreenPeer(p.connectionId, true).catch(e => console.warn('createScreenPeer error', e));
          }
        } else {
          // remove video element for that connection
          const p = participants.find(x => x.userId === changedUserId);
          if (p?.connectionId) {
            const v = remoteVideoEls.current.get(p.connectionId);
            if (v) { v.srcObject = null; try { v.remove(); } catch {} }
            remoteVideoEls.current.delete(p.connectionId);
            screenPeers.current.get(p.connectionId)?.close();
            screenPeers.current.delete(p.connectionId);
            if (viewingConnectionId === p.connectionId) setViewingConnectionId(null);
          }
        }
      });

      conn.on('ReceiveOffer', async (fromConnectionId: string, offerSdp: string) => {

        try {
          console.log('Received offer SDP:', offerSdp);

          const cleanedSdp = offerSdp.replace(/\\r\\n/g, '\r\n').trim();
          if (!cleanedSdp.startsWith('v=')) {
            console.error('Invalid SDP: does not start with v=', cleanedSdp);
            return;
          }

          console.log('cleanedSdp:', cleanedSdp);
          const isVideoOffer = cleanedSdp.toLowerCase().includes('m=video');
          
          if (isVideoOffer) {
            const pc = await createScreenPeer(fromConnectionId, false);
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
            console.log("✅ Remote description set successfully");

            console.log(`📨 Setting remote description (type=${isVideoOffer ? "video" : "audio"}) for`, fromConnectionId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendVoiceMessage('SendAnswer', [fromConnectionId, answer.sdp]);
          } else {
            const pc = await createAudioPeer(fromConnectionId, false);
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
            console.log("✅ Remote description set successfully");

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendVoiceMessage('SendAnswer', [fromConnectionId, answer.sdp]);
          }
        } catch (err) {
          console.warn('ReceiveOffer handler error', err);
        }
      });

      conn.on('ReceiveAnswer', async (fromConnectionId: string, answerSdp: string) => {
        // Try both maps
        try {
          const pcA = audioPeers.current.get(fromConnectionId);
          if (pcA && pcA.signalingState === 'have-local-offer') {
            console.log(`📨 Setting remote description for`, fromConnectionId);

            await pcA.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
            console.log("✅ Remote description set successfully");

            return;
          }
          const pcV = screenPeers.current.get(fromConnectionId);
          if (pcV && pcV.signalingState === 'have-local-offer') {
            console.log(`📨 ReceiveAnswer from ${fromConnectionId}`, answerSdp.slice(0, 80) + "...");

            await pcV.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
            console.log("✅ Remote description set successfully");

            return;
          }
        } catch (err) {
          console.warn('ReceiveAnswer error', err);
        }
      });

      conn.on('ReceiveIceCandidate', async (fromConnectionId: string, candidateJson: string) => {
        console.log("📩 ReceiveIceCandidate:", candidateJson);
        try {
          const cand = JSON.parse(candidateJson);
          const ice = new RTCIceCandidate(cand);
          console.log("🧩 Parsed ICE candidate:", ice);

          const pcA = audioPeers.current.get(fromConnectionId);
          if (pcA) {
            await pcA.addIceCandidate(ice);
            console.log("✅ Added ICE candidate to audio peer");
            return;
          }
          const pcV = screenPeers.current.get(fromConnectionId);
          if (pcV) {
            await pcV.addIceCandidate(ice);
            console.log("✅ Added ICE candidate to screen peer");
            return;
          }
          console.warn("⚠️ No peer found for ICE candidate", fromConnectionId);
        } catch (err) {
          console.error("❌ Error in ReceiveIceCandidate", err);
        }
      });

    };

    const start = async () => {
      try {
        await startVoiceHub();
        if (!mounted) return;
        registerHandlers();
        // ensure we have local audio
        await initLocalAudio();
        // join room on server
        await sendVoiceMessage('JoinRoom', [documentId, userId, username]);
        // add local placeholder participant (server will reply with ExistingParticipants)
        setParticipants(prev => {
          if (prev.some(p => p.userId === userId)) return prev;
          return [{ userId, username, connectionId: voiceHub.connection.connectionId || '', audioState: 'Active', isScreenSharing: false }, ...prev];
        });
      } catch (err) {
        console.error('VoiceChat init error', err);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        voiceHub.connection.off('ExistingParticipants');
        voiceHub.connection.off('ParticipantJoined');
        voiceHub.connection.off('ParticipantLeft');
        voiceHub.connection.off('AudioStateChanged');
        voiceHub.connection.off('ScreenShareStateChanged');
        voiceHub.connection.off('ReceiveOffer');
        voiceHub.connection.off('ReceiveAnswer');
        voiceHub.connection.off('ReceiveIceCandidate');
        voiceHub.connection.off('JoinRoomError');
      } catch {}
      // close peers and stop local tracks
      audioPeers.current.forEach(pc => { try { pc.close(); } catch {} });
      screenPeers.current.forEach(pc => { try { pc.close(); } catch {} });
      audioPeers.current.clear();
      screenPeers.current.clear();
      if (localAudioStream.current) {
        localAudioStream.current.getTracks().forEach(t => t.stop());
        localAudioStream.current = null;
      }
      if (localScreenStream.current) {
        localScreenStream.current.getTracks().forEach(t => t.stop());
        localScreenStream.current = null;
      }
      if (analyserRef.current && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, userId, username]);

  // ----------------- WebRTC helpers -----------------
  const initLocalAudio = async () => {
    try {
      console.log("🎤 initLocalAudio(): starting getUserMedia({audio:true})");
      if (!localAudioStream.current) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        localAudioStream.current = s;

        // analyser for speaking detection
        try {
          const ctx = new AudioContext();
          const src = ctx.createMediaStreamSource(s);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          analyserRef.current = analyser;
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            const sum = data.reduce((a, b) => a + b, 0);
            const avg = sum / data.length;
            // threshold tuned experimentally; adjust if necessary
            const speaking = avg > 25 && !muted;
            if (speaking) {
              // mark local user speaking
              
              setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, speaking: true } : { ...p, speaking: false }));
              console.log("🎤 Local audio tracks:", s.getTracks().map(t => ({ id: t.id, enabled: t.enabled, kind: t.kind })));

            } else {
              setParticipants(prev => prev.map(p => p.userId === userId ? { ...p, speaking: false } : p));
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch (e) { console.warn('analyser init failed', e); }
      }
    } catch (err) {
      console.error('getUserMedia audio error', err);
    }
  };

  // create audio peer with a given remote connectionId
  const createAudioPeer = async (remoteConnectionId: string, initiator: boolean): Promise<RTCPeerConnection> => {
    // if exists, return it
    console.log(`🔗 createAudioPeer(${remoteConnectionId}, initiator=${initiator})`);

    const existing = audioPeers.current.get(remoteConnectionId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  iceTransportPolicy: "all"
});
    console.log("🧩 New RTCPeerConnection for audio created", pc);

    audioPeers.current.set(remoteConnectionId, pc);

    pc.onicecandidate = ev => {
      console.log(`🧊 [${remoteConnectionId}] New ICE candidate:`, ev.candidate);

      if (!ev.candidate) {
        console.log("ICE candidate gathering complete");
        return;
      }

      console.log("🌍 ICE candidate generated:", ev.candidate);
      // Отправляем только нужные поля (чистый объект)
      const cand = {
        candidate: ev.candidate.candidate,
        sdpMid: ev.candidate.sdpMid,
        sdpMLineIndex: ev.candidate.sdpMLineIndex,
      };

      const candJson = JSON.stringify(cand);
      sendVoiceMessage('SendIceCandidate', [remoteConnectionId, candJson]);
      console.log("📤 Sent ICE candidate via signaling:", ev.candidate.candidate);
    };


    pc.oniceconnectionstatechange = () => {
  console.log(`🧭 [${remoteConnectionId}] ICE connection state:`, pc.iceConnectionState);
};


    pc.onsignalingstatechange = () => {
  console.log(`📡 [${remoteConnectionId}] Signaling state:`, pc.signalingState);
};

pc.onconnectionstatechange = () => {
  console.log(`⚡ [${remoteConnectionId}] Connection state:`, pc.connectionState);
};


    pc.ontrack = ev => {
      console.log(`🎧 [${remoteConnectionId}] ontrack fired with ${ev.streams.length} stream(s)`);
      const stream = ev.streams[0];
      // attach/create audio element
      let el = remoteAudioEls.current.get(remoteConnectionId);
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        el.controls = false;
        el.style.display = 'none'; // hidden; playback happens silently
        document.body.appendChild(el);
        remoteAudioEls.current.set(remoteConnectionId, el);
      }
      el.srcObject = stream;
      console.log(`🎶 [${remoteConnectionId}] Audio element srcObject set, autoplay=${el.autoplay}`);
el.onplay = () => console.log(`▶️ [${remoteConnectionId}] Remote audio started playing`);
el.onpause = () => console.log(`⏸ [${remoteConnectionId}] Remote audio paused`);
el.onerror = e => console.warn(`⚠️ [${remoteConnectionId}] Audio element error`, e);

    };
    
    // add local audio track(s)
    if (localAudioStream.current) {
      localAudioStream.current.getTracks().forEach(t => pc.addTrack(t, localAudioStream.current!));
    }

    if (initiator) {
      try {
        const offer = await pc.createOffer();
        console.log('Sending offer SDP:', JSON.stringify(offer));
        await pc.setLocalDescription(offer);
        // send offer to remote (target = remoteConnectionId)
        await sendVoiceMessage('SendOffer', [remoteConnectionId, offer.sdp]);
      } catch (err) {
        console.warn('createAudioPeer/offer error', err);
      }
    }

    return pc;
  };

  // create screen peer (video only) with a given remote connectionId
  const createScreenPeer = async (remoteConnectionId: string, initiator: boolean): Promise<RTCPeerConnection> => {
    const existing = screenPeers.current.get(remoteConnectionId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  iceTransportPolicy: "all"
});
    screenPeers.current.set(remoteConnectionId, pc);

    pc.onicecandidate = ev => {
      console.log(`🧊 [${remoteConnectionId}] New ICE candidate:`, ev.candidate);

  if (!ev.candidate) {
    console.log("ICE candidate gathering complete");
    return;
  }

  // Отправляем только нужные поля (чистый объект)
  const cand = {
    candidate: ev.candidate.candidate,
    sdpMid: ev.candidate.sdpMid,
    sdpMLineIndex: ev.candidate.sdpMLineIndex,
  };

  const candJson = JSON.stringify(cand);
  sendVoiceMessage('SendIceCandidate', [remoteConnectionId, candJson]);
  console.log("SendIceCandidate to signaling:", cand);
};


    pc.ontrack = ev => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      // attach/create video element
      let v = remoteVideoEls.current.get(remoteConnectionId);
      if (!v) {
        v = document.createElement('video');
        v.autoplay = true;
        v.playsInline = true;
        v.controls = false;
        v.className = 'rounded-lg border mt-2';
        // keep it off-DOM: we show requested stream in our UI via ref linking
        document.body.appendChild(v);
        remoteVideoEls.current.set(remoteConnectionId, v);
      }
      v.srcObject = stream;
    };

    // add local screen tracks (if we're sharing)
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(t => pc.addTrack(t, localScreenStream.current!));
    }

    if (initiator) {
      try {
        const offer = await pc.createOffer();
        console.log('Sending offer SDP:', JSON.stringify(offer));
        await pc.setLocalDescription(offer);
        await sendVoiceMessage('SendOffer', [remoteConnectionId, offer.sdp]);
      } catch (err) {
        console.warn('createScreenPeer/offer error', err);
      }
    }

    return pc;
  };

  // --------------- Controls ------------------
  const toggleMute = async () => {
    if (!localAudioStream.current) return;
    const newMuted = !muted;
    localAudioStream.current.getAudioTracks().forEach(t => (t.enabled = !newMuted));
    setMuted(newMuted);
    // notify server (send Active/Inactive — server parses to enum)
    await sendVoiceMessage('ToggleAudio', [documentId, userId, newMuted ? 'Inactive' : 'Active']);
    // update local participant state
    setParticipants(prev => prev.map(p => (p.userId === userId ? { ...p, audioState: newMuted ? 'Inactive' : 'Active' } : p)));
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localScreenStream.current = stream;
      setScreenSharing(true);
      // notify server state
      await sendVoiceMessage('ToggleScreenShare', [documentId, userId, true]);

      // create screen peer for each participant
      participants.forEach(p => {
        if (p.connectionId && p.userId !== userId && !screenPeers.current.has(p.connectionId)) {
          createScreenPeer(p.connectionId, true).catch(e => console.warn('createScreenPeer error', e));
        }
      });

      // when screen sharing stops locally, notify server and cleanup
      const t = stream.getTracks()[0];
      t.onended = async () => {
        await stopScreenShare();
      };
    } catch (err) {
      console.error('startScreenShare error', err);
    }
  };

  const stopScreenShare = async () => {
    if (localScreenStream.current) {
      localScreenStream.current.getTracks().forEach(t => t.stop());
      localScreenStream.current = null;
    }
    setScreenSharing(false);
    await sendVoiceMessage('ToggleScreenShare', [documentId, userId, false]);
    // close screen peers
    screenPeers.current.forEach((pc, connId) => {
      try { pc.close(); } catch {}
      const v = remoteVideoEls.current.get(connId);
      if (v) { v.srcObject = null; try { v.remove(); } catch {} }
      remoteVideoEls.current.delete(connId);
    });
    screenPeers.current.clear();
    if (viewingConnectionId) setViewingConnectionId(null);
  };

  // viewing another user's screen: attach their hidden video element to our UI video tag
  const attachRemoteVideoToRef = (connectionId: string, videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    const remoteVid = remoteVideoEls.current.get(connectionId);
    if (remoteVid) videoEl.srcObject = remoteVid.srcObject;
    else videoEl.srcObject = null;
  };

  // render
  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-inner p-3">
      <div className="font-semibold text-lg mb-3 border-b pb-1 text-gray-700">{documentTitle}</div>

      <div className="flex-1 overflow-auto space-y-2">
        {participants.length === 0 && <div className="text-gray-500">В чате никого нет</div>}
        {participants.map(p => (
          <div
            key={p.connectionId || p.userId}
            className={`p-2 rounded-md text-sm flex items-center justify-between ${
              p.speaking ? 'bg-green-100 border border-green-400' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{p.username || `User ${p.userId}`}</div>
              {p.audioState === 'Inactive' ? <MicOff size={14} className="text-red-500" /> : <Mic size={14} />}
            </div>

            <div className="flex items-center gap-2">
              {p.isScreenSharing && (
                <button
                  onClick={() => setViewingConnectionId(prev => (prev === p.connectionId ? null : p.connectionId))}
                  className="p-1 text-sm rounded hover:bg-gray-100"
                >
                  <Monitor size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* viewer for remote screen */}
      {viewingConnectionId && (
        <div className="mt-3">
          <div className="mb-2 text-sm font-medium">Просмотр экрана</div>
          <video
            autoPlay
            playsInline
            muted
            ref={el => {
              attachRemoteVideoToRef(viewingConnectionId, el);
            }}
            className="w-full h-48 bg-black rounded-lg"
          />
          <button
            onClick={() => setViewingConnectionId(null)}
            className="mt-2 px-3 py-1 rounded bg-gray-200 text-sm"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* controls */}
      <div className="flex justify-center gap-4 mt-3 pt-2 border-t">
        <button
          onClick={toggleMute}
          title={muted ? 'Включить микрофон' : 'Выключить микрофон'}
          className={`p-2 rounded-full hover:bg-gray-100 transition ${muted ? 'bg-red-100' : 'bg-green-100'}`}
        >
          {muted ? <MicOff size={20} className="text-red-600" /> : <Mic size={20} className="text-green-600" />}
        </button>

        {!screenSharing ? (
          <button
            onClick={startScreenShare}
            title="Начать трансляцию экрана"
            className="p-2 rounded-full hover:bg-gray-100 transition bg-blue-100"
          >
            <MonitorOff size={20} />
          </button>
        ) : (
          <button
            onClick={stopScreenShare}
            title="Остановить трансляцию экрана"
            className="p-2 rounded-full hover:bg-gray-100 transition bg-yellow-100"
          >
            <Monitor size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
