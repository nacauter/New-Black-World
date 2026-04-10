
import React, { useState } from 'react';
import { useGame } from './hooks/useGame';
import { GameCanvas } from './components/GameCanvas';
import { LogOut, Users, Play, Shield, MessageSquare, BookOpen, Trophy, Settings } from 'lucide-react';

const translations = {
  RU: {
    title: 'Black World',
    subtitle: 'Тишина Жаждет',
    enterName: 'ВВЕДИТЕ ВАШЕ ИМЯ',
    createRoom: 'СОЗДАТЬ КОМНАТУ',
    availableRooms: 'Доступные комнаты',
    noRooms: 'Комнат не найдено в пустоте...',
    help: 'Помощь',
    trophies: 'Достижения',
    settings: 'Настройки',
    version: 'ВЕРСИЯ 0.1.0-ALPHA | LAN СЕРВЕР АКТИВЕН',
    waiting: 'Ожидание игроков...',
    players: 'Игроки',
    ready: 'ГОТОВ',
    notReady: 'НЕ ГОТОВ',
    startGame: 'Начать игру',
    lobbyChat: 'Чат лобби',
    typeMessage: 'Введите сообщение...',
    guide: 'Руководство по Пустоте',
    mechanics: 'Механики',
    entities: 'Сущности',
    close: 'Закрыть',
    status: {
      quiet: 'Тишина',
      nearby: 'Рядом кто-то есть',
      running: 'Кто-то на меня бежит',
      panic: 'ПАНИКА',
      concussed: 'КОНТУЗИЯ',
      stunned: 'ОШЕЛОМЛЕН',
      broken: 'СЛОМЛЕН'
    }
  },
  EN: {
    title: 'Black World',
    subtitle: 'The Silence is Hungry',
    enterName: 'ENTER YOUR NAME',
    createRoom: 'CREATE ROOM',
    availableRooms: 'Available Rooms',
    noRooms: 'No rooms found in the void...',
    help: 'Help',
    trophies: 'Trophies',
    settings: 'Settings',
    version: 'VERSION 0.1.0-ALPHA | LAN SERVER ACTIVE',
    waiting: 'Waiting for players...',
    players: 'Players',
    ready: 'READY',
    notReady: 'NOT READY',
    startGame: 'Start Game',
    lobbyChat: 'Lobby Chat',
    typeMessage: 'Type a message...',
    guide: 'Guide to the Void',
    mechanics: 'Mechanics',
    entities: 'Entities',
    close: 'Close',
    status: {
      quiet: 'Silence',
      nearby: 'Someone is nearby',
      running: 'Someone is running at me',
      panic: 'PANIC',
      concussed: 'CONCUSSED',
      stunned: 'STUNNED',
      broken: 'BROKEN'
    }
  }
};

