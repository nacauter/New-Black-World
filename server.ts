
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState, Player, Monster, Mine, GamePhase, MonsterType, BranchDensity } from './src/types.js';
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
            diedUnderDebuff: 0,
            diedUnderBroken: 0,
            killedByPatroller: 0,
            killedByHunter: 0,
            killedByScreamer: 0,
            killedByMimic: 0,
          }
        }],
        monsters: [],
        mines: [],
        keyPosition: null,
        exitPosition: null,
        exitDoorOpen: false,
        map: [], // Generated in initGame
        seed: settings.seed || Math.random().toString(),
        settings: {
          difficulty: settings.difficulty || 'Easy',
          seed: settings.seed || Math.random().toString(),
          mapSize: settings.mapSize || 40,
          branchDensity: settings.branchDensity || 'Medium',
          password: settings.password || ''
        },
        lang: 'RU',
      };
      rooms.set(roomId, newState);
      playerToRoom.set(socket.id, roomId);
      socket.join(roomId);
      socket.emit('roomCreated', newState);
      io.emit('roomList', Array.from(rooms.values()).map(r => ({ 
        id: r.id, 
        host: r.players.find(p => p.isHost)?.name,
        playerCount: r.players.length,
        hasPassword: !!r.settings.password
      })));
    });

    socket.on('joinRoom', ({ roomId, name, password }) => {
      const room = rooms.get(roomId);
      if (room && room.players.length < 10 && room.phase === 'Lobby') {
        if (room.settings.password && room.settings.password !== password) {
          return socket.emit('error', 'INVALID_PASSWORD');
        }
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
            diedUnderDebuff: 0,
            diedUnderBroken: 0,
            killedByPatroller: 0,
            killedByHunter: 0,
            killedByScreamer: 0,
            killedByMimic: 0,
          }
        };
        room.players.push(newPlayer);
        playerToRoom.set(socket.id, roomId);
        socket.join(roomId);
        io.to(roomId).emit('roomUpdated', room);
        io.emit('roomList', Array.from(rooms.values()).map(r => ({ 
          id: r.id, 
          host: r.players.find(p => p.isHost)?.name,
          playerCount: r.players.length 
        })));
      } else {
        socket.emit('error', 'ROOM_UNAVAILABLE');
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
          
          const speed = 5;
          const radius = 15;
          
          // Normalize diagonal movement
          let moveX = input.x;
          let moveY = input.y;
          if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
          }

          const checkCollision = (x: number, y: number) => {
            const points = [
              { x: x - radius, y: y - radius },
              { x: x + radius, y: y - radius },
              { x: x - radius, y: y + radius },
              { x: x + radius, y: y + radius }
            ];
            return points.some(p => {
              const gx = Math.floor(p.x / 50);
              const gy = Math.floor(p.y / 50);
              return gx < 0 || gx >= room.settings.mapSize || gy < 0 || gy >= room.settings.mapSize || room.map[gy][gx] === 1;
            });
          };

          // Try full movement
          const nextX = player.x + moveX * speed;
          const nextY = player.y + moveY * speed;

          if (!checkCollision(nextX, nextY)) {
            player.x = nextX;
            player.y = nextY;
          } else {
            // Try sliding X
            if (!checkCollision(nextX, player.y)) {
              player.x = nextX;
            } else if (!checkCollision(player.x, nextY)) {
              // Try sliding Y
              player.y = nextY;
            }
          }
          
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

                // Attract monsters to explosion
                room.monsters.forEach(m => {
                  if (m.type === 'Hunter') {
                    m.phase = 'Search';
                    m.lastKnownPlayerPos = { x: mine.x, y: mine.y };
                    m.phaseEndTime = Date.now() + 15000;
                  } else if (m.type === 'Patroller') {
                    m.lastKnownPlayerPos = { x: mine.x, y: mine.y };
                    m.phase = 'Patrol';
                  } else if (m.type === 'Screamer' && Math.random() < 0.55) {
                    m.phase = 'Ambush';
                    m.x = mine.x + (Math.random() - 0.5) * 100;
                    m.y = mine.y + (Math.random() - 0.5) * 100;
                    m.phaseEndTime = Date.now() + 30000;
                  }
                });

                // Mimic transformation chance (43%) if player hits mine
                const mimic = room.monsters.find(mon => mon.type === 'Mimic' && !mon.mimicForm);
                if (mimic && Math.random() < 0.43) {
                  const isBroken = player.debuffs.some(d => d.type === 'Broken');
                  if (!isBroken) mimic.mimicForm = player.name;
                }
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
                const isBroken = player.debuffs.some(d => d.type === 'Broken');
                const hasDebuff = player.debuffs.length > 0;
                
                if (isBroken) {
                  player.stats.diedUnderBroken += 1;
                  player.score -= 10;
                } else if (hasDebuff) {
                  player.stats.diedUnderDebuff += 1;
                  player.score -= 3;
                } else {
                  player.score -= 3;
                }

                if (m.type === 'Hunter') { player.stats.killedByHunter += 1; player.score -= 2; }
                if (m.type === 'Screamer') { player.stats.killedByScreamer += 1; player.score -= 1; }
                if (m.type === 'Mimic') { player.stats.killedByMimic += 1; player.score -= 5; }
                if (m.type === 'Patroller') { player.stats.killedByPatroller += 1; player.score -= 3; }
                
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
              // Win condition logic
              room.phase = 'GameOver';
              io.to(roomId!).emit('gameOver', room);
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
          
          // Monsters reaction to Stomp
          room.monsters.forEach(m => {
            const dx = player.x - m.x;
            const dy = player.y - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const hearingRange = 1200; // Large radius for stomp

            if (dist < hearingRange) {
              if (m.type === 'Hunter') {
                // Hunter always reacts to stomp if nearby
                m.phase = 'Hunt';
                m.targetId = player.id;
                m.lastKnownPlayerPos = { x: player.x, y: player.y };
                m.phaseEndTime = Date.now() + 30000;
              } else if (m.type === 'Screamer' && m.phase === 'Hunt') {
                // Screamer only reacts to stomp if already hunting
                m.targetId = player.id;
                m.lastKnownPlayerPos = { x: player.x, y: player.y };
              } else if (m.type === 'Mimic' && m.mimicForm) {
                // Stomp can demasque Mimic (33% chance)
                if (Math.random() < 0.33) {
                  m.mimicForm = undefined;
                  m.phase = 'Stunned';
                  m.phaseEndTime = Date.now() + 120000; // 2 minutes stun
                }
              }
            }
          });
        }
      }
    });

    socket.on('kickPlayer', (targetId: string) => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room && room.players.find(p => p.id === socket.id)?.isHost) {
        const targetSocket = io.sockets.sockets.get(targetId);
        if (targetSocket) {
          targetSocket.leave(roomId!);
          targetSocket.emit('kicked');
          room.players = room.players.filter(p => p.id !== targetId);
          playerToRoom.delete(targetId);
          io.to(roomId!).emit('roomUpdated', room);
        }
      }
    });

    socket.on('addBot', () => {
      const roomId = playerToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (room && room.players.find(p => p.id === socket.id)?.isHost && room.players.length < 10) {
        const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
        const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
        const botName = `${botNames[Math.floor(Math.random() * botNames.length)]} Bot`;
        
        const newBot: Player = {
          id: botId,
          name: botName,
          isBot: true,
          isReady: true,
          isHost: false,
          x: 0,
          y: 0,
          radius: 15,
          color: '#ffffff',
          isAlive: true,
          score: 0,
          classification: 'Novice',
          isMoving: false,
          hasKey: false,
          debuffs: [],
          stats: {
            escapedHunter: 0, escapedScreamer: 0, minesActivated: 0, mimicsExposed: 0,
            keysPicked: 0, deaths: 0, survivedDebuff: 0, survivedBroken: 0,
            diedUnderDebuff: 0, diedUnderBroken: 0, killedByPatroller: 0,
            killedByHunter: 0, killedByScreamer: 0, killedByMimic: 0,
          }
        };
        room.players.push(newBot);
        io.to(roomId!).emit('roomUpdated', room);
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
          io.emit('roomList', Array.from(rooms.values()).map(r => ({ 
            id: r.id, 
            host: r.players.find(p => p.isHost)?.name,
            playerCount: r.players.length 
          })));
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

      // Update Bots
      room.players.forEach(p => {
        if (p.isBot && p.isAlive) {
          updateBot(p, room);
        }
      });

      // Update Monsters
      room.monsters.forEach(m => {
        if (m.stepCounter === undefined) m.stepCounter = 0;
        m.stepCounter++;

        if (now > m.phaseEndTime) {
          // Phase transitions
          if (m.type === 'Hunter') {
            if (m.phase === 'Hunt') { 
              m.phase = 'Rest'; 
              m.phaseEndTime = now + 11000; 
              m.targetId = null;
            } else { 
              m.phase = 'Search'; 
              m.phaseEndTime = now + 30000; 
            }
          } else if (m.type === 'Screamer') {
            if (m.phase === 'Hunt') { 
              m.phase = 'Sleep'; 
              m.phaseEndTime = now + 15000; 
              m.targetId = null;
            } else { 
              m.phase = 'Ambush'; 
              m.phaseEndTime = now + 60000; // Long ambush
            }
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

        // Monster Raycast Detection
        // Screamer in Ambush emits rays every 10 seconds (approx 100 intervals at 100ms)
        const isScreamerAmbushRay = m.type === 'Screamer' && m.phase === 'Ambush' && m.stepCounter % 100 === 0;
        const isNormalRay = m.stepCounter % 3 === 0 && m.phase !== 'Rest' && m.phase !== 'Sleep' && m.phase !== 'Stunned' && m.phase !== 'Ambush';

        if (isScreamerAmbushRay || isNormalRay) {
          const rayCount = 16;
          const rayDist = m.phase === 'Ambush' ? 800 : 600;
          const angleStep = (Math.PI * 2) / rayCount;

          for (let i = 0; i < rayCount; i++) {
            const angle = i * angleStep;
            let hitDist = rayDist;

            for (let d = 0; d < rayDist; d += 20) {
              const rx = m.x + Math.cos(angle) * d;
              const ry = m.y + Math.sin(angle) * d;
              const gx = Math.floor(rx / 50);
              const gy = Math.floor(ry / 50);
              if (gx >= 0 && gx < 40 && gy >= 0 && gy < 40 && room.map[gy][gx] === 1) {
                hitDist = d;
                break;
              }
            }

            room.players.forEach(p => {
              if (!p.isAlive || !p.isMoving) return;
              const dx = p.x - m.x;
              const dy = p.y - m.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const ang = Math.atan2(dy, dx);
              let angleDiff = Math.abs(angle - ang);
              if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

              if (dist < hitDist && angleDiff < 0.15) {
                m.phase = 'Hunt';
                m.targetId = p.id;
                m.phaseEndTime = now + (m.type === 'Hunter' ? 30000 : 16000);
                m.lastKnownPlayerPos = { x: p.x, y: p.y };
              }
            });
          }
        }

        // Monster Movement & Logic
        if (m.phase === 'Hunt' && (m.targetId || m.lastKnownPlayerPos)) {
          const target = room.players.find(p => p.id === m.targetId);
          const targetPos = (target && target.isAlive) ? { x: target.x, y: target.y } : m.lastKnownPlayerPos;

          if (targetPos) {
            const dx = targetPos.x - m.x;
            const dy = targetPos.y - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
              m.x += (dx / dist) * 4;
              m.y += (dy / dist) * 4;
            } else if (!target || !target.isAlive) {
              m.lastKnownPlayerPos = null;
              m.phase = 'Search';
            }
            
            // Abilities
            if (target && dist < 300 && Math.random() < 0.05) {
              if (m.type === 'Hunter' && Math.random() < 0.25) {
                // Loud Roar
                room.players.forEach(p => {
                  const pdx = p.x - m.x;
                  const pdy = p.y - m.y;
                  if (Math.sqrt(pdx*pdx + pdy*pdy) < 600) {
                    p.debuffs.push({ type: 'Panic', endTime: now + 11000 });
                  }
                });
                // Hidden effect: call Screamer (30%)
                if (Math.random() < 0.3) {
                  const screamer = room.monsters.find(mon => mon.type === 'Screamer');
                  if (screamer) {
                    screamer.phase = 'Hunt';
                    screamer.targetId = target.id;
                    screamer.phaseEndTime = now + 16000;
                  }
                }
              } else if (m.type === 'Screamer' && Math.random() < 0.75) {
                // Loud Scream
                room.players.forEach(p => {
                  const pdx = p.x - m.x;
                  const pdy = p.y - m.y;
                  if (Math.sqrt(pdx*pdx + pdy*pdy) < 500) {
                    p.debuffs.push({ type: 'Concussed', endTime: now + 14000 });
                  }
                });
                // Hidden effect: call Hunter (56%)
                if (Math.random() < 0.56) {
                  const hunter = room.monsters.find(mon => mon.type === 'Hunter');
                  if (hunter) {
                    hunter.phase = 'Hunt';
                    hunter.targetId = target.id;
                    hunter.phaseEndTime = now + 30000;
                  }
                }
              }
            }
          }
        } else if (m.type === 'Mimic') {
          // Mimic Logic
          if (m.phase === 'Stunned') {
            if (now > m.phaseEndTime) {
              m.phase = 'Search';
              m.mimicForm = undefined;
            }
            return;
          }

          // Attraction logic
          if (!m.targetId && !m.lastKnownPlayerPos) {
            const rand = Math.random();
            if (rand < 0.16 && room.keyPosition) m.lastKnownPlayerPos = room.keyPosition;
            else if (rand < 0.23 && room.mines.length > 0) {
              const mine = room.mines[Math.floor(Math.random() * room.mines.length)];
              m.lastKnownPlayerPos = { x: mine.x, y: mine.y };
            } else if (rand < 0.43) {
              const otherMon = room.monsters.find(mon => mon.type === 'Screamer' || mon.type === 'Patroller');
              if (otherMon) m.lastKnownPlayerPos = { x: otherMon.x, y: otherMon.y };
            } else if (rand < 0.46) {
              const hunter = room.monsters.find(mon => mon.type === 'Hunter');
              if (hunter) m.lastKnownPlayerPos = { x: hunter.x, y: hunter.y };
            }
          }

          // Transformation into player if mine activated (handled in mine logic, but here we check for nearby players)
          if (!m.mimicForm && Math.random() < 0.01) {
            const nearbyPlayer = room.players.find(p => p.isAlive && Math.sqrt(Math.pow(p.x - m.x, 2) + Math.pow(p.y - m.y, 2)) < 300);
            if (nearbyPlayer) m.mimicForm = nearbyPlayer.name;
          }

          // If in player form, handle key stealing
          if (m.mimicForm && !m.phase.includes('Stealing')) {
            const keyDist = room.keyPosition ? Math.sqrt(Math.pow(m.x - room.keyPosition.x, 2) + Math.pow(m.y - room.keyPosition.y, 2)) : 9999;
            if (keyDist < 30 && Math.random() < 0.5) {
              m.phase = 'StealingKey';
              m.phaseEndTime = now + 60000;
              room.keyPosition = null; // Key is "stolen"
            }
          }

          if (m.phase === 'StealingKey') {
            // Move away from players and exit
            m.x += (Math.random() - 0.5) * 5;
            m.y += (Math.random() - 0.5) * 5;
            if (now > m.phaseEndTime) {
              m.phase = 'Search';
              room.keyPosition = { x: m.x, y: m.y }; // Drop key
            }
          } else {
            // Normal mimic movement
            const target = room.players.find(p => p.id === m.targetId);
            const targetPos = (target && target.isAlive) ? { x: target.x, y: target.y } : m.lastKnownPlayerPos;
            if (targetPos) {
              const dx = targetPos.x - m.x;
              const dy = targetPos.y - m.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 5) {
                const speed = m.mimicForm ? 2 : 3; // Cautious in player form
                m.x += (dx / dist) * speed;
                m.y += (dy / dist) * speed;
              } else if (!target || !target.isAlive) {
                m.lastKnownPlayerPos = null;
              }
            }
          }
        } else if (m.type === 'Patroller') {
          // Patroller Logic
          const targetPos = m.lastKnownPlayerPos;
          if (targetPos) {
            const dx = targetPos.x - m.x;
            const dy = targetPos.y - m.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 10) {
              m.x += (dx / dist) * 5;
              m.y += (dy / dist) * 5;
            } else {
              // Reached target site (explosion or new patrol point)
              const nearbyMines = room.mines.filter(mn => !mn.isExploded && Math.sqrt(Math.pow(mn.x - m.x, 2) + Math.pow(mn.y - m.y, 2)) < 150);
              if (nearbyMines.length < 3 && room.mines.length < 40) {
                room.mines.push({
                  id: `mine-patrol-${Date.now()}`,
                  x: m.x,
                  y: m.y,
                  isExploded: false
                });
              }
              m.lastKnownPlayerPos = null;
            }
          } else {
            // Normal patrol movement
            m.x += (Math.random() - 0.5) * 6;
            m.y += (Math.random() - 0.5) * 6;

            // Mine management
            const activeMines = room.mines.filter(mn => !mn.isExploded);
            const totalMines = activeMines.length;
            const nearbyMines = activeMines.filter(mn => Math.sqrt(Math.pow(mn.x - m.x, 2) + Math.pow(mn.y - m.y, 2)) < 150);
            
            if (nearbyMines.length >= 3) {
              // Too many mines here, find a new area
              m.lastKnownPlayerPos = {
                x: Math.random() * 2000,
                y: Math.random() * 2000
              };
            } else if (totalMines < 25) {
              // Low total mines, actively look for a spot
              if (Math.random() < 0.05) {
                m.lastKnownPlayerPos = {
                  x: Math.random() * 2000,
                  y: Math.random() * 2000
                };
              }
            }

            // Place mine if conditions met
            if (totalMines < 40 && nearbyMines.length < 3 && Math.random() < 0.01) {
              room.mines.push({
                id: `mine-patrol-${Date.now()}`,
                x: m.x,
                y: m.y,
                isExploded: false
              });
            }
          }
        } else if (m.phase === 'Search' || m.phase === 'Ambush' || m.phase === 'Patrol') {
          m.x += (Math.random() - 0.5) * 4;
          m.y += (Math.random() - 0.5) * 4;
        }
      });

      // Update Debuffs
      room.players.forEach(p => {
        const now = Date.now();
        const isBroken = p.debuffs.some(d => d.type === 'Broken');
        const hasDebuff = p.debuffs.length > 0;
        
        const oldDebuffs = [...p.debuffs];
        if (isBroken) {
          p.debuffs = p.debuffs.filter(d => d.type === 'Broken' && now < d.endTime);
          if (oldDebuffs.length > 0 && p.debuffs.length === 0) {
            p.stats.survivedBroken += 1;
            p.score += 5;
          }
        } else {
          p.debuffs = p.debuffs.filter(d => now < d.endTime);
          if (oldDebuffs.length > 0 && p.debuffs.length === 0) {
            p.stats.survivedDebuff += 1;
            p.score += 2;
          }
          const hasPanic = p.debuffs.some(d => d.type === 'Panic');
          const hasConcussed = p.debuffs.some(d => d.type === 'Concussed');
          if (hasPanic && hasConcussed) {
            p.debuffs = [{ type: 'Broken', endTime: now + 40000 }];
          }
        }
      });

      io.to(room.id).emit('gameStateUpdate', { monsters: room.monsters, players: room.players });
    }, 100);
  }

  function generateMap(width: number, height: number, density: BranchDensity = 'Medium') {
    const map = Array(height).fill(0).map(() => Array(width).fill(1));
    
    // Simple maze-like generation with branches
    const fillProb = density === 'None' ? 0.4 : density === 'Low' ? 0.3 : density === 'Medium' ? 0.25 : 0.2;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (Math.random() > fillProb) map[y][x] = 0;
      }
    }

    // Ensure connectivity (very basic)
    for (let i = 0; i < width; i++) map[1][i] = 0;
    for (let i = 0; i < height; i++) map[i][1] = 0;

    return map;
  }

  function updateBot(bot: Player, room: GameState) {
  const target = bot.hasKey ? room.exitPosition : room.keyPosition;
  if (!target) return;

  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 20) {
    if (!bot.hasKey) {
      bot.hasKey = true;
      bot.stats.keysPicked += 1;
      bot.score += 2;
    } else if (room.exitDoorOpen) {
      // Bot escaped!
      bot.isAlive = false;
      bot.score += 10;
      // Check if all players finished
      if (room.players.every(p => !p.isAlive || p.hasKey)) {
        // This is a simplification, real check would be if they reached exit
      }
    }
    return;
  }

  // Simple movement towards target
  const speed = 3;
  const moveX = (dx / dist) * speed;
  const moveY = (dy / dist) * speed;

  const nextX = bot.x + moveX;
  const nextY = bot.y + moveY;

  const gridX = Math.floor(nextX / 50);
  const gridY = Math.floor(nextY / 50);

  if (gridX >= 0 && gridX < room.settings.mapSize && gridY >= 0 && gridY < room.settings.mapSize) {
    if (room.map[gridY][gridX] === 0) {
      bot.x = nextX;
      bot.y = nextY;
      bot.isMoving = true;
    } else {
      // Hit a wall, try to slide or move randomly
      bot.x += (Math.random() - 0.5) * 10;
      bot.y += (Math.random() - 0.5) * 10;
    }
  }

  // Periodic stomp
  if (Math.random() < 0.01 && !bot.debuffs.some(d => d.type === 'Stunned' || d.type === 'Broken')) {
    // Bot stomps
    io.to(room.id).emit('stompPerformed', { playerId: bot.id });
  }
}

