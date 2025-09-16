import React, { useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');

function App() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [question, setQuestion] = useState(null);
  const [scores, setScores] = useState({});

  const createRoom = async () => {
    const res = await axios.post('http://localhost:5000/create-room');
    setCode(res.data.code);
  };

  const joinRoom = () => {
    socket.emit('join', { code, name });
    socket.on('players', (players) => console.log('Players:', players));
    socket.on('question', (q) => setQuestion(q));
    socket.on('correct', ({ name, scores }) => {
      alert(`${name} got it right!`);
      setScores(scores);
    });
    socket.on('wrong', () => alert('Wrong answer'));
  };

  const startGame = () => {
    socket.emit('start', code);
  };

  const submitAnswer = (ans) => {
    socket.emit('answer', { code, name, answer: ans });
  };

  return (
    <div>
      <h1>Flashcard Frenzy</h1>
      <button onClick={createRoom}>Create Room</button>
      <input placeholder="Room Code" value={code} onChange={e => setCode(e.target.value)} />
      <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={joinRoom}>Join</button>
      <button onClick={startGame}>Start</button>

      {question && (
        <div>
          <h2>{question.text}</h2>
          {question.options.map(opt => (
            <button key={opt} onClick={() => submitAnswer(opt)}>{opt}</button>
          ))}
        </div>
      )}

      <h3>Scores</h3>
      <ul>
        {Object.entries(scores).map(([player, score]) => (
          <li key={player}>{player}: {score}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
