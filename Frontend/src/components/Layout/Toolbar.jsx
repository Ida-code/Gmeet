import { useUser } from "../../context/UserContext";
import {
  VideoOff,
  Pause,
  MicOff,
  Users,
  Disc,
  LogOut,
  HelpCircle,
  MessageSquare,
  Monitor,
} from "lucide-react";

const Toolbar = ({
  isVideoOff,
  setIsVideoOff,
  isMuted,
  setIsMuted,
  startScreenShare,
  isSharing,
}) => {
  const user = useUser();

  return (
    <div className="bottom-bar">
      {/* VIDEO - Instructor Only */}
      {user?.role === "Instructor" && (
        <button
          className={`control-btn ${isVideoOff ? "active-off" : ""}`}
          onClick={() => setIsVideoOff(!isVideoOff)}
        >
          <VideoOff size={20} />
          {isVideoOff ? "Video On" : "Video Off"}
        </button>
      )}

      <button className="control-btn">
        <Pause size={20} />
        Pause Video
      </button>

      {/* Everyone can mute themselves */}
      <button
        className={`control-btn ${isMuted ? "active-off" : ""}`}
        onClick={() => setIsMuted(!isMuted)}
      >
        <MicOff size={20} />
        {isMuted ? "Unmute Mic" : "Mute Mic"}
      </button>

      {/* SCREEN SHARE - Instructor Only */}
      {user?.role === "Instructor" && (
        <button className="control-btn" onClick={startScreenShare}>
          <Monitor size={20} />
          {isSharing ? "Stop Screen" : "Share Screen"}
        </button>
      )}

      {/* Instructor Only */}
      {user?.role === "Instructor" && (
        <button className="control-btn">
          <Users size={20} />
          Mute Others
        </button>
      )}

      {user?.role === "Instructor" && (
        <button className="control-btn danger">
          <Disc size={20} />
          Stop Record
        </button>
      )}

      <button className="control-btn">
        <LogOut size={20} />
        Close Session
      </button>

      <button className="control-btn">
        <HelpCircle size={20} />
        Post a QA
      </button>

      <button className="control-btn">
        <MessageSquare size={20} />
        Post Msg
      </button>

      <button className="control-btn danger">
        <LogOut size={20} />
        Leave Session
      </button>
    </div>
  );
};

export default Toolbar;
