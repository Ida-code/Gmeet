import socket from "../../services/socket";
import { useRef, useEffect, useState } from "react";
import {
  Edit3,
  Eraser,
  Monitor,
  Layout,
  Film,
  Undo2,
  Trash2,
} from "lucide-react";

const Whiteboard = ({ isSharing, isSelfSharing, screenStream }) => {
  const canvasRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const videoRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState("draw");
  const [history, setHistory] = useState([]);

  // Canvas is set up ONCE at a size larger than its visible scroll
  // wrapper, so .canvas-scroll-area gets real scrollbars. We no longer
  // resize on window resize, since that would wipe/distort drawings.
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const scrollArea = scrollAreaRef.current;
    if (!canvas || !scrollArea) return;

    const ratio = window.devicePixelRatio || 1;
    const visibleRect = scrollArea.getBoundingClientRect();

    // Virtual whiteboard is 1.4x the visible frame — enough extra
    // room to scroll around without feeling infinite.
    const width = Math.round(visibleRect.width * 1.4);
    const height = Math.round(visibleRect.height * 1.4);

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
  };

  useEffect(() => {
    if (isSharing) return;

    setupCanvas();

    if (history.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.src = history[history.length - 1];
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharing]);

  // Attach/detach the shared screen stream to the video element for remote viewers
  useEffect(() => {
    if (videoRef.current && !isSelfSharing) {
      videoRef.current.srcObject = isSharing ? screenStream : null;
    }
  }, [isSharing, isSelfSharing, screenStream]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (activeTool !== "draw" && activeTool !== "erase") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (activeTool !== "draw" && activeTool !== "erase") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getCoordinates(e);

    if (activeTool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 25;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const image = canvas.toDataURL();
    setHistory((prev) => [...prev, image]);
  };

  const undo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let previous = [...history];
    previous.pop();
    setHistory(previous);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (previous.length > 0) {
      const img = new Image();
      img.src = previous[previous.length - 1];
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
      };
    }
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  return (
    <div className="whiteboard-container">
      <div className="floating-top-bar">
        <button
          className={activeTool === "draw" ? "top-btn active" : "top-btn"}
          onClick={() => setActiveTool("draw")}
          disabled={isSharing}
        >
          <Edit3 size={18} />
          Draw
        </button>

        <button
          className={activeTool === "erase" ? "top-btn active" : "top-btn"}
          onClick={() => setActiveTool("erase")}
          disabled={isSharing}
        >
          <Eraser size={18} />
          Erase
        </button>

        <button
          className="top-btn"
          onClick={() => setActiveTool("video")}
          disabled={isSharing}
        >
          <Film size={18} />
          Video
        </button>

        <button className="top-btn" onClick={undo} disabled={isSharing}>
          <Undo2 size={18} />
          Undo
        </button>

        <button className="top-btn" onClick={clearAll} disabled={isSharing}>
          <Trash2 size={18} />
          Clear All
        </button>
      </div>

      {isSharing ? (
        <div className="screen-share-area">
          {isSelfSharing ? (
            <div className="presenting-banner">
              <Monitor size={48} color="#2563eb" />
              <h2>You are sharing your screen</h2>
              <p>Participants in this meeting can see your screen.</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="screen-preview"
            />
          )}
        </div>
      ) : (
        <div className="canvas-scroll-area" ref={scrollAreaRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
