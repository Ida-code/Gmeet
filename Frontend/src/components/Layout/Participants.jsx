import { MicOff } from "lucide-react";
import { useEffect, useState } from "react";
import socket from "../../services/socket";
import { useUser } from "../../context/UserContext";

const Participants = () => {
  const [participants, setParticipants] = useState([]);

  const user = useUser();

  useEffect(() => {
    const updateParticipants = (users) => {
      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    socket.on("participants", updateParticipants);

    // Fetch existing participants list immediately upon component mount
    if (user?.meetingId) {
      socket.emit("get-participants", { meetingId: user.meetingId });
    }

    return () => {
      socket.off("participants", updateParticipants);
    };
  }, [user?.meetingId]);

  const muteParticipant = (participant) => {
    socket.emit("mute-user", {
      meetingId: user.meetingId,
      targetSocketId: participant.id,
    });
  };

  return (
    <div className="participants-panel">
      <h3>Participants ({participants.length})</h3>

      {participants.length === 0 ? (
        <p>No participants</p>
      ) : (
        participants.map((participant) => (
          <div key={participant.id} className="participant-card">
            <div>{participant.name}</div>

            {user?.role === "Instructor" &&
              participant.role !== "Instructor" && (
                <button
                  className="mute-btn"
                  onClick={() => muteParticipant(participant)}
                >
                  <MicOff size={12} strokeWidth={2} />
                </button>
              )}
          </div>
        ))
      )}
    </div>
  );
};

export default Participants;
