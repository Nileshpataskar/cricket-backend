const { default: mongoose } = require("mongoose");

// Match Schema
const ballSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  ballNumber: { type: Number, required: true },
});

const overSchema = new mongoose.Schema({
  balls: [ballSchema],
  overNumber: { type: Number, required: true },
});

const matchSchema = new mongoose.Schema({
  currentOver: overSchema,
  overHistory: [overSchema],
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  maxOvers: { type: Number, default: 20 },
});

const Match = mongoose.model("Match", matchSchema);

module.exports = Match;
