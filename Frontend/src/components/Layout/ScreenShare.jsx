import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Monitor } from "lucide-react";
import socket from "../../services/socket";
import { useUser } from "../../context/UserContext";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

const ScreenShare = forwardRef(({ onSharingStateChange }, ref) => {
  const user = useUser();
  const [isSharing, setIsSharing] = useState(false);
  const [isSelfSharing, setIsSelfSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const videoRef = useRef(null);

  // Notify parent component when sharing state changes
  useEffect(() => {
    if (onSharingStateChange) {
      onSharingStateChange(isSharing);
    }
  }, [isSharing, onSharingStateChange]);

  // Attach remote stream to video element when receiving remote screen
  useEffect(() => {
    if (videoRef.current && !isSelfSharing) {
      videoRef.current.srcObject = isSharing ? screenStream : null;
    }
  }, [isSharing, isSelfSharing, screenStream]);

  const stopLocalScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      peerConnectionsRef.current[socketId].close();
    });
    peerConnectionsRef.current = {};

    setScreenStream(null);
    setIsSharing(false);
    setIsSelfSharing(false);
    socket.emit("screen-share-stopped", { meetingId: user?.meetingId });
  };

  const startScreenShare = async () => {
    if (isSharing) {
      stopLocalScreenShare();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen sharing requires an HTTPS connection or localhost. Please deploy your server with HTTPS (SSL).");
      console.error("getDisplayMedia not supported or context is insecure (non-HTTPS).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: true,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "exclude",
      });

      localStreamRef.current = stream;
      setScreenStream(stream);
      setIsSharing(true);
      setIsSelfSharing(true);

      socket.emit("screen-share-started", { meetingId: user?.meetingId });

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopLocalScreenShare();
      });
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  // Expose methods & state to parent component via ref
  useImperativeHandle(ref, () => ({
    startScreenShare,
    stopLocalScreenShare,
    toggleScreenShare: startScreenShare,
    isSharing,
    isSelfSharing,
  }));

  useEffect(() => {
    const createOfferForPeer = async (peerSocketId) => {
      if (!localStreamRef.current) return;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current[peerSocketId] = pc;

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screen-ice-candidate", {
            target: peerSocketId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("screen-offer", {
        target: peerSocketId,
        offer,
      });
    };

    const handleUserJoined = ({ socketId }) => {
      if (localStreamRef.current) {
        createOfferForPeer(socketId);
      }
    };

    const handleUserLeft = (socketId) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
    };

    const handleScreenOffer = async ({ caller, offer }) => {
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current[caller] = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setScreenStream(event.streams[0]);
          setIsSharing(true);
          setIsSelfSharing(false);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screen-ice-candidate", {
            target: caller,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("screen-answer", {
        target: caller,
        answer,
      });
    };

    const handleScreenAnswer = async ({ caller, answer }) => {
      const pc = peerConnectionsRef.current[caller];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleScreenIceCandidate = async ({ caller, candidate }) => {
      const pc = peerConnectionsRef.current[caller];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    };

    const handleRemoteScreenStarted = ({ presenterId }) => {
      socket.emit("request-screen-stream", { target: presenterId });
    };

    const handleRequestScreenStream = ({ requesterId }) => {
      if (localStreamRef.current) {
        createOfferForPeer(requesterId);
      }
    };

    const handleRemoteScreenStopped = () => {
      if (!localStreamRef.current) {
        setIsSharing(false);
        setIsSelfSharing(false);
        setScreenStream(null);
      }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("screen-offer", handleScreenOffer);
    socket.on("screen-answer", handleScreenAnswer);
    socket.on("screen-ice-candidate", handleScreenIceCandidate);
    socket.on("screen-share-started", handleRemoteScreenStarted);
    socket.on("request-screen-stream", handleRequestScreenStream);
    socket.on("screen-share-stopped", handleRemoteScreenStopped);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("screen-offer", handleScreenOffer);
      socket.off("screen-answer", handleScreenAnswer);
      socket.off("screen-ice-candidate", handleScreenIceCandidate);
      socket.off("screen-share-started", handleRemoteScreenStarted);
      socket.off("request-screen-stream", handleRequestScreenStream);
      socket.off("screen-share-stopped", handleRemoteScreenStopped);
    };
  }, []);

  if (!isSharing) return null;

  return (
    <div className="screen-share-area">
      {isSelfSharing ? (
        <div className="presenting-banner">
          <Monitor size={48} color="#2563eb" />
          <h2>You are sharing your screen</h2>
          <p>Participants in this meeting can see your screen.</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="screen-preview"
        />
      )}
    </div>
  );
});

ScreenShare.displayName = "ScreenShare";

export default ScreenShare;
