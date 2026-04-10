
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => new Set(prev).add(e.code));
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

      render();
      requestAnimationFrame(loop);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !player) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera transform (center on player)
      ctx.save();
      ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

      // Draw Map (only walls for now)
      ctx.fillStyle = '#1a1a1a';
      room.map.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) {
            ctx.fillRect(x * 50, y * 50, 50, 50);
          }
        });
      });

      // Draw Sonar Rays
      drawSonar(ctx, player);

      // Draw Players
      room.players.forEach(p => {
        if (!p.isAlive) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.id === playerId ? '#ffffff' : '#888888';
        ctx.fill();
        ctx.closePath();
      });

      // Draw Monsters (only if hit by sonar - simplified for now)
      room.monsters.forEach(m => {
        // In real game, only draw if hit by ray
        // ctx.beginPath();
        // ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
        // ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        // ctx.fill();
      });

      ctx.restore();
    };

    const drawSonar = (ctx: CanvasRenderingContext2D, p: Player) => {
      const isStomp = keys.has('Space');
      const rayCount = isStomp ? 32 : 16;
      const maxDist = isStomp ? 600 : 300;
      const angleStep = (Math.PI * 2) / rayCount;

      for (let i = 0; i < rayCount; i++) {
        const angle = i * angleStep;
        let dist = maxDist;
        let color = 'rgba(255, 255, 255, 0.1)';
        let thickness = 1;

        // Simple raycasting against walls
        // In a full implementation, we'd iterate through map cells or use a physics engine
        // For this prototype, we'll just check distance to monsters and exit
        
        // Check Exit
        if (room.exitPosition) {
          const dx = room.exitPosition.x - p.x;
          const dy = room.exitPosition.y - p.y;
          const angleToExit = Math.atan2(dy, dx);
          const diff = Math.abs(angle - angleToExit);
          if (diff < 0.1) {
            color = 'rgba(0, 255, 0, 0.5)';
            thickness = 2;
          }
        }

        // Check Monsters
        room.monsters.forEach(m => {
          const dx = m.x - p.x;
          const dy = m.y - p.y;
          const distToMonster = Math.sqrt(dx*dx + dy*dy);
          const angleToMonster = Math.atan2(dy, dx);
          const diff = Math.abs(angle - angleToMonster);
          
          if (diff < 0.1 && distToMonster < maxDist) {
            if (m.type === 'Hunter') color = 'rgba(255, 0, 0, 0.6)';
            else if (m.type === 'Screamer') color = 'rgba(255, 165, 0, 0.6)';
            else if (m.type === 'Patroller') color = 'rgba(128, 0, 128, 0.6)';
            thickness = 3 - (distToMonster / maxDist) * 2;
          }
        });

        // Check Mines (only if stomp)
        if (isStomp) {
          room.mines.forEach(m => {
            const dx = m.x - p.x;
            const dy = m.y - p.y;
            const distToMine = Math.sqrt(dx*dx + dy*dy);
            if (distToMine < maxDist) {
              ctx.beginPath();
              ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.stroke();
            }
          });
        }

        const targetX = p.x + Math.cos(angle) * dist;
        const targetY = p.y + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }
    };

    requestAnimationFrame(loop);
  }, [room, playerId, keys, onMove]);

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
