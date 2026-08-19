import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  const { protocol, hostname, port } = window.location;

  // Local development fallback
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }

  // If the frontend is served on a custom port like 3000/5173 on a remote server/IP, target port 5000
  if (port && port !== "80" && port !== "443" && port !== "5000") {
    return `${protocol}//${hostname}:5000`;
  }

  // Unified server build or reverse proxy setup (Nginx / Caddy / Cloudflare / Render unified)
  return window.location.origin;
};

const SOCKET_URL = getSocketUrl();

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: true
});

export default socket;
