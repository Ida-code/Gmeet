import socket from "../../services/socket";
import { useRef, useState } from "react";
import { Monitor } from "lucide-react";

const ScreenShare = () => {
  const screenVideoRef = useRef(null);

  const [isSharing, setIsSharing] = useState(false);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      screenVideoRef.current.srcObject = stream;

      setIsSharing(true);

      // Detect when user clicks "Stop sharing"
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (error) {
      console.log("Screen share error:", error);
    }
  };

  const stopScreenShare = () => {
    const video = screenVideoRef.current;

    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());

      video.srcObject = null;
    }

    setIsSharing(false);
  };

  return (
    <div className="screen-container">
      <button
        className="top-btn"
        onClick={isSharing ? stopScreenShare : startScreenShare}
      >
        <Monitor size={18} />

        {isSharing ? "Stop Screen" : "Share Screen"}
      </button>

      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        style={{
          width: "700px",
          marginTop: "20px",
          border: "1px solid black",
        }}
      />
    </div>
  );
};

export default ScreenShare;
