let peerConnection = null;

const configuration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export function createPeerConnection(socket, remoteSocketId, localStream) {
  peerConnection = new RTCPeerConnection(configuration);

  // Add our camera + microphone tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Send ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        target: remoteSocketId,
        candidate: event.candidate,
      });
    }
  };

  return peerConnection;
}

export async function createOffer(socket, remoteSocketId) {
  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    target: remoteSocketId,
    offer,
  });
}

export async function receiveOffer(socket, sender, offer) {
  if (!peerConnection) return;

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    target: sender,
    answer,
  });
}

export async function receiveAnswer(answer) {
  if (!peerConnection) return;

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(answer)
  );
}

export async function addIceCandidate(candidate) {
  if (!peerConnection) return;

  await peerConnection.addIceCandidate(
    new RTCIceCandidate(candidate)
  );
}

export function setRemoteVideo(videoElement) {
  if (!peerConnection) return;

  peerConnection.ontrack = (event) => {
    videoElement.srcObject = event.streams[0];
  };
}

export function getPeerConnection() {
  return peerConnection;
}