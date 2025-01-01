const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/cricket", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Ball Schema
const ballSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  ballNumber: { type: Number, required: true },
});

// Over Schema
const overSchema = new mongoose.Schema({
  balls: [ballSchema],
  overNumber: { type: Number, required: true },
});

// Match Schema
const matchSchema = new mongoose.Schema({
  currentOver: {
    balls: [ballSchema],
    overNumber: { type: Number, required: true },
  },
  overHistory: [overSchema],
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  maxOvers: { type: Number, default: 20 },
});

const Match = mongoose.model("Match", matchSchema);

// POST API to add ball data
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
      match.overHistory.push(currentOver);
      match.currentOver = {
        balls: [],
        overNumber: currentOver.overNumber + 1,
      };
    }

    const ballNumber = currentOver.balls.length + 1;
    currentOver.balls.push({ runs, isOut, ballNumber });

    if (isOut) match.totalWickets += 1;
    else match.totalRuns += runs;

    await match.save();

    const formattedResponse = {
      totalRuns: match.totalRuns,
      totalWickets: match.totalWickets,
      totalOvers: match.overHistory.length + 1,
      currentOverNumber: match.currentOver.overNumber,
      currentBall: `${match.currentOver.overNumber - 1}.${
        currentOver.balls.length
      }`,
      currentOver: match.currentOver.balls,
      overHistory: match.overHistory.map((over) => over.balls),
    };

    io.emit("match-updated", formattedResponse);
    res.status(200).json(formattedResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET API to fetch match data
app.get("/api/match", async (req, res) => {
  try {
    const match = await Match.findOne();
    if (!match) {
      return res.status(404).json({ message: "Match data not found" });
    }

    const formattedResponse = {
      totalRuns: match.totalRuns,
      totalWickets: match.totalWickets,
      totalOvers: match.overHistory.length + 1,
      currentOverNumber: match.currentOver.overNumber,
      currentBall: `${match.currentOver.overNumber - 1}.${
        match.currentOver.balls.length
      }`,
      currentOver: match.currentOver.balls,
      overHistory: match.overHistory.map((over) => over.balls),
    };

    res.status(200).json(formattedResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET API to fetch over history
app.get("/api/match/overHistory", async (req, res) => {
  try {
    const match = await Match.findOne();
    if (!match || match.overHistory.length === 0) {
      return res.status(404).json({ message: "No over history found" });
    }

    const formattedOverHistory = match.overHistory.map((over) => ({
      overNumber: over.overNumber,
      balls: over.balls,
    }));

    res.status(200).json({ overHistory: formattedOverHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start server
const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
