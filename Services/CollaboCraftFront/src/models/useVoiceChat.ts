import { useEffect, useRef, useState } from "react";
import { sendVoiceMessage, startVoiceHub, voiceHub } from "../api/signalr";

type ParticipantDto = {
  connectionId: string;
  userId: number;
  username: string;
  isMuted: boolean;
  isScreenSharing: boolean;
};

export type VoiceParticipant = ParticipantDto & {
  isSelf: boolean;
  isSpeaking: boolean;
};

export type ScreenShareItem = {
  connectionId: string;
  username: string;
  stream: MediaStream;
  isSelf: boolean;
};

const buildIceServers = (): RTCIceServer[] => {
  const host = window.location.hostname;
  const turnHost = process.env.REACT_APP_TURN_HOST || host;
  const turnPort = process.env.REACT_APP_TURN_PORT || "3478";
  const turnUser = process.env.REACT_APP_TURN_USERNAME || "collabocraft";
  const turnPassword = process.env.REACT_APP_TURN_PASSWORD || "collabocraft_secret";

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: `stun:${turnHost}:${turnPort}` },
    {
      urls: [`turn:${turnHost}:${turnPort}?transport=udp`, `turn:${turnHost}:${turnPort}?transport=tcp`],
      username: turnUser,
      credential: turnPassword,
    },
  ];
};

