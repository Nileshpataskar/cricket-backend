const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const { Match } = require("./models/match");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// APIs

// POST: Update match data
app.post("/api/match", async (req, res) => {
  const { runs, isOut } = req.body;

  try {
    let match = await Match.findOne();
    if (!match) {
      match = new Match({
        currentOver: { balls: [], overNumber: 1 },
        overHistory: [],
      });
    }

    const currentOver = match.currentOver;

    if (currentOver.balls.length === 6) {
      // Push the completed over to history and start a new over
      match.overHistory.push(currentOver);
      match.currentOver = {
        balls: [],
        overNumber: currentOver.overNumber + 1,
      };
    }

    // Add the new ball
    const ballNumber = currentOver.balls.length + 1;
    currentOver.balls.push({ runs, isOut, ballNumber });

    // Update total runs and wickets
    if (isOut) match.totalWickets += 1;
    else match.totalRuns += runs;

    await match.save();

    io.emit("match-updated", match); // Real-time update via socket
    res.status(200).json({ message: "Match updated", match });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Fetch match data
app.get("/api/match", async (req, res) => {
  try {
    const match = await Match.findOne();
    if (!match) {
      return res.status(404).json({ message: "Match data not found" });
    }

    res.status(200).json({
      totalRuns: match.totalRuns,
      totalWickets: match.totalWickets,
      currentOver: match.currentOver,
      maxOvers: match.maxOvers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Fetch over history
app.get("/api/match/overHistory", async (req, res) => {
  try {
    const match = await Match.findOne();
    if (!match || match.overHistory.length === 0) {
      return res.status(404).json({ message: "No over history found" });
    }

    res.status(200).json({ overHistory: match.overHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
