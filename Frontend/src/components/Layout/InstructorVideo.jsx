import socket from "../../services/socket";
import { useRef, useEffect, useState } from "react";
import Participants from "./Participants";

const InstructorVideo = ({ isVideoOff, isMuted }) => {
  const videoRef = useRef(null);

  const [stream, setStream] = useState(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!stream) return;

    stream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOff));

    stream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
  }, [stream, isVideoOff, isMuted]);

  // Listen for instructor mute
  useEffect(() => {
    const handleForceMute = () => {
      if (!stream) return;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      alert("Instructor muted your microphone.");
    };

    socket.on("force-mute", handleForceMute);

    return () => {
      socket.off("force-mute", handleForceMute);
    };
  }, [stream]);

  return (
    <div className="sidebar">
      <div className="instructor-card">
        <div className="card-header">Instructor Video</div>

        <div className="video-wrapper">
          <video ref={videoRef} autoPlay playsInline muted />

          <div className="audio-indicator">
            <span className="bar" style={{ height: "8px" }} />
            <span className="bar" style={{ height: "14px" }} />
            <span className="bar" style={{ height: "10px" }} />
          </div>
        </div>
      </div>

      <Participants />
    </div>
  );
};

export default InstructorVideo;