export const useVoiceChat = (documentId: number) => {
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoSenders = useRef<Map<string, RTCRtpSender>>(new Map());
  const localAudioStream = useRef<MediaStream | null>(null);
  const localScreenStream = useRef<MediaStream | null>(null);
  const remoteScreenStreams = useRef<Map<string, MediaStream>>(new Map());
  const remoteAudioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  const monitorFrames = useRef<Map<string, number>>(new Map());
  const makingOffer = useRef<Map<string, boolean>>(new Map());
  const ignoreOffer = useRef<Map<string, boolean>>(new Map());
  const selfConnectionId = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShares, setScreenShares] = useState<ScreenShareItem[]>([]);
  const participantsRef = useRef<VoiceParticipant[]>([]);
  const isAudioUnlocked = useRef(false);

  const unlockAudioPlayback = async () => {
    if (isAudioUnlocked.current) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state !== "running") {
        await audioContextRef.current.resume();
      }

      isAudioUnlocked.current = true;
    } catch (error) {
      console.warn("Не удалось активировать AudioContext", error);
    }
  };

  const upsertParticipant = (participant: VoiceParticipant) => {
    setParticipants((prev) => {
      const idx = prev.findIndex((p) => p.connectionId === participant.connectionId);
      if (idx === -1) {
        return [...prev, participant];
      }

      const next = [...prev];
      next[idx] = { ...next[idx], ...participant };
      return next;
    });
  };

  const removeParticipant = (connectionId: string) => {
    setParticipants((prev) => prev.filter((p) => p.connectionId !== connectionId));
  };

  const cleanupPeer = (connectionId: string) => {
    peers.current.get(connectionId)?.close();
    peers.current.delete(connectionId);
    videoSenders.current.delete(connectionId);

    remoteAudioElements.current.get(connectionId)?.pause();
    remoteAudioElements.current.delete(connectionId);

    const frameId = monitorFrames.current.get(connectionId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      monitorFrames.current.delete(connectionId);
    }
    makingOffer.current.delete(connectionId);
    ignoreOffer.current.delete(connectionId);

    remoteScreenStreams.current.delete(connectionId);
    setScreenShares((prev) => prev.filter((s) => s.connectionId !== connectionId));
  };

  const refreshScreenShares = () => {
    setScreenShares(() => {
      const remote = Array.from(remoteScreenStreams.current.entries()).map(([connectionId, stream]) => {
        const participant = participantsRef.current.find((p) => p.connectionId === connectionId);
        return {
          connectionId,
          username: participant?.username || "Участник",
          stream,
          isSelf: false,
        };
      });

      const local: ScreenShareItem[] =
        localScreenStream.current && selfConnectionId.current
          ? [
              {
                connectionId: selfConnectionId.current,
                username: "Вы",
                stream: localScreenStream.current,
                isSelf: true,
              },
            ]
          : [];

      return [...local, ...remote];
    });
  };

  const monitorAudio = (stream: MediaStream, connectionId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 512;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;

      setParticipants((prev) =>
        prev.map((p) =>
          p.connectionId === connectionId
            ? { ...p, isSpeaking: !p.isMuted && volume > 25 }
            : p
        )
      );

      const frameId = requestAnimationFrame(loop);
      monitorFrames.current.set(connectionId, frameId);
    };

    loop();
  };

  const createPeer = async (targetConnectionId: string, initiator: boolean) => {
    if (peers.current.has(targetConnectionId)) {
      return peers.current.get(targetConnectionId)!;
    }

    if (!localAudioStream.current) {
      throw new Error("Локальный аудиопоток не инициализирован");
    }

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
    });

    localAudioStream.current.getTracks().forEach((track) => {
      pc.addTrack(track, localAudioStream.current!);
    });

    const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
    videoSenders.current.set(targetConnectionId, videoTransceiver.sender);
    const screenTrack = localScreenStream.current?.getVideoTracks()[0];
    if (screenTrack) {
      await videoTransceiver.sender.replaceTrack(screenTrack);
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      sendVoiceMessage("SendIceCandidate", [targetConnectionId, JSON.stringify(event.candidate)]).catch(
        (err) => console.error("Ошибка отправки ICE", err)
      );
    };

    pc.ontrack = (event) => {
      if (event.track.kind === "audio") {
        const stream = new MediaStream([event.track]);
        let audio = remoteAudioElements.current.get(targetConnectionId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudioElements.current.set(targetConnectionId, audio);
        }

        audio.srcObject = stream;
        audio.onloadedmetadata = () => {
          audio?.play().catch(() => {
            // повторим play после первого пользовательского действия
          });
        };
        monitorAudio(stream, targetConnectionId);
      }

      if (event.track.kind === "video") {
        const stream = new MediaStream([event.track]);
        remoteScreenStreams.current.set(targetConnectionId, stream);
        refreshScreenShares();

        event.track.onended = () => {
          remoteScreenStreams.current.delete(targetConnectionId);
          refreshScreenShares();
        };
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        cleanupPeer(targetConnectionId);
        removeParticipant(targetConnectionId);
      }
    };

    peers.current.set(targetConnectionId, pc);

    if (initiator) {
      try {
        makingOffer.current.set(targetConnectionId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendVoiceMessage("SendOffer", [targetConnectionId, JSON.stringify(offer)]);
      } finally {
        makingOffer.current.set(targetConnectionId, false);
      }
    }

    return pc;
  };

  const shouldInitiateWith = (targetConnectionId: string) => {
    const ownId = selfConnectionId.current;
    if (!ownId) {
      return false;
    }

    return ownId.localeCompare(targetConnectionId) < 0;
  };

  const ensurePeerConnection = async (targetConnectionId: string) => {
    const initiator = shouldInitiateWith(targetConnectionId);
    await createPeer(targetConnectionId, initiator);
  };

  const renegotiateAllPeers = async () => {
    const tasks = Array.from(peers.current.entries()).map(async ([targetConnectionId, pc]) => {
      if (pc.signalingState !== "stable") {
        return;
      }

      try {
        makingOffer.current.set(targetConnectionId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendVoiceMessage("SendOffer", [targetConnectionId, JSON.stringify(offer)]);
      } finally {
        makingOffer.current.set(targetConnectionId, false);
      }
    });

    await Promise.all(tasks);
  };

  const stopScreenSharing = async () => {
    const stream = localScreenStream.current;
    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => track.stop());
    localScreenStream.current = null;

    for (const videoSender of videoSenders.current.values()) {
      await videoSender.replaceTrack(null);
    }
    await renegotiateAllPeers();

    setIsScreenSharing(false);
    refreshScreenShares();
    await sendVoiceMessage("SetScreenSharing", [documentId, false]);
  };

  const startScreenSharing = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const screenTrack = stream.getVideoTracks()[0];
    localScreenStream.current = stream;

    for (const videoSender of videoSenders.current.values()) {
      await videoSender.replaceTrack(screenTrack);
    }
    await renegotiateAllPeers();

    screenTrack.onended = () => {
      stopScreenSharing().catch((err) => console.error("Ошибка остановки шаринга", err));
    };

    setIsScreenSharing(true);
    refreshScreenShares();
    await sendVoiceMessage("SetScreenSharing", [documentId, true]);
  };

  const toggleScreenShare = async () => {
    await unlockAudioPlayback();

    if (isScreenSharing) {
      await stopScreenSharing();
      return;
    }

    await startScreenSharing();
  };

  const toggleMute = async () => {
    await unlockAudioPlayback();

    const track = localAudioStream.current?.getAudioTracks()[0];
    if (!track) {
      return;
    }

    const nextMuted = track.enabled;
    track.enabled = !track.enabled;
    setIsMuted(nextMuted);

    setParticipants((prev) =>
      prev.map((p) =>
        p.connectionId === selfConnectionId.current
          ? { ...p, isMuted: nextMuted, isSpeaking: false }
          : p
      )
    );

    await sendVoiceMessage("SetMute", [documentId, nextMuted]);
  };

  useEffect(() => {
    participantsRef.current = participants;
    refreshScreenShares();
  }, [participants]);

  useEffect(() => {
    const onUserGesture = () => {
      unlockAudioPlayback().catch(() => {});

      remoteAudioElements.current.forEach((audio) => {
        audio.play().catch(() => {});
      });
    };

    window.addEventListener("pointerdown", onUserGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onUserGesture);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(documentId) || documentId <= 0) {
      return;
    }

    let alive = true;

    const init = async () => {
      try {
        await startVoiceHub();
        selfConnectionId.current = voiceHub.connection.connectionId;

        const username = localStorage.getItem("username") || "Вы";
        localAudioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        await unlockAudioPlayback();

        const selfParticipant: VoiceParticipant = {
          connectionId: selfConnectionId.current || "self",
          userId: -1,
          username,
          isMuted: false,
          isScreenSharing: false,
          isSelf: true,
          isSpeaking: false,
        };
        upsertParticipant(selfParticipant);

        voiceHub.connection.off("UserJoinedVoice");
        voiceHub.connection.off("UserLeftVoice");
        voiceHub.connection.off("UserMuteChanged");
        voiceHub.connection.off("UserScreenShareChanged");
        voiceHub.connection.off("ReceiveOffer");
        voiceHub.connection.off("ReceiveAnswer");
        voiceHub.connection.off("ReceiveIceCandidate");

        voiceHub.connection.on("UserJoinedVoice", async (participant: ParticipantDto) => {
          if (!alive || !participant?.connectionId) {
            return;
          }

          const isSelf = participant.connectionId === selfConnectionId.current;
          upsertParticipant({ ...participant, isSelf, isSpeaking: false });

          if (!isSelf) {
            await ensurePeerConnection(participant.connectionId);
          }
        });

        voiceHub.connection.on("UserLeftVoice", (connectionId: string) => {
          cleanupPeer(connectionId);
          removeParticipant(connectionId);
        });

        voiceHub.connection.on("UserMuteChanged", (connectionId: string, muted: boolean) => {
          setParticipants((prev) =>
            prev.map((p) =>
              p.connectionId === connectionId
                ? { ...p, isMuted: muted, isSpeaking: muted ? false : p.isSpeaking }
                : p
            )
          );
        });

        voiceHub.connection.on("UserScreenShareChanged", (connectionId: string, sharing: boolean) => {
          setParticipants((prev) =>
            prev.map((p) =>
              p.connectionId === connectionId ? { ...p, isScreenSharing: sharing } : p
            )
          );

          if (!sharing) {
            remoteScreenStreams.current.delete(connectionId);
            refreshScreenShares();
          }
        });

        voiceHub.connection.on("ReceiveOffer", async (fromConnectionId: string, offer: string) => {
          if (!fromConnectionId || fromConnectionId === selfConnectionId.current) {
            return;
          }

          const pc = await createPeer(fromConnectionId, false);
          const polite = !shouldInitiateWith(fromConnectionId);
          const offerCollision =
            makingOffer.current.get(fromConnectionId) === true || pc.signalingState !== "stable";

          ignoreOffer.current.set(fromConnectionId, !polite && offerCollision);
          if (ignoreOffer.current.get(fromConnectionId)) {
            return;
          }

          if (offerCollision) {
            try {
              await pc.setLocalDescription({ type: "rollback" });
            } catch (error) {
              console.warn("Не удалось выполнить rollback для glare", error);
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendVoiceMessage("SendAnswer", [fromConnectionId, JSON.stringify(answer)]);
        });

        voiceHub.connection.on("ReceiveAnswer", async (fromConnectionId: string, answer: string) => {
          const pc = peers.current.get(fromConnectionId);
          if (!pc) {
            return;
          }

          if (pc.signalingState !== "have-local-offer") {
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
        });

        voiceHub.connection.on("ReceiveIceCandidate", async (fromConnectionId: string, candidate: string) => {
          const pc = peers.current.get(fromConnectionId);
          if (!pc) {
            return;
          }

          try {
            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
          } catch (error) {
            if (!ignoreOffer.current.get(fromConnectionId)) {
              throw error;
            }
          }
        });

        const existingParticipants = (await sendVoiceMessage("JoinVoice", [documentId])) as ParticipantDto[];
        for (const existing of existingParticipants) {
          if (!existing?.connectionId) {
            continue;
          }

          const isSelf = existing.connectionId === selfConnectionId.current;
          upsertParticipant({ ...existing, isSelf, isSpeaking: false });

          if (!isSelf) {
            await ensurePeerConnection(existing.connectionId);
          }
        }
      } catch (error) {
        console.error("Voice init error", error);
      }
    };

    init();

    return () => {
      alive = false;

      stopScreenSharing().catch(() => {});

      peers.current.forEach((pc) => pc.close());
      peers.current.clear();
      videoSenders.current.clear();

      remoteAudioElements.current.forEach((audio) => audio.pause());
      remoteAudioElements.current.clear();

      monitorFrames.current.forEach((id) => cancelAnimationFrame(id));
      monitorFrames.current.clear();

      localAudioStream.current?.getTracks().forEach((track) => track.stop());
      localAudioStream.current = null;

      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;

      remoteScreenStreams.current.clear();
      setScreenShares([]);
      setParticipants([]);

      sendVoiceMessage("LeaveVoice", [documentId]).catch(() => {});
    };
  }, [documentId]);

  return {
    participants,
    isMuted,
    isScreenSharing,
    screenShares,
    toggleMute,
    toggleScreenShare,
  };
};