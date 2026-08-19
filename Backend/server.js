const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

const meetingParticipants = {};

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // ==========================
    // JOIN MEETING
    // ==========================
    socket.on("join-meeting", ({ meetingId, name, role }) => {

        socket.join(meetingId);

        socket.meetingId = meetingId;

        if (!meetingParticipants[meetingId]) {
            meetingParticipants[meetingId] = [];
        }

        // Prevent duplicates
        meetingParticipants[meetingId] =
            meetingParticipants[meetingId].filter(
                p => p.id !== socket.id
            );

        meetingParticipants[meetingId].push({
            id: socket.id,
            name,
            role
        });

        console.table(meetingParticipants[meetingId]);

        io.to(meetingId).emit(
            "participants",
            meetingParticipants[meetingId]
        );

        // Notify everyone except the new user
        socket.to(meetingId).emit("user-joined", {
            socketId: socket.id
        });

    });

    // ==========================
    // GET PARTICIPANTS ON DEMAND
    // ==========================
    socket.on("get-participants", ({ meetingId }) => {
        const targetMeetingId = meetingId || socket.meetingId;
        if (targetMeetingId && meetingParticipants[targetMeetingId]) {
            socket.emit("participants", meetingParticipants[targetMeetingId]);
        }
    });

    // ==========================
    // WEBRTC OFFER
    // ==========================
    socket.on("offer", ({ target, offer }) => {

        io.to(target).emit("offer", {
            offer,
            caller: socket.id
        });

    });

    // ==========================
    // WEBRTC ANSWER
    // ==========================
    socket.on("answer", ({ target, answer }) => {

        io.to(target).emit("answer", {
            answer,
            caller: socket.id
        });

    });

    // ==========================
    // ICE CANDIDATES
    // ==========================
    socket.on("ice-candidate", ({ target, candidate }) => {

        io.to(target).emit("ice-candidate", {
            candidate,
            caller: socket.id
        });

    });

    // ==========================
    // SCREEN SHARE SIGNALING
    // ==========================
    socket.on("screen-offer", ({ target, offer }) => {
        io.to(target).emit("screen-offer", {
            offer,
            caller: socket.id
        });
    });

    socket.on("screen-answer", ({ target, answer }) => {
        io.to(target).emit("screen-answer", {
            answer,
            caller: socket.id
        });
    });

    socket.on("screen-ice-candidate", ({ target, candidate }) => {
        io.to(target).emit("screen-ice-candidate", {
            candidate,
            caller: socket.id
        });
    });

    socket.on("screen-share-started", ({ meetingId }) => {
        socket.to(meetingId).emit("screen-share-started", { presenterId: socket.id });
    });

    socket.on("request-screen-stream", ({ target }) => {
        io.to(target).emit("request-screen-stream", { requesterId: socket.id });
    });

    socket.on("screen-share-stopped", ({ meetingId }) => {
        socket.to(meetingId).emit("screen-share-stopped", { presenterId: socket.id });
    });

    // ==========================
    // MUTE USER
    // ==========================
    socket.on("mute-user", ({ targetSocketId }) => {

        io.to(targetSocketId).emit("force-mute");

    });

    // ==========================
    // LEAVE MEETING
    // ==========================
    socket.on("leave-meeting", () => {

        const meetingId = socket.meetingId;

        if (!meetingId) return;

        meetingParticipants[meetingId] =
            (meetingParticipants[meetingId] || []).filter(
                p => p.id !== socket.id
            );

        socket.leave(meetingId);

        io.to(meetingId).emit(
            "participants",
            meetingParticipants[meetingId]
        );

        socket.to(meetingId).emit("user-left", socket.id);

        if (meetingParticipants[meetingId].length === 0) {
            delete meetingParticipants[meetingId];
        }

    });

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", () => {

        console.log("Disconnected:", socket.id);

        const meetingId = socket.meetingId;

        if (!meetingId) return;

        meetingParticipants[meetingId] =
            (meetingParticipants[meetingId] || []).filter(
                p => p.id !== socket.id
            );

        io.to(meetingId).emit(
            "participants",
            meetingParticipants[meetingId]
        );

        socket.to(meetingId).emit("user-left", socket.id);

        if (meetingParticipants[meetingId].length === 0) {
            delete meetingParticipants[meetingId];
        }

    });

});

// Serve frontend build static files if present
const frontendDistPath = path.join(__dirname, "../Frontend/dist");
app.use(express.static(frontendDistPath));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server Running..." });
});

// Fallback for SPA routing if serving frontend from backend
app.get("*", (req, res, next) => {
    const indexPath = path.join(frontendDistPath, "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.send("Server Running...");
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});