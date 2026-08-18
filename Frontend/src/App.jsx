import { useState, useRef } from "react";
import { UserContext } from "./context/UserContext";

import Whiteboard from "./components/Layout/Whiteboard";
import InstructorVideo from "./components/Layout/InstructorVideo";
import Toolbar from "./components/Layout/Toolbar";
import MeetingLobby from "./components/Layout/MeetingLobby";

import socket from "./services/socket";

import "./App.css";

function App() {
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState(null);

  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const screenShareRef = useRef(null);

  const handleJoin = (userData) => {
    setUser(userData);
    socket.emit("join-meeting", userData);
    setJoined(true);
  };

  const handleToggleScreenShare = () => {
    if (screenShareRef.current) {
      screenShareRef.current.toggleScreenShare();
    }
  };

  if (!joined) {
    return <MeetingLobby onJoin={handleJoin} />;
  }

  return (
    <UserContext.Provider value={user}>
      <div className="app-container">
        <div className="main-layout">
          <Whiteboard screenShareRef={screenShareRef} />

          <InstructorVideo isVideoOff={isVideoOff} isMuted={isMuted} />
        </div>

        <Toolbar
          isVideoOff={isVideoOff}
          setIsVideoOff={setIsVideoOff}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          startScreenShare={handleToggleScreenShare}
          isSharing={isSharing}
        />
      </div>
    </UserContext.Provider>
  );
}

export default App;
