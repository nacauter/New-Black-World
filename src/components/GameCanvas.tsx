
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player } from '../types';

interface GameCanvasProps {
  room: GameState;
  playerId: string;
  onMove: (input: { x: number, y: number }) => void;
  onStomp: () => void;
  accessibility: boolean;
  controls: {
    up: string;
    down: string;
    left: string;
    right: string;
    stomp: string;
  };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ room, playerId, onMove, onStomp, accessibility, controls }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const lastStatus = useRef<string>('');

  const speak = (text: string) => {
    if (!accessibility) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  const playTone = (freq: number, type: OscillatorType = 'sine', duration = 0.1, vol = 0.1) => {
    if (!accessibility) return;
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const player = room.players.find(p => p.id === playerId);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [sway, setSway] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.code));
      if (e.code === controls.stomp) {
        const isStunned = player?.debuffs.some(d => d.type === 'Stunned');
        const isBroken = player?.debuffs.some(d => d.type === 'Broken');
        if (!isStunned && !isBroken) onStomp();
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!player?.isAlive) return;
      
      let dx = 0;
      let dy = 0;
      if (e.code === controls.up || e.code === 'ArrowUp') dy = -1;
      if (e.code === controls.down || e.code === 'ArrowDown') dy = 1;
      if (e.code === controls.left || e.code === 'ArrowLeft') dx = -1;
      if (e.code === controls.right || e.code === 'ArrowRight') dx = 1;

      if (dx !== 0 || dy !== 0) {
        onMove({ x: dx, y: dy });
        // Increase step duration to 200ms to ensure server processes it
        setTimeout(() => onMove({ x: 0, y: 0 }), 200);
        
        const now = Date.now();
        pulses.current.push({
          x: 0,
          y: 0,
          startTime: now,
          isStomp: false,
          p: player
        });
      }
      
      if (e.code === controls.stomp && !player.debuffs.some(d => d.type === 'Stunned')) {
        onStomp();
        const now = Date.now();
        pulses.current.push({
          x: 0,
          y: 0,
          startTime: now,
          isStomp: true,
          p: player
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [controls, onMove, onStomp, player]);

  const lastMoveTime = useRef(0);
  const pulses = useRef<{ x: number, y: number, startTime: number, isStomp: boolean, p: Player }[]>([]);
  const lerpPos = useRef({ x: player?.x || 0, y: player?.y || 0 });

  useEffect(() => {
    if (player && lerpPos.current.x === 0 && lerpPos.current.y === 0) {
      lerpPos.current.x = player.x;
      lerpPos.current.y = player.y;
    }
  }, [player]);

  useEffect(() => {
    let lastTime = 0;
    // Accessibility announcements
    const status = player?.debuffs.length ? player.debuffs[0].type : 'Ready';
    if (status !== lastStatus.current) {
      speak(status);
      lastStatus.current = status;
    }

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      if (player?.isAlive) {
        const now = Date.now();

        // Clean up old pulses
        pulses.current = pulses.current.filter(p => now - p.startTime < 1500);

        // Smooth interpolation for local player
        const targetX = player.x;
        const targetY = player.y;
        const dist = Math.sqrt(Math.pow(targetX - lerpPos.current.x, 2) + Math.pow(targetY - lerpPos.current.y, 2));
        
        if (dist > 80) {
          lerpPos.current.x = targetX;
          lerpPos.current.y = targetY;
        } else {
          // Pull to server position
          const pullStrength = player.isMoving ? 0.02 : 0.15;
          lerpPos.current.x += (targetX - lerpPos.current.x) * pullStrength;
          lerpPos.current.y += (targetY - lerpPos.current.y) * pullStrength;
        }

        // Update Camera Effects
        const hasPanic = player.debuffs.some(d => d.type === 'Panic');
        const hasBroken = player.debuffs.some(d => d.type === 'Broken');

        if (hasPanic || hasBroken) {
          setShake({
            x: (Math.random() - 0.5) * (hasBroken ? 4 : 10),
            y: (Math.random() - 0.5) * (hasBroken ? 4 : 10)
          });
        } else {
          setShake({ x: 0, y: 0 });
        }

        if (hasBroken) {
          setSway(Math.sin(time / 500) * 0.05);
        } else {
          setSway(0);
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

      ctx.fillStyle = '#020202';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply Camera Effects & Interpolated Position
      ctx.translate(canvas.width / 2 + shake.x, canvas.height / 2 + shake.y);
      ctx.rotate(sway);
      ctx.translate(-lerpPos.current.x, -lerpPos.current.y);

      // Draw Sonar Pulses
      const now = Date.now();
      pulses.current.forEach(pulse => {
        const age = now - pulse.startTime;
        const duration = pulse.isStomp ? 1500 : 800;
        if (age < duration) {
          const opacity = 1 - (age / duration);
          
          // Find the player this pulse belongs to
          const p = room.players.find(pl => pl.id === pulse.p.id);
          if (!p || !p.isAlive) return;

          // Use current player position (attached)
          const px = p.id === playerId ? lerpPos.current.x : p.x;
          const py = p.id === playerId ? lerpPos.current.y : p.y;

          drawSonar(ctx, px, py, p, pulse.isStomp, opacity);
        }
      });

      // Draw Players
      room.players.forEach(p => {
        if (!p.isAlive) return;
        const isLocal = p.id === playerId;
        ctx.beginPath();
        ctx.arc(isLocal ? lerpPos.current.x : p.x, isLocal ? lerpPos.current.y : p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isLocal ? '#ffffff' : '#333333';
        ctx.fill();
        
        // Name tag for others
        if (p.id !== playerId) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, p.x, p.y - 20);
        }
      });

      ctx.restore();
    };

    const drawSonar = (ctx: CanvasRenderingContext2D, px: number, py: number, p: Player, isStompOverride?: boolean, opacity: number = 1) => {
      const isStomp = isStompOverride !== undefined ? isStompOverride : (keys.has(controls.stomp) && !p.debuffs.some(d => d.type === 'Stunned'));
      const isBroken = p.debuffs.some(d => d.type === 'Broken');
      const isConcussed = p.debuffs.some(d => d.type === 'Concussed');
      const isPanic = p.debuffs.some(d => d.type === 'Panic');

      // Distance logic: 1 model = 30 units (radius 15 * 2)
      // Average distance = 5 models = 150 units
      const modelSize = p.radius * 2;
      let rayCount = 16;
      let maxDist = modelSize * 8; // ~240 units (slightly more than average)
      
      if (isStomp) {
        rayCount = 32; // Double rays
        maxDist = modelSize * 16; // Double distance (~480 units)
      }
      
      if (isBroken) { 
        rayCount = 8; 
        maxDist = modelSize * 2; 
      } else if (isConcussed) { 
        maxDist = modelSize * 5; 
      }

      const angleStep = (Math.PI * 2) / rayCount;

      // Draw Mines (ONLY during Stomp)
      if (isStomp) {
        room.mines.forEach(m => {
          if (m.isExploded) return;
          const dx = m.x - px;
          const dy = m.y - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
      }

      for (let i = 0; i < rayCount; i++) {
        const angle = i * angleStep;
        
        let hitDist = maxDist;
        let hitWall = false;
        let wallX = 0, wallY = 0;

        // Raycast against walls - very fine step (2 units) for accuracy
        for (let d = 0; d < maxDist; d += 2) {
          const rx = px + Math.cos(angle) * d;
          const ry = py + Math.sin(angle) * d;
          const gx = Math.floor(rx / 50);
          const gy = Math.floor(ry / 50);
          const mapSize = room.settings.mapSize;
          if (gx >= 0 && gx < mapSize && gy >= 0 && gy < mapSize && room.map[gy][gx] === 1) {
            hitDist = d;
            hitWall = true;
            wallX = gx;
            wallY = gy;
            break;
          }
        }

        let baseColor = '255, 255, 255';
        let isSpecialHit = false;

        // Check Exit (Green)
        if (room.exitPosition && !isConcussed && !isBroken) {
          const dx = room.exitPosition.x - px;
          const dy = room.exitPosition.y - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const ang = Math.atan2(dy, dx);
          
          let angleDiff = Math.abs(angle - ang);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          if (dist < hitDist && angleDiff < 0.1) {
            baseColor = '0, 255, 0';
            isSpecialHit = true;
            if (opacity > 0.8) playTone(800, 'sine', 0.1, 0.1);
          }
        }

        // Check Monsters (Specific colors)
        room.monsters.forEach(m => {
          if (isConcussed || isBroken) return;
          
          // Screamer is invisible in Ambush unless Stomping
          if (m.type === 'Screamer' && m.phase === 'Ambush' && !isStomp) return;

          const dx = m.x - px;
          const dy = m.y - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const ang = Math.atan2(dy, dx);
          
          let angleDiff = Math.abs(angle - ang);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          if (dist < hitDist && angleDiff < 0.1) {
            if (m.phase === 'Rest' || m.phase === 'Sleep') {
              baseColor = '100, 100, 100'; // Darker gray
            } else {
              if (m.type === 'Hunter') baseColor = '255, 0, 0'; // Red
              else if (m.type === 'Screamer') baseColor = '255, 165, 0'; // Orange
              else if (m.type === 'Patroller') baseColor = '200, 0, 255'; // Purple
              else if (m.type === 'Mimic') baseColor = '0, 200, 255'; // Cyan
            }
            isSpecialHit = true;
            if (opacity > 0.8) {
              if (m.type === 'Hunter') playTone(100, 'sawtooth', 0.1, 0.1);
              else if (m.type === 'Screamer') playTone(400, 'triangle', 0.1, 0.1);
              else playTone(300, 'sine', 0.1, 0.1);
            }
          }
        });

        if (isPanic && !isSpecialHit) baseColor = '255, 0, 0';
        else if (isConcussed && !isSpecialHit) baseColor = '150, 150, 150';
        else if (isBroken) {
          baseColor = '255, 105, 180'; // Pink
          isSpecialHit = false; 
        }

        // Gradient for "fading" effect
        const grad = ctx.createLinearGradient(px, py, px + Math.cos(angle) * hitDist, py + Math.sin(angle) * hitDist);
        grad.addColorStop(0, `rgba(${baseColor}, ${opacity * (isSpecialHit ? 0.8 : 0.3)})`);
        grad.addColorStop(1, `rgba(${baseColor}, 0)`);

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(angle) * hitDist, py + Math.sin(angle) * hitDist);
        ctx.strokeStyle = grad;
        
        // Thickness changes based on distance (thicker when closer)
        ctx.lineWidth = isSpecialHit ? 3 : Math.max(0.5, 3 * (1 - hitDist / maxDist));
        ctx.stroke();

        // Reveal wall softly
        if (hitWall) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.05 * (1 - hitDist / maxDist)})`;
          ctx.fillRect(wallX * 50, wallY * 50, 50, 50);
        }
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
