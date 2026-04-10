
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState, Player, Monster, Mine, GamePhase } from './src/types.js';
import Matter from 'matter-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Game state storage
  const rooms = new Map<string, GameState>();
  const playerToRoom = new Map<string, string>();

  // Socket logic
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ name, settings }) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newState: GameState = {
        id: roomId,
        phase: 'Lobby',
        players: [{
          id: socket.id,
          name: name || 'Host',
          isReady: false,
          isHost: true,
          x: 0,
          y: 0,
          radius: 15,
          color: '#ffffff',
          isAlive: true,
          score: 0,
          debuffs: [],
        }],
        monsters: [],
        mines: [],
        keyPosition: null,
        exitPosition: null,
        exitDoorOpen: false,
        map: generateMap(20, 20), // Simple map for now
        seed: settings.seed || Math.random().toString(),
        difficulty: settings.difficulty || 'Easy',
      };
      rooms.set(roomId, newState);
      playerToRoom.set(socket.id, roomId);
      socket.join(roomId);
      socket.emit('roomCreated', newState);
      io.emit('roomList', Array.from(rooms.values()).map(r => ({ id: r.id, host: r.players.find(p => p.isHost)?.name })));
    });

    socket.on('joinRoom', ({ roomId, name }) => {
      const room = rooms.get(roomId);
      if (room && room.players.length < 10 && room.phase === 'Lobby') {
        const newPlayer: Player = {
          id: socket.id,
          name: name || `Player ${room.players.length + 1}`,
          isReady: false,
          isHost: false,
          x: 0,
          y: 0,
          radius: 15,
          color: '#ffffff',
          isAlive: true,
          score: 0,
          debuffs: [],
        };
        room.players.push(newPlayer);
        playerToRoom.set(socket.id, roomId);
        socket.join(roomId);
        io.to(roomId).emit('roomUpdated', room);
      } else {
        socket.emit('error', 'Room full or already started');
      }
    });

    socket.on('setReady', (ready: boolean) => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.isReady = ready;
          io.to(roomId!).emit('roomUpdated', room);
        }
      }
    });

    socket.on('startGame', () => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room && room.players.find(p => p.id === socket.id)?.isHost) {
        if (room.players.every(p => p.isReady || p.isHost)) {
          room.phase = 'Playing';
          initGame(room);
          io.to(roomId!).emit('gameStarted', room);
        }
      }
    });

    socket.on('sendMessage', (text: string) => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        io.to(roomId!).emit('message', {
          id: Math.random().toString(),
          sender: player?.name || 'Unknown',
          text,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('move', (input: { x: number, y: number }) => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room && room.phase === 'Playing') {
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.isAlive) {
          // Simple movement for now, in a real game we'd use physics engine
          player.x += input.x * 5;
          player.y += input.y * 5;
          // Broadcast update (throttled in real app)
          io.to(roomId!).emit('playerMoved', { id: player.id, x: player.x, y: player.y });
        }
      }
    });

    socket.on('disconnect', () => {
      const roomId = playerToRoom.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            if (!room.players.some(p => p.isHost)) {
              room.players[0].isHost = true;
            }
            io.to(roomId).emit('roomUpdated', room);
          }
        }
        playerToRoom.delete(socket.id);
      }
    });
  });

  function generateMap(width: number, height: number) {
    const map = Array(height).fill(0).map(() => Array(width).fill(1));
    // Simple maze generation or just some rooms
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (Math.random() > 0.3) map[y][x] = 0;
      }
    }
    return map;
  }

  function initGame(room: GameState) {
    // Spawn players at start
    room.players.forEach((p, i) => {
      p.x = 100 + i * 40;
      p.y = 100;
      p.isAlive = true;
    });

    // Spawn monsters based on difficulty
    const monsterCount = room.difficulty === 'Easy' ? 2 : 5;
    for (let i = 0; i < monsterCount; i++) {
      room.monsters.push({
        id: `monster-${i}`,
        type: i % 2 === 0 ? 'Hunter' : 'Screamer',
        x: 400 + Math.random() * 400,
        y: 400 + Math.random() * 400,
        phase: 'Search',
        phaseEndTime: Date.now() + 10000,
        isAggressive: true,
      });
    }

    // Spawn mines
    for (let i = 0; i < 20; i++) {
      room.mines.push({
        id: `mine-${i}`,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        isExploded: false,
      });
    }

    // Spawn key and exit
    room.keyPosition = { x: 800, y: 800 };
    room.exitPosition = { x: 900, y: 900 };
  }

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