export default function App() {
  const { room, messages, roomList, createRoom, joinRoom, setReady, startGame, sendMessage, move, stomp, socket } = useGame();
  const [name, setName] = useState('');
  const [view, setView] = useState<'Menu' | 'Lobby' | 'Game' | 'Help' | 'Achievements'>('Menu');
  const [chatInput, setChatInput] = useState('');
  const [lang, setLang] = useState<'RU' | 'EN'>('RU');
  const t = translations[lang];

  const getClassification = (score: number) => {
    if (score >= 90) return lang === 'RU' ? 'Я БОГ' : 'I AM GOD';
    if (score >= 61) return lang === 'RU' ? 'Эксперт' : 'Expert';
    if (score >= 41) return lang === 'RU' ? 'Я Сонар' : 'I Am Sonar';
    if (score >= 0) return lang === 'RU' ? 'Новичок' : 'Novice';
    if (score >= -9) return lang === 'RU' ? 'Неудачливый новичок' : 'Unlucky Novice';
    if (score >= -39) return lang === 'RU' ? 'Неудачливый' : 'Unlucky';
    if (score >= -69) return lang === 'RU' ? 'Невезучий' : 'Unfortunate';
    return lang === 'RU' ? 'Бездарный' : 'Talentless';
  };

  const handleCreate = () => {
    if (!name) return alert(lang === 'RU' ? 'Пожалуйста, введите имя' : 'Please enter your name');
    createRoom(name, { difficulty: 'Easy', seed: Math.random().toString() });
    setView('Lobby');
  };

  const handleJoin = (id: string) => {
    if (!name) return alert(lang === 'RU' ? 'Пожалуйста, введите имя' : 'Please enter your name');
    joinRoom(id, name);
    setView('Lobby');
  };

  const player = room?.players.find(p => p.id === socket?.id);

  const getStatus = () => {
    if (!player) return '';
    if (player.debuffs.some(d => d.type === 'Broken')) return t.status.broken;
    if (player.debuffs.some(d => d.type === 'Stunned')) return t.status.stunned;
    if (player.debuffs.some(d => d.type === 'Concussed')) return t.status.concussed;
    if (player.debuffs.some(d => d.type === 'Panic')) return t.status.panic;
    
    // Proximity check for status
    const nearbyMonster = room?.monsters.find(m => {
      const dx = m.x - player.x;
      const dy = m.y - player.y;
      return Math.sqrt(dx*dx + dy*dy) < 300;
    });
    if (nearbyMonster) {
      return nearbyMonster.phase === 'Hunt' ? t.status.running : t.status.nearby;
    }
    return t.status.quiet;
  };

  if (room && room.phase === 'Playing') {
    return (
      <div className="flex h-screen w-screen bg-black overflow-hidden">
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono uppercase tracking-widest text-zinc-400">
              {getStatus()}
            </div>
            {player?.hasKey && (
              <div className="px-3 py-1 bg-yellow-900/50 border border-yellow-700 rounded text-xs font-mono uppercase text-yellow-500">
                KEY ACQUIRED
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{getClassification(player?.score || 0)}</div>
              <div className="text-sm font-mono text-white">{player?.score.toFixed(1)} PTS</div>
            </div>
            <button onClick={() => window.location.reload()} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 relative">
          <GameCanvas room={room} playerId={socket?.id || ''} onMove={move} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen w-screen bg-[#050505] text-[#e5e5e5] flex flex-col items-center justify-center p-8 font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("/bg.png")' }}
    >
      <div className="absolute top-8 right-8 flex gap-2 z-20">
        <button onClick={() => setLang('RU')} className={`text-xs px-2 py-1 rounded ${lang === 'RU' ? 'bg-white text-black' : 'text-zinc-500'}`}>RU</button>
        <button onClick={() => setLang('EN')} className={`text-xs px-2 py-1 rounded ${lang === 'EN' ? 'bg-white text-black' : 'text-zinc-500'}`}>EN</button>
      </div>

      {view === 'Menu' && (
        <div className="max-w-md w-full space-y-8 text-center z-10">
          <div className="space-y-2">
            <h1 className="text-7xl font-mono font-bold tracking-tighter uppercase flicker text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{t.title}</h1>
            <p className="text-zinc-400 text-sm tracking-widest uppercase font-bold">{t.subtitle}</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder={t.enterName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-4 py-3 text-center focus:outline-none focus:border-zinc-600 transition-colors"
            />
            
            <button
              onClick={handleCreate}
              className="w-full bg-white text-black font-bold py-3 rounded hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={18} /> {t.createRoom}
            </button>

            <div className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-widest">{t.availableRooms}</p>
              {roomList.length === 0 ? (
                <div className="p-4 border border-zinc-800 rounded text-zinc-700 text-sm italic bg-black/50">
                  {t.noRooms}
                </div>
              ) : (
                roomList.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleJoin(r.id)}
                    className="w-full p-4 border border-zinc-800 rounded hover:bg-zinc-900 transition-colors flex justify-between items-center bg-black/50"
                  >
                    <span className="font-mono">{r.id}</span>
                    <span className="text-xs text-zinc-500 uppercase">{r.host}'s Game</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8">
            <button onClick={() => setView('Help')} className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors">
              <BookOpen size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.help}</span>
            </button>
            <button onClick={() => setView('Achievements')} className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors">
              <Trophy size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.trophies}</span>
            </button>
            <button className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors">
              <Settings size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.settings}</span>
            </button>
          </div>
          
          <div className="pt-8 text-[10px] text-zinc-700 font-mono">
            {t.version}
          </div>
        </div>
      )}

      {view === 'Lobby' && room && (
        <div className="max-w-4xl w-full h-full flex flex-col gap-8 z-10">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-2xl font-mono font-bold uppercase">Room: {room.id}</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t.waiting}</p>
            </div>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-hidden">
            <div className="space-y-4 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-widest">
                <Users size={14} /> {t.players} ({room.players.length}/10)
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {room.players.map(p => (
                  <div key={p.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${p.isReady || p.isHost ? 'bg-green-500' : 'bg-zinc-700'}`} />
                      <span className="font-mono">{p.name} {p.isHost && <span className="text-[10px] text-zinc-500 ml-2">(HOST)</span>}</span>
                    </div>
                    {p.id === socket?.id && !p.isHost && (
                      <button
                        onClick={() => setReady(!p.isReady)}
                        className={`px-4 py-1 rounded text-xs font-bold uppercase transition-colors ${
                          p.isReady ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {p.isReady ? t.ready : t.notReady}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {room.players.find(p => p.id === socket?.id)?.isHost && (
                <button
                  onClick={startGame}
                  disabled={!room.players.every(p => p.isReady || p.isHost)}
                  className="w-full bg-white text-black font-bold py-4 rounded hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                >
                  {t.startGame}
                </button>
              )}
            </div>

            <div className="flex flex-col bg-zinc-900/50 border border-zinc-800 rounded overflow-hidden">
              <div className="p-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest">
                <MessageSquare size={12} /> {t.lobbyChat}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                {messages.map(m => (
                  <div key={m.id} className="text-sm">
                    <span className="text-zinc-500 font-mono mr-2">{m.sender}:</span>
                    <span className="text-zinc-300">{m.text}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-zinc-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (sendMessage(chatInput), setChatInput(''))}
                  placeholder={t.typeMessage}
                  className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'Help' && (
        <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 overflow-y-auto max-h-[80vh] z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.guide}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          <div className="prose prose-invert max-w-none text-zinc-400 space-y-4">
            <section>
              <h3 className="text-white uppercase text-sm tracking-widest">{t.mechanics}</h3>
              <p>Movement: WASD. Every step emits 16 sonar rays.</p>
              <p>Sonar: Rays change color when hitting objects. Red = Hunter, Orange = Screamer, Purple = Patroller, Green = Exit.</p>
              <p>Stomp (SPACE): Double sonar range and rays. Attracts Hunters. Highlights mines (White circles).</p>
            </section>
            <section>
              <h3 className="text-white uppercase text-sm tracking-widest">{t.entities}</h3>
              <p><span className="text-red-500">Hunter:</span> Roams the map. Roar causes Panic (camera shake, red rays).</p>
              <p><span className="text-orange-500">Screamer:</span> Ambushes players. Scream causes Concussion (reduced sonar, gray rays).</p>
              <p><span className="text-purple-500">Patroller:</span> Plants mines. Avoid at all costs.</p>
            </section>
          </div>
        </div>
      )}

      {view === 'Achievements' && (
        <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.trophies}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
            <div className="p-4 border border-zinc-800 rounded bg-black/30">
              <div className="font-bold text-zinc-300">Bye Bye Hunter</div>
              <div className="text-xs text-zinc-600">Escape the Hunter 20 times</div>
            </div>
            <div className="p-4 border border-zinc-800 rounded bg-black/30">
              <div className="font-bold text-zinc-300">Terminator</div>
              <div className="text-xs text-zinc-600">Survive the Broken debuff 50 times</div>
            </div>
            <div className="p-4 border border-zinc-800 rounded bg-black/30">
              <div className="font-bold text-zinc-300">Amogus!</div>
              <div className="text-xs text-zinc-600">Expose a Mimic 30 times</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