function initGame(room: GameState) {
    const { difficulty, mapSize, branchDensity } = room.settings;
    room.map = generateMap(mapSize, mapSize, branchDensity);

    room.players.forEach((p, i) => {
      p.x = 100 + i * 50;
      p.y = 100;
      p.isAlive = true;
      p.score = 0;
      p.hasKey = false;
      p.debuffs = [];
    });

    const monsterCounts = {
      'Easy': { Hunter: 1, Screamer: 1, Patroller: 1, Mimic: 1, Mines: 20 },
      'Medium': { Hunter: 2, Screamer: 2, Patroller: 2, Mimic: 1, Mines: 30 },
      'Hard': { Hunter: 3, Screamer: 3, Patroller: 3, Mimic: 2, Mines: 45 },
      'GOD': { Hunter: 5, Screamer: 5, Patroller: 5, Mimic: 3, Mines: 60 },
    }[difficulty];

    Object.entries(monsterCounts).forEach(([type, count]) => {
      if (type === 'Mines') {
        for (let i = 0; i < count; i++) {
          room.mines.push({
            id: `mine-${i}`,
            x: 200 + Math.random() * (mapSize * 40),
            y: 200 + Math.random() * (mapSize * 40),
            isExploded: false,
          });
        }
      } else {
        for (let i = 0; i < count; i++) {
          room.monsters.push({
            id: `monster-${type}-${i}`,
            type: type as MonsterType,
            x: 500 + Math.random() * (mapSize * 40),
            y: 500 + Math.random() * (mapSize * 40),
            phase: type === 'Screamer' ? 'Ambush' : 'Search',
            phaseEndTime: Date.now() + 30000,
            targetId: null,
          });
        }
      }
    });

    room.keyPosition = { x: (mapSize - 5) * 50, y: (mapSize - 5) * 50 };
    room.exitPosition = { x: (mapSize - 2) * 50, y: (mapSize - 2) * 50 };
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
