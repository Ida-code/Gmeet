import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : window.location.origin);

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
});

export default socket;