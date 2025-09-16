const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

mongoose.connect('mongodb://localhost:27017/flashcard', { useNewUrlParser: true, useUnifiedTopology: true });

const Question = mongoose.model('Question', new mongoose.Schema({
  text: String,
  options: [String],
  answer: String
}));
app.post('/add-question', async (req, res) => {
  try {
    const { text, options, answer } = req.body;
    const q = new Question({ text, options, answer });
    await q.save();
    res.json({ message: 'Question saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const Room = mongoose.model('Room', new mongoose.Schema({
  code: String,
  players: [String],
  scores: { type: Map, of: Number },
  currentQuestion: Object,
  answeredBy: String
}));

app.post('/create-room', async (req, res) => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  const room = new Room({ code, players: [], scores: {} });
  await room.save();
  res.json({ code });
});

io.on('connection', (socket) => {
  socket.on('join', async ({ code, name }) => {
    socket.join(code);
    const room = await Room.findOne({ code });
    if (!room.players.includes(name)) {
      room.players.push(name);
      room.scores.set(name, 0);
      await room.save();
    }
    io.to(code).emit('players', room.players);
  });

  socket.on('start', async (code) => {
    const question = await Question.aggregate([{ $sample: { size: 1 } }]);
    const room = await Room.findOneAndUpdate({ code }, {
      currentQuestion: question[0],
      answeredBy: null
    }, { new: true });
    io.to(code).emit('question', room.currentQuestion);
  });

  socket.on('answer', async ({ code, name, answer }) => {
    const room = await Room.findOne({ code });
    if (room.answeredBy) return; 
    if (!room || !room.currentQuestion) {
  socket.emit('error', 'Question not found');
  return;
}



    if (answer === room.currentQuestion.answer) {
      room.answeredBy = name;
      room.scores.set(name, (room.scores.get(name) || 0) + 1);
      await room.save();
      io.to(code).emit('correct', { name, scores: Object.fromEntries(room.scores) });
    } else {
      socket.emit('wrong');
    }
  });
});

server.listen(5000, () => console.log('Server running on port 5000'));
