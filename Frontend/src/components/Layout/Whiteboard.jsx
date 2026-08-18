import { useRef, useEffect, useState } from "react";
import {
  Edit3,
  Eraser,
  Film,
  Undo2,
  Trash2,
} from "lucide-react";
import ScreenShare from "./ScreenShare";

const Whiteboard = ({ screenShareRef }) => {
  const canvasRef = useRef(null);
  const scrollAreaRef = useRef(null);

  const [isSharing, setIsSharing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState("draw");
  const [history, setHistory] = useState([]);

  // Canvas setup
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const scrollArea = scrollAreaRef.current;
    if (!canvas || !scrollArea) return;

    const ratio = window.devicePixelRatio || 1;
    const visibleRect = scrollArea.getBoundingClientRect();

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

      <ScreenShare
        ref={screenShareRef}
        onSharingStateChange={setIsSharing}
      />

      {!isSharing && (
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
