
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player } from '../types';

interface GameCanvasProps {
  room: GameState;
  playerId: string;
  onMove: (input: { x: number, y: number }) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ room, playerId, onMove }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const player = room.players.find(p => p.id === playerId);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [sway, setSway] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.code));
      if (e.code === 'Space') {
        // Stomp logic handled by socket
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => {
      const next = new Set(prev);
      next.delete(e.code);
      return next;
    });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      if (player?.isAlive) {
        // Update Camera Effects
        const hasPanic = player.debuffs.some(d => d.type === 'Panic');
        const hasBroken = player.debuffs.some(d => d.type === 'Broken');

        if (hasPanic) {
          setShake({
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
          });
        } else {
          setShake({ x: 0, y: 0 });
        }

        if (hasBroken) {
          setSway(Math.sin(time / 200) * 0.05);
        } else {
          setSway(0);
        }

        // Movement
        if (keys.size > 0) {
          let dx = 0;
          let dy = 0;
          if (keys.has('KeyW')) dy -= 1;
          if (keys.has('KeyS')) dy += 1;
          if (keys.has('KeyA')) dx -= 1;
          if (keys.has('KeyD')) dx += 1;
          if (dx !== 0 || dy !== 0) {
            onMove({ x: dx, y: dy });
          }
        }
      }

      render();
      requestAnimationFrame(loop);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !player) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply Camera Effects
      ctx.translate(canvas.width / 2 + shake.x, canvas.height / 2 + shake.y);
      ctx.rotate(sway);
      ctx.translate(-player.x, -player.y);

      // Draw Map
      ctx.fillStyle = '#111111';
      room.map.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) ctx.fillRect(x * 50, y * 50, 50, 50);
        });
      });

      // Draw Mines (Explosion flash)
      room.mines.forEach(m => {
        if (m.isExploded && m.explosionTime && Date.now() - m.explosionTime < 500) {
          ctx.beginPath();
          ctx.arc(m.x, m.y, 100, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - (Date.now() - m.explosionTime) / 500})`;
          ctx.fill();
        }
      });

      // Draw Sonar
      drawSonar(ctx, player);

      // Draw Players
      room.players.forEach(p => {
        if (!p.isAlive) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.id === playerId ? '#ffffff' : '#444444';
        ctx.fill();
      });

      ctx.restore();
    };

    const drawSonar = (ctx: CanvasRenderingContext2D, p: Player) => {
      const isStomp = keys.has('Space') && !p.debuffs.some(d => d.type === 'Stunned');
      const isBroken = p.debuffs.some(d => d.type === 'Broken');
      const isConcussed = p.debuffs.some(d => d.type === 'Concussed');
      const isPanic = p.debuffs.some(d => d.type === 'Panic');

      let rayCount = isStomp ? 32 : 16;
      let maxDist = isStomp ? 600 : 300;
      
      if (isBroken) { rayCount = 8; maxDist = 100; }
      else if (isConcussed) { maxDist = 150; }

      const angleStep = (Math.PI * 2) / rayCount;

      for (let i = 0; i < rayCount; i++) {
        const angle = i * angleStep;
        let color = 'rgba(255, 255, 255, 0.1)';
        let thickness = 1;

        if (isBroken) color = 'rgba(255, 105, 180, 0.5)';
        else if (isPanic) color = 'rgba(255, 0, 0, 0.5)';
        else if (isConcussed) color = 'rgba(128, 128, 128, 0.5)';

        // Check Exit
        if (room.exitPosition && !isConcussed && !isBroken) {
          const dx = room.exitPosition.x - p.x;
          const dy = room.exitPosition.y - p.y;
          const distToExit = Math.sqrt(dx*dx + dy*dy);
          const angleToExit = Math.atan2(dy, dx);
          if (Math.abs(angle - angleToExit) < 0.1 && distToExit < maxDist) {
            color = 'rgba(0, 255, 0, 0.8)';
            thickness = 2;
          }
        }

        // Check Monsters
        room.monsters.forEach(m => {
          if (isConcussed || isBroken) return;
          const dx = m.x - p.x;
          const dy = m.y - p.y;
          const distToMonster = Math.sqrt(dx*dx + dy*dy);
          const angleToMonster = Math.atan2(dy, dx);
          
          if (Math.abs(angle - angleToMonster) < 0.1 && distToMonster < maxDist) {
            if (m.type === 'Hunter') color = 'rgba(255, 0, 0, 0.8)';
            else if (m.type === 'Screamer') color = 'rgba(255, 165, 0, 0.8)';
            else if (m.type === 'Patroller') color = 'rgba(128, 0, 128, 0.8)';
            else if (m.type === 'Mimic') color = 'rgba(255, 255, 255, 0.8)'; // Mimic looks like player
            thickness = 4 - (distToMonster / maxDist) * 3;

            // Draw Mimic as circle if hit
            if (m.type === 'Mimic') {
              ctx.beginPath();
              ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.fill();
            }
          }
        });

        // Stomp reveals mines
        if (isStomp) {
          room.mines.forEach(m => {
            if (m.isExploded) return;
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            const distToMine = Math.sqrt(dx*dx + dy*dy);
            if (distToMine < maxDist) {
              ctx.beginPath();
              ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.stroke();
            }
          });
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(angle) * maxDist, p.y + Math.sin(angle) * maxDist);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }
    };

    requestAnimationFrame(loop);
  }, [room, playerId, keys, onMove, shake, sway]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block"
      />
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 p-2 rounded">
        STATUS: {player?.isAlive ? 'ALIVE' : 'DEAD'} | SCORE: {player?.score}
      </div>
    </div>
  );
};
