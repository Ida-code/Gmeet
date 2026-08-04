import { useState, useEffect, useRef } from "react";
import { UserContext } from "./context/UserContext";

import Whiteboard from "./components/Layout/Whiteboard";
import InstructorVideo from "./components/Layout/InstructorVideo";
import Toolbar from "./components/Layout/Toolbar";
import MeetingLobby from "./components/Layout/MeetingLobby";

import socket from "./services/socket";

import "./App.css";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState(null);

  const [isSharing, setIsSharing] = useState(false);
  const [isSelfSharing, setIsSelfSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);

  const handleJoin = (userData) => {
    setUser(userData);
    socket.emit("join-meeting", userData);
    setJoined(true);
  };

  const stopLocalScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
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
      console.log("Screen share error:", error);
    }
  };

  useEffect(() => {
    if (!joined) return;

    // When someone joins or signals screen share start, if we are sharing, create peer connection & send offer
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

    const handleScreenOffer = async ({ caller, offer }) => {
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current[caller] = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setScreenStream(event.streams[0]);
          setIsSharing(true);
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
        setScreenStream(null);
      }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("screen-offer", handleScreenOffer);
    socket.on("screen-answer", handleScreenAnswer);
    socket.on("screen-ice-candidate", handleScreenIceCandidate);
    socket.on("screen-share-started", handleRemoteScreenStarted);
    socket.on("request-screen-stream", handleRequestScreenStream);
    socket.on("screen-share-stopped", handleRemoteScreenStopped);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("screen-offer", handleScreenOffer);
      socket.off("screen-answer", handleScreenAnswer);
      socket.off("screen-ice-candidate", handleScreenIceCandidate);
      socket.off("screen-share-started", handleRemoteScreenStarted);
      socket.off("request-screen-stream", handleRequestScreenStream);
      socket.off("screen-share-stopped", handleRemoteScreenStopped);
    };
  }, [joined]);

  if (!joined) {
    return <MeetingLobby onJoin={handleJoin} />;
  }

  return (
    <UserContext.Provider value={user}>
      <div className="app-container">
        <div className="main-layout">
          <Whiteboard
            isSharing={isSharing}
            isSelfSharing={isSelfSharing}
            screenStream={screenStream}
          />

          <InstructorVideo isVideoOff={isVideoOff} isMuted={isMuted} />
        </div>

        <Toolbar
          isVideoOff={isVideoOff}
          setIsVideoOff={setIsVideoOff}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          startScreenShare={startScreenShare}
          isSharing={isSharing}
        />
      </div>
    </UserContext.Provider>
  );
}

export default App;
