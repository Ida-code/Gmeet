import socket from "../../services/socket";
import { useState } from "react";

const MeetingLobby = ({ onJoin }) => {
  const [name, setName] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [role, setRole] = useState("Student");

  const handleJoin = () => {
    if (!name.trim() || !meetingId.trim()) {
      alert("Please enter your name and meeting ID");
      return;
    }

    onJoin({
      name,
      meetingId,
      role,
    });
  };

  return (
    <div className="lobby-overlay">
      <div className="lobby-card">
        <h1>Virtual Classroom</h1>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Meeting ID"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option>Student</option>
          <option>Instructor</option>
        </select>

        <button onClick={handleJoin}>Join Meeting</button>
      </div>
    </div>
  );
};

export default MeetingLobby;
