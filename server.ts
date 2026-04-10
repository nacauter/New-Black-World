
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState, Player, Monster, Mine, GamePhase, MonsterType } from './src/types.js';
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
          classification: 'Новичок',
          isMoving: false,
          hasKey: false,
          debuffs: [],
          stats: {
            escapedHunter: 0,
            escapedScreamer: 0,
            minesActivated: 0,
            mimicsExposed: 0,
            keysPicked: 0,
            deaths: 0,
            survivedDebuff: 0,
            survivedBroken: 0,
          }
        }],
        monsters: [],
        mines: [],
        keyPosition: null,
        exitPosition: null,
        exitDoorOpen: false,
        map: generateMap(40, 40),
        seed: settings.seed || Math.random().toString(),
        difficulty: settings.difficulty || 'Easy',
        lang: 'RU',
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
          classification: 'Новичок',
          isMoving: false,
          hasKey: false,
          debuffs: [],
          stats: {
            escapedHunter: 0,
            escapedScreamer: 0,
            minesActivated: 0,
            mimicsExposed: 0,
            keysPicked: 0,
            deaths: 0,
            survivedDebuff: 0,
            survivedBroken: 0,
          }
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
          startGameLoop(room);
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
          player.isMoving = input.x !== 0 || input.y !== 0;
          player.x += input.x * 5;
          player.y += input.y * 5;
          
          // Check collisions with mines
          room.mines.forEach(mine => {
            if (!mine.isExploded) {
              const dx = mine.x - player.x;
              const dy = mine.y - player.y;
              if (Math.sqrt(dx*dx + dy*dy) < 20) {
                mine.isExploded = true;
                mine.explosionTime = Date.now();
                player.debuffs.push({ type: 'Stunned', endTime: Date.now() + 20000 });
                player.stats.minesActivated += 1;
                player.score -= 0.5;
                io.to(roomId!).emit('mineExploded', { mineId: mine.id, playerId: player.id });
              }
            }
          });

          // Check collisions with monsters
          room.monsters.forEach(m => {
            if (m.phase !== 'Rest' && m.phase !== 'Sleep' && m.phase !== 'Stunned') {
              const dx = m.x - player.x;
              const dy = m.y - player.y;
              if (Math.sqrt(dx*dx + dy*dy) < 30) {
                player.isAlive = false;
                player.stats.deaths += 1;
                if (m.type === 'Hunter') player.score -= 2;
                if (m.type === 'Screamer') player.score -= 1;
                if (m.type === 'Mimic') player.score -= 5;
                if (m.type === 'Patroller') player.score -= 3;
                io.to(roomId!).emit('playerDied', player.id);
              }
            }
          });

          // Check key pickup
          if (room.keyPosition && !player.hasKey) {
            const dx = room.keyPosition.x - player.x;
            const dy = room.keyPosition.y - player.y;
            if (Math.sqrt(dx*dx + dy*dy) < 30) {
              player.hasKey = true;
              player.stats.keysPicked += 1;
              player.score += 2;
              room.keyPosition = null;
              io.to(roomId!).emit('keyPicked', player.id);
            }
          }

          // Check exit
          if (player.hasKey && room.exitPosition) {
            const dx = room.exitPosition.x - player.x;
            const dy = room.exitPosition.y - player.y;
            if (Math.sqrt(dx*dx + dy*dy) < 40) {
              if (!room.exitDoorOpen) {
                room.exitDoorOpen = true;
                io.to(roomId!).emit('exitOpened');
                // Monsters aggressive boost
                room.monsters.forEach(m => {
                  m.phase = 'Hunt';
                  m.phaseEndTime = Date.now() + 60000;
                });
              }
              // Win condition logic here
            }
          }

          io.to(roomId!).emit('playerMoved', { id: player.id, x: player.x, y: player.y });
        }
      }
    });

    socket.on('stomp', () => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room && room.phase === 'Playing') {
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.isAlive && !player.debuffs.some(d => d.type === 'Stunned')) {
          io.to(roomId!).emit('stompEffect', player.id);
          // Attract Hunter
          room.monsters.forEach(m => {
            if (m.type === 'Hunter' && m.phase === 'Search') {
              const dx = player.x - m.x;
              const dy = player.y - m.y;
              if (Math.sqrt(dx*dx + dy*dy) < 1000) {
                m.phase = 'Hunt';
                m.targetId = player.id;
                m.phaseEndTime = Date.now() + 30000;
              }
            }
          });
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

  function startGameLoop(room: GameState) {
    const interval = setInterval(() => {
      if (room.phase !== 'Playing') {
        clearInterval(interval);
        return;
      }

      const now = Date.now();

      // Update Monsters
      room.monsters.forEach(m => {
        if (now > m.phaseEndTime) {
          // Phase transitions
          if (m.type === 'Hunter') {
            if (m.phase === 'Hunt') { m.phase = 'Rest'; m.phaseEndTime = now + 11000; }
            else { m.phase = 'Search'; m.phaseEndTime = now + 30000; }
          } else if (m.type === 'Screamer') {
            if (m.phase === 'Hunt') { m.phase = 'Sleep'; m.phaseEndTime = now + 15000; }
            else { m.phase = 'Ambush'; m.phaseEndTime = now + 30000; }
          } else if (m.type === 'Mimic') {
            m.phase = 'Search';
            m.phaseEndTime = now + 60000;
            const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
            m.mimicForm = randomPlayer?.name;
          } else if (m.type === 'Patroller') {
            m.phase = 'Patrol';
            m.phaseEndTime = now + 45000;
          }
        }

        // Monster Movement & Logic
        if (m.type === 'Mimic') {
          const targetPos = room.keyPosition || (room.mines.find(mn => !mn.isExploded));
          if (targetPos) {
            const dx = targetPos.x - m.x;
            const dy = targetPos.y - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
              m.x += (dx / dist) * 3;
              m.y += (dy / dist) * 3;
            }
          }
        } else if (m.type === 'Patroller') {
          m.x += (Math.random() - 0.5) * 6;
          m.y += (Math.random() - 0.5) * 6;
          if (Math.random() < 0.01 && room.mines.length < 40) {
            room.mines.push({
              id: `mine-patrol-${Date.now()}`,
              x: m.x,
              y: m.y,
              isExploded: false
            });
          }
        } else if (m.phase === 'Hunt' && m.targetId) {
          const target = room.players.find(p => p.id === m.targetId);
          if (target && target.isAlive) {
            const dx = target.x - m.x;
            const dy = target.y - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            m.x += (dx / dist) * 4;
            m.y += (dy / dist) * 4;
            
            if (dist < 200 && Math.random() < 0.05) {
              if (m.type === 'Hunter') {
                target.debuffs.push({ type: 'Panic', endTime: now + 11000 });
              } else if (m.type === 'Screamer') {
                target.debuffs.push({ type: 'Concussed', endTime: now + 14000 });
              }
            }
          } else {
            m.phase = 'Search';
          }
        } else if (m.phase === 'Search' || m.phase === 'Ambush' || m.phase === 'Patrol') {
          m.x += (Math.random() - 0.5) * 4;
          m.y += (Math.random() - 0.5) * 4;
          
          if (Math.random() < 0.1) {
            room.players.forEach(p => {
              if (p.isAlive && p.isMoving) {
                const dx = p.x - m.x;
                const dy = p.y - m.y;
                if (Math.sqrt(dx*dx + dy*dy) < 400) {
                  m.phase = 'Hunt';
                  m.targetId = p.id;
                  m.phaseEndTime = now + (m.type === 'Hunter' ? 30000 : 16000);
                }
              }
            });
          }
        }
      });

      // Update Debuffs
      room.players.forEach(p => {
        p.debuffs = p.debuffs.filter(d => now < d.endTime);
        const hasPanic = p.debuffs.some(d => d.type === 'Panic');
        const hasConcussed = p.debuffs.some(d => d.type === 'Concussed');
        if (hasPanic && hasConcussed && !p.debuffs.some(d => d.type === 'Broken')) {
          p.debuffs = p.debuffs.filter(d => d.type !== 'Panic' && d.type !== 'Concussed');
          p.debuffs.push({ type: 'Broken', endTime: now + 40000 });
        }
      });

      io.to(room.id).emit('gameStateUpdate', { monsters: room.monsters, players: room.players });
    }, 100);
  }

  function generateMap(width: number, height: number) {
    const map = Array(height).fill(0).map(() => Array(width).fill(1));
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (Math.random() > 0.25) map[y][x] = 0;
      }
    }
    return map;
  }

  function initGame(room: GameState) {
    room.players.forEach((p, i) => {
      p.x = 100 + i * 50;
      p.y = 100;
      p.isAlive = true;
      p.score = 0;
      p.hasKey = false;
      p.debuffs = [];
    });

    const monsterTypes: MonsterType[] = ['Hunter', 'Screamer', 'Patroller', 'Mimic'];
    monsterTypes.forEach((type, i) => {
      room.monsters.push({
        id: `monster-${i}`,
        type,
        x: 500 + Math.random() * 1000,
        y: 500 + Math.random() * 1000,
        phase: type === 'Screamer' ? 'Ambush' : 'Search',
        phaseEndTime: Date.now() + 30000,
        targetId: null,
      });
    });

    for (let i = 0; i < 20; i++) {
      room.mines.push({
        id: `mine-${i}`,
        x: 200 + Math.random() * 1500,
        y: 200 + Math.random() * 1500,
        isExploded: false,
      });
    }

    room.keyPosition = { x: 1500, y: 1500 };
    room.exitPosition = { x: 1800, y: 1800 };
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
