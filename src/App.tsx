
import React, { useState, useEffect } from 'react';
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
    singlePlayer: 'ОДИНОЧНАЯ ИГРА',
    version: 'ВЕРСИЯ 0.1.0-ALPHA',
    serverStatus: 'СЕРВЕР: АКТИВЕН',
    subtitles: [
      'Тишина Жаждет',
      'Они слышат твой шаг',
      'Тьма не пуста',
      'Не оглядывайся',
      'Смерть тиха',
      'Беги, пока можешь'
    ],
    addons: 'Дополнения',
    mods: 'Моды',
    officialAddons: 'Официальные',
    waiting: 'Ожидание игроков...',
    players: 'Игроки',
    ready: 'ГОТОВ',
    notReady: 'НЕ ГОТОВ',
    startGame: 'Начать игру',
    lobbyChat: 'Чат лобби',
    typeMessage: 'Введите сообщение...',
    guide: 'Руководство по Пустоте',
    mechanics: 'Механики',
    mechanicsDesc: [
      'Передвижение: WASD. Каждый шаг испускает 16 лучей сонара.',
      'Сонар: Лучи меняют цвет при попадании в объекты. Красный = Охотник, Оранжевый = Крикун, Пурпурный = Патрульный, Зеленый = Выход.',
      'Топот (ПРОБЕЛ): Удваивает дальность и количество лучей. Привлекает Охотников. Подсвечивает мины (белые круги).'
    ],
    entities: 'Сущности',
    entitiesDesc: [
      'Охотник: Бродит по карте. Рев вызывает Панику (тряска камеры, красные лучи).',
      'Крикун: Устраивает засады. Крик вызывает Контузию (уменьшенный сонар, серые лучи).',
      'Патрульный: Расставляет мины. Избегайте любой ценой.'
    ],
    achievements: [
      { id: 'joke', title: 'А Что? Достижения так легко?', desc: 'Просто загляните сюда', target: 1, stat: 'joke' },
      { id: 'hunter', title: 'Пока-пока, Охотник', desc: 'Убегите от Охотника 20 раз', target: 20, stat: 'escapedHunter' },
      { id: 'screamer', title: 'Что там пискнуло?', desc: 'Убегите от Крикуна 20 раз', target: 20, stat: 'escapedScreamer' },
      { id: 'mine', title: 'А что? Я не слышу!!!', desc: 'Активируйте мину 40 раз', target: 40, stat: 'minesActivated' },
      { id: 'mimic', title: 'Ага, а вот и ты, Амогус!', desc: 'Разоблачите Мимика 30 раз', target: 30, stat: 'mimicsExposed' },
      { id: 'key', title: 'Да мне пора купить ключницу!', desc: 'Подберите ключ 20 раз', target: 20, stat: 'keysPicked' },
      { id: 'death', title: 'Спокойной ночи!', desc: 'Умрите 30 раз', target: 30, stat: 'deaths' },
      { id: 'debuff', title: 'Да я везуч!', desc: 'Выживите под дебаффом 20 раз', target: 20, stat: 'survivedDebuff' },
      { id: 'debuff_death', title: 'Да меня подставили!!!', desc: 'Умрите под дебаффом 30 раз', target: 30, stat: 'diedUnderDebuff' },
      { id: 'terminator', title: 'Да я терминатор!', desc: 'Выживите под дебаффом "Сломлен" 50 раз', target: 50, stat: 'survivedBroken' },
      { id: 'unfair', title: 'Да это не честно', desc: 'Умрите под дебаффом "Сломлен" 10 раз', target: 10, stat: 'diedUnderBroken' },
      { id: 'pancakes', title: 'Блины, кому блинчики', desc: 'Погибните от Патрульного 13 раз', target: 13, stat: 'killedByPatroller' },
      { id: 'snack', title: 'Хорошая закуска', desc: 'Умрите от Охотника 20 раз', target: 20, stat: 'killedByHunter' },
      { id: 'scream_lover', title: 'Любитель криков', desc: 'Умрите от Крикуна 10 раз', target: 10, stat: 'killedByScreamer' },
      { id: 'someone_else', title: 'Это точно кто-то другой', desc: 'Умрите от Мимика 15 раз', target: 15, stat: 'killedByMimic' }
    ],
    close: 'Закрыть',
    status: {
      quiet: 'Тишина',
      nearby: 'Рядом кто-то есть',
      running: 'Кто-то на меня бежит',
      panic: 'ПАНИКА',
      concussed: 'КОНТУЗИЯ',
      stunned: 'ОШЕЛОМЛЕН',
      broken: 'СЛОМЛЕН'
    },
    helpContent: [
      { title: 'Основы', text: 'Вы находитесь в Пустоте. Ваша цель - найти ключ и выбраться через дверь. Тьма абсолютна, используйте сонар.' },
      { title: 'Управление', text: 'Движение: WASD. Топот: Space.' },
      { title: 'Сонар', text: 'Белый: Стены. Красный: Охотник. Оранжевый: Крикун. Пурпурный: Патрульный. Зеленый: Выход. Белый круг: Мина (только при топоте).' },
      { title: 'Дебаффы', text: 'Паника: Тряска камеры. Контузия: Малый радиус сонара. Ошеломление: Нельзя топать. Сломлен: Розовый сонар, галлюцинации.' }
    ],
    gameOver: 'ИГРА ОКОНЧЕНА',
    killer: 'Убийца',
    yourScore: 'Ваш счет',
    classifier: 'Классификатор',
    rankChanged: 'Ранг изменен!',
    toMenu: 'В МЕНЮ',
    exitWarning: 'Прогресс будет потерян. Выйти?',
    keyAcquired: 'КЛЮЧ ПОДОБРАН',
    leave: 'Выйти',
    copyId: 'ID комнаты скопирован!',
    enterPassword: 'Введите пароль',
    enterPasswordPlaceholder: 'Оставьте пустым для открытой комнаты',
    enterPasswordJoin: 'Введите пароль для входа',
    login: 'ВОЙТИ',
    cancel: 'ОТМЕНА',
    settingsLabels: {
      difficulty: 'Сложность',
      mapSize: 'Размер карты',
      branching: 'Разветвленность',
      screen: 'Экран',
      seed: 'Сид карты',
      password: 'Пароль комнаты',
      controls: 'Управление',
      language: 'Язык',
      accessibility: 'Доступность'
    },
    difficulties: { Easy: 'Легко', Medium: 'Средне', Hard: 'Сложно', GOD: 'БОГ' },
    mapSizes: { 40: 'Маленькая (40x40)', 60: 'Средняя (60x60)', 80: 'Большая (80x80)' },
    branchingLevels: { None: 'Без ответвлений', Low: 'Мало', Medium: 'Средне', High: 'Много' },
    screenModes: { fullscreen: 'Полный экран', windowed: 'В окне' },
    next: 'Далее',
    back: 'Назад',
    page: 'Страница',
    hostLabel: '(ХОСТ)',
    addBot: 'Добавить бота',
    accessibility: 'Доступность',
    ranks: {
      god: 'Я БОГ',
      expert: 'Эксперт',
      sonar: 'Я Сонар',
      novice: 'Новичок',
      unluckyNovice: 'Неудачливый новичок',
      unlucky: 'Неудачливый',
      unfortunate: 'Невезучий',
      talentless: 'Бездарный'
    },
    errors: {
      INVALID_PASSWORD: 'Неверный пароль',
      ROOM_UNAVAILABLE: 'Комната полна или уже началась',
      NAME_TAKEN: 'Имя уже занято',
      NAME_REQUIRED: 'Пожалуйста, введите имя'
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
    trophies: 'Achievements',
    settings: 'Settings',
    singlePlayer: 'SINGLE PLAYER',
    version: 'VERSION 0.1.0-ALPHA',
    serverStatus: 'SERVER: ACTIVE',
    subtitles: [
      'The Silence is Hungry',
      'They hear your steps',
      'The dark is not empty',
      'Don\'t look back',
      'Death is silent',
      'Run while you can'
    ],
    addons: 'Add-ons',
    mods: 'Mods',
    officialAddons: 'Official',
    waiting: 'Waiting for players...',
    players: 'Players',
    ready: 'READY',
    notReady: 'NOT READY',
    startGame: 'Start Game',
    lobbyChat: 'Lobby Chat',
    typeMessage: 'Type a message...',
    guide: 'Guide to the Void',
    mechanics: 'Mechanics',
    mechanicsDesc: [
      'Movement: WASD. Every step emits 16 sonar rays.',
      'Sonar: Rays change color when hitting objects. Red = Hunter, Orange = Screamer, Purple = Patroller, Green = Exit.',
      'Stomp (SPACE): Double sonar range and rays. Attracts Hunters. Highlights mines (White circles).'
    ],
    entities: 'Entities',
    entitiesDesc: [
      'Hunter: Roams the map. Roar causes Panic (camera shake, red rays).',
      'Screamer: Ambushes players. Scream causes Concussion (reduced sonar, gray rays).',
      'Patroller: Plants mines. Avoid at all costs.'
    ],
    achievements: [
      { id: 'joke', title: 'Wait, achievements are this easy?', desc: 'Just take a look here', target: 1, stat: 'joke' },
      { id: 'hunter', title: 'Bye Bye Hunter', desc: 'Escape the Hunter 20 times', target: 20, stat: 'escapedHunter' },
      { id: 'screamer', title: 'What was that squeak?', desc: 'Escape the Screamer 20 times', target: 20, stat: 'escapedScreamer' },
      { id: 'mine', title: 'What? I can\'t hear!!!', desc: 'Activate a mine 40 times', target: 40, stat: 'minesActivated' },
      { id: 'mimic', title: 'Aha, there you are, Amogus!', desc: 'Expose a Mimic 30 times', target: 30, stat: 'mimicsExposed' },
      { id: 'key', title: 'I need a key holder!', desc: 'Pick up the key 20 times', target: 20, stat: 'keysPicked' },
      { id: 'death', title: 'Good night!', desc: 'Die 30 times', target: 30, stat: 'deaths' },
      { id: 'debuff', title: 'I\'m lucky!', desc: 'Survive under a debuff 20 times', target: 20, stat: 'survivedDebuff' },
      { id: 'debuff_death', title: 'I was set up!!!', desc: 'Die under a debuff 30 times', target: 30, stat: 'diedUnderDebuff' },
      { id: 'terminator', title: 'I am a Terminator!', desc: 'Survive the Broken debuff 50 times', target: 50, stat: 'survivedBroken' },
      { id: 'unfair', title: 'That\'s not fair', desc: 'Die under the Broken debuff 10 times', target: 10, stat: 'diedUnderBroken' },
      { id: 'pancakes', title: 'Pancakes for everyone', desc: 'Die from a Patroller 13 times', target: 13, stat: 'killedByPatroller' },
      { id: 'snack', title: 'Good snack', desc: 'Die from a Hunter 20 times', target: 20, stat: 'killedByHunter' },
      { id: 'scream_lover', title: 'Scream lover', desc: 'Die from a Screamer 10 times', target: 10, stat: 'killedByScreamer' },
      { id: 'someone_else', title: 'It\'s definitely someone else', desc: 'Die from a Mimic 15 times', target: 15, stat: 'killedByMimic' }
    ],
    close: 'Close',
    status: {
      quiet: 'Silence',
      nearby: 'Someone is nearby',
      running: 'Someone is running at me',
      panic: 'PANIC',
      concussed: 'CONCUSSED',
      stunned: 'STUNNED',
      broken: 'BROKEN'
    },
    helpContent: [
      { title: 'Basics', text: 'You are in the Void. Your goal is to find the key and escape through the door. Darkness is absolute, use sonar.' },
      { title: 'Controls', text: 'Movement: WASD. Stomp: Space.' },
      { title: 'Sonar', text: 'White: Walls. Red: Hunter. Orange: Screamer. Purple: Patroller. Green: Exit. White circle: Mine (stomp only).' },
      { title: 'Debuffs', text: 'Panic: Camera shake. Concussion: Small sonar radius. Stunned: Cannot stomp. Broken: Pink sonar, hallucinations.' }
    ],
    gameOver: 'GAME OVER',
    killer: 'Killer',
    yourScore: 'Your Score',
    classifier: 'Classifier',
    rankChanged: 'Rank Changed!',
    yourRank: 'Your Rank',
    toMenu: 'TO MENU',
    exitWarning: 'Progress will be lost. Exit?',
    keyAcquired: 'KEY ACQUIRED',
    leave: 'Leave',
    copyId: 'Room ID copied!',
    enterPassword: 'Enter Password',
    enterPasswordPlaceholder: 'Leave empty for open room',
    enterPasswordJoin: 'Enter password to join',
    login: 'LOGIN',
    cancel: 'CANCEL',
    settingsLabels: {
      difficulty: 'Difficulty',
      mapSize: 'Map Size',
      branching: 'Branching',
      screen: 'Screen',
      seed: 'Map Seed',
      password: 'Room Password',
      controls: 'Controls',
      language: 'Language',
      accessibility: 'Accessibility'
    },
    difficulties: { Easy: 'Easy', Medium: 'Medium', Hard: 'Hard', GOD: 'GOD' },
    mapSizes: { 40: 'Small (40x40)', 60: 'Medium (60x60)', 80: 'Large (80x80)' },
    branchingLevels: { None: 'No branches', Low: 'Low', Medium: 'Medium', High: 'High' },
    screenModes: { fullscreen: 'Fullscreen', windowed: 'Windowed' },
    next: 'Next',
    back: 'Back',
    page: 'Page',
    hostLabel: '(HOST)',
    addBot: 'Add Bot',
    accessibility: 'Accessibility',
    ranks: {
      god: 'I AM GOD',
      expert: 'Expert',
      sonar: 'I Am Sonar',
      novice: 'Novice',
      unluckyNovice: 'Unlucky Novice',
      unlucky: 'Unlucky',
      unfortunate: 'Unfortunate',
      talentless: 'Talentless'
    },
    errors: {
      INVALID_PASSWORD: 'Invalid password',
      ROOM_UNAVAILABLE: 'Room full or already started',
      NAME_TAKEN: 'Name already taken',
      NAME_REQUIRED: 'Please enter your name'
    }
  }
};

export default function App() {
  const { room, messages, roomList, createRoom, joinRoom, setReady, startGame, sendMessage, move, stomp, kickPlayer, addBot, socket } = useGame();
  const [name, setName] = useState('');
  const [view, setView] = useState<'Menu' | 'Lobby' | 'Game' | 'Help' | 'Achievements' | 'Settings' | 'Addons'>('Menu');
  const [chatInput, setChatInput] = useState('');
  const [lang, setLang] = useState<'RU' | 'EN'>('RU');
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const t = translations[lang];
  const [dynamicSubtitle, setDynamicSubtitle] = useState('');

  useEffect(() => {
    const subs = t.subtitles || [t.subtitle];
    setDynamicSubtitle(subs[Math.floor(Math.random() * subs.length)]);
    
    const interval = setInterval(() => {
      setDynamicSubtitle(subs[Math.floor(Math.random() * subs.length)]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [lang, t.subtitles, t.subtitle]);

  const [jokeUnlocked, setJokeUnlocked] = useState(() => {
    return localStorage.getItem('blackworld_joke') === 'true';
  });

  useEffect(() => {
    if (view === 'Achievements' && !jokeUnlocked) {
      setJokeUnlocked(true);
      localStorage.setItem('blackworld_joke', 'true');
    }
  }, [view, jokeUnlocked]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [settings, setSettings] = useState({
    difficulty: 'Easy' as any,
    seed: Math.random().toString().substring(2, 8),
    mapSize: 40,
    branchDensity: 'Medium' as any,
    password: '',
    fullscreen: false,
    accessibility: false,
    controls: {
      up: 'KeyW',
      down: 'KeyS',
      left: 'KeyA',
      right: 'KeyD',
      stomp: 'Space'
    }
  });

  const [helpPage, setHelpPage] = useState(0);
  const helpContent = t.helpContent;

  useEffect(() => {
    if (!socket) return;
    const handleError = (errCode: string) => {
      const msg = t.errors[errCode as keyof typeof t.errors] || errCode;
      setError(msg);
    };
    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket, t.errors]);
  const [joinPassword, setJoinPassword] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const getClassification = (score: number) => {
    if (score >= 90) return t.ranks.god;
    if (score >= 61) return t.ranks.expert;
    if (score >= 41) return t.ranks.sonar;
    if (score >= 0) return t.ranks.novice;
    if (score >= -9) return t.ranks.unluckyNovice;
    if (score >= -39) return t.ranks.unlucky;
    if (score >= -69) return t.ranks.unfortunate;
    return t.ranks.talentless;
  };

  const handleCreate = () => {
    if (!name) return setError(t.errors.NAME_REQUIRED);
    const isDuplicate = roomList.some(r => r.host === name);
    if (isDuplicate) return setError(t.errors.NAME_TAKEN);
    createRoom(name, settings);
    setView('Lobby');
  };

  const handleSinglePlayer = () => {
    if (!name) return setError(t.errors.NAME_REQUIRED);
    createRoom(name, { ...settings, password: '' });
    // We'll auto-start in useEffect when room is ready and it's single player intent
    setSinglePlayerIntent(true);
  };

  const [singlePlayerIntent, setSinglePlayerIntent] = useState(false);

  useEffect(() => {
    if (singlePlayerIntent && room && room.phase === 'Lobby') {
      const isHost = room.players.find(p => p.id === socket?.id)?.isHost;
      if (isHost) {
        startGame();
        setSinglePlayerIntent(false);
      }
    }
  }, [room, singlePlayerIntent, startGame, socket?.id]);

  const handleJoin = (id: string) => {
    if (!name) return setError(t.errors.NAME_REQUIRED);
    const targetRoom = roomList.find(r => r.id === id);
    if (targetRoom?.hasPassword && !joinPassword) {
      setSelectedRoomId(id);
      return;
    }
    joinRoom(id, name, joinPassword);
    setView('Lobby');
    setJoinPassword('');
    setSelectedRoomId(null);
  };

  const [globalScore, setGlobalScore] = useState(() => {
    const saved = localStorage.getItem('blackworld_score');
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem('blackworld_score', globalScore.toString());
  }, [globalScore]);

  const player = room?.players.find(p => p.id === socket?.id);
  const [lastGamePhase, setLastGamePhase] = useState<string | null>(null);

  useEffect(() => {
    if (room?.phase === 'GameOver' && lastGamePhase === 'Playing') {
      const me = room.players.find(p => p.id === socket?.id);
      if (me) {
        setGlobalScore(prev => prev + me.score);
      }
    }
    setLastGamePhase(room?.phase || null);
  }, [room?.phase, socket?.id]);

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

  if (room && room.phase === 'GameOver') {
    const me = room.players.find(p => p.id === socket?.id);
    const oldRank = getClassification(globalScore - (me?.score || 0));
    const newRank = getClassification(globalScore);
    const rankChanged = oldRank !== newRank;

    return (
      <div className="h-screen w-screen bg-black flex flex-col items-start justify-center p-8 space-y-8 pl-20">
        <h1 className="text-6xl font-mono font-bold uppercase tracking-tighter text-white">{t.gameOver}</h1>
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg max-w-md w-full space-y-4">
          {me && !me.isAlive && (
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500 uppercase text-xs">{t.killer}</span>
              <span className="font-mono text-red-500">
                {me.stats.killedByHunter > 0 ? 'Hunter' : 
                 me.stats.killedByScreamer > 0 ? 'Screamer' : 
                 me.stats.killedByPatroller > 0 ? 'Patroller' : 
                 me.stats.killedByMimic > 0 ? 'Mimic' : 'Unknown'}
              </span>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500 uppercase text-xs">{t.yourScore}</span>
            <span className="font-mono text-white">{me?.score.toFixed(1)} PTS</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500 uppercase text-xs">{t.classifier}</span>
            <div className="text-right">
              <div className="font-mono text-yellow-500">{newRank}</div>
              {rankChanged && <div className="text-[10px] text-green-500 animate-pulse">{t.rankChanged}</div>}
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-white text-black font-bold py-3 rounded uppercase tracking-widest">{t.toMenu}</button>
        </div>
      </div>
    );
  }

  if (room && room.phase === 'Playing') {
    return (
      <div className={`flex h-screen w-screen bg-black overflow-hidden ${settings.fullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg max-w-sm w-full space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-2xl font-mono font-bold uppercase text-white">{lang === 'RU' ? 'ВЫХОД' : 'EXIT'}</h3>
                <p className="text-zinc-400 text-sm">{t.exitWarning}</p>
                <p className="text-red-500 text-[10px] uppercase font-bold tracking-widest">-5 PTS {lang === 'RU' ? 'ШТРАФ' : 'PENALTY'}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setGlobalScore(prev => Math.max(0, prev - 5));
                    window.location.reload();
                  }} 
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded uppercase text-xs tracking-widest hover:bg-red-700 transition-colors"
                >
                  {lang === 'RU' ? 'ДА, ВЫЙТИ' : 'YES, EXIT'}
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)} 
                  className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded uppercase text-xs tracking-widest hover:bg-zinc-700 transition-colors"
                >
                  {lang === 'RU' ? 'ОТМЕНА' : 'CANCEL'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20 pointer-events-none">
          <div className="px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded text-sm font-mono uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            {getStatus()}
          </div>
          {player?.hasKey && (
            <div className="px-3 py-1 bg-yellow-900/50 border border-yellow-700 rounded text-xs font-mono uppercase text-yellow-500 animate-pulse">
              {t.keyAcquired}
            </div>
          )}
        </div>
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            {/* Empty for balance or add other info */}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{getClassification(globalScore + (player?.score || 0))}</div>
              <div className="text-sm font-mono text-white">{(globalScore + (player?.score || 0)).toFixed(1)} PTS</div>
            </div>
            <button 
              onClick={() => setShowExitConfirm(true)} 
              className="p-2 text-zinc-500 hover:text-white transition-colors pointer-events-auto"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 relative">
          <GameCanvas room={room} playerId={socket?.id || ''} onMove={move} onStomp={stomp} accessibility={settings.accessibility} controls={settings.controls} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen w-screen bg-[#050505] text-[#e5e5e5] flex flex-col items-center justify-center p-8 font-sans bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url("/bg.png")' }}
    >
      {view === 'Menu' && (
        <div className="fixed top-8 right-8 z-50 text-right">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.classifier}</div>
          <div className="text-xl font-mono text-yellow-500">{getClassification(globalScore)}</div>
          <div className="text-xs text-zinc-600">{globalScore.toFixed(1)} PTS</div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg max-w-sm w-full space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-mono font-bold uppercase text-white">{lang === 'RU' ? 'ВЫХОД' : 'EXIT'}</h3>
              <p className="text-zinc-400 text-sm">{t.exitWarning}</p>
              <p className="text-red-500 text-[10px] uppercase font-bold tracking-widest">-5 PTS {lang === 'RU' ? 'ШТРАФ' : 'PENALTY'}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setGlobalScore(prev => Math.max(0, prev - 5));
                  window.location.reload();
                }} 
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded uppercase text-xs tracking-widest hover:bg-red-700 transition-colors"
              >
                {lang === 'RU' ? 'ДА, ВЫЙТИ' : 'YES, EXIT'}
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)} 
                className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded uppercase text-xs tracking-widest hover:bg-zinc-700 transition-colors"
              >
                {lang === 'RU' ? 'ОТМЕНА' : 'CANCEL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-900/90 border border-red-700 text-white px-6 py-2 rounded shadow-2xl font-mono text-xs uppercase tracking-widest animate-bounce">
          {error}
        </div>
      )}

      {view === 'Menu' && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-md w-full space-y-8 text-left z-10">
          <div className="space-y-2">
            <h1 className="text-7xl font-mono font-bold tracking-tighter uppercase flicker text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{t.title}</h1>
            <p className="text-zinc-400 text-sm tracking-widest uppercase font-bold">{dynamicSubtitle}</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder={t.enterName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-4 py-3 text-left focus:outline-none focus:border-zinc-600 transition-colors"
            />
            
            <button
              onClick={handleCreate}
              className="w-full bg-white text-black font-bold py-3 rounded hover:bg-zinc-200 transition-colors flex items-center justify-start px-6 gap-4"
            >
              <Users size={18} /> {t.createRoom}
            </button>

            <button
              onClick={handleSinglePlayer}
              className="w-full bg-zinc-800 text-white font-bold py-3 rounded hover:bg-zinc-700 transition-colors flex items-center justify-start px-6 gap-4 border border-zinc-700"
            >
              <Play size={18} /> {t.singlePlayer}
            </button>

            <button
              onClick={() => setView('Addons')}
              className="w-full bg-zinc-900 text-zinc-400 font-bold py-3 rounded hover:bg-zinc-800 transition-colors flex items-center justify-start px-6 gap-4 border border-zinc-800"
            >
              <Shield size={18} /> {t.addons}
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
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-white">{r.id}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">{r.host}'s Game</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Users size={12} />
                        <span className="text-xs font-mono">{r.playerCount}/10</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8">
            <button onClick={() => setView('Help')} className="flex flex-col items-start gap-2 text-zinc-500 hover:text-white transition-colors">
              <BookOpen size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.help}</span>
            </button>
            <button onClick={() => setView('Achievements')} className="flex flex-col items-start gap-2 text-zinc-500 hover:text-white transition-colors">
              <Trophy size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.trophies}</span>
            </button>
            <button onClick={() => setView('Settings')} className="flex flex-col items-start gap-2 text-zinc-500 hover:text-white transition-colors">
              <Settings size={20} /> <span className="text-[10px] uppercase tracking-widest">{t.settings}</span>
            </button>
          </div>
        </div>
      )}

      {view === 'Addons' && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.addons}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          <div className="space-y-4">
            <button className="w-full p-6 bg-black border border-zinc-800 rounded hover:border-zinc-600 transition-all text-left group">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.mods}</div>
              <div className="text-lg font-mono text-white group-hover:text-yellow-500 transition-colors">INTERNAL_MOD_LOADER</div>
              <div className="text-[10px] text-zinc-600 mt-2 uppercase">0 {lang === 'RU' ? 'АКТИВНО' : 'ACTIVE'}</div>
            </button>
            <button className="w-full p-6 bg-black border border-zinc-800 rounded hover:border-zinc-600 transition-all text-left group">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{t.officialAddons}</div>
              <div className="text-lg font-mono text-white group-hover:text-blue-500 transition-colors">OFFICIAL_EXPANSION_PACK</div>
              <div className="text-[10px] text-zinc-600 mt-2 uppercase">{lang === 'RU' ? 'СКОРО' : 'COMING SOON'}</div>
            </button>
          </div>
        </div>
      )}

      {selectedRoomId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-lg max-w-sm w-full space-y-4">
            <h3 className="text-xl font-mono font-bold uppercase">{t.enterPasswordJoin}</h3>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-4 py-2 focus:outline-none focus:border-zinc-600"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => handleJoin(selectedRoomId)} className="flex-1 bg-white text-black font-bold py-2 rounded">{t.login}</button>
              <button onClick={() => setSelectedRoomId(null)} className="flex-1 bg-zinc-800 text-white font-bold py-2 rounded">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'Settings' && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.settings}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-hide">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.difficulty}</label>
                <select 
                  value={settings.difficulty} 
                  onChange={(e) => setSettings({...settings, difficulty: e.target.value as any})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm"
                >
                  {Object.entries(t.difficulties).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.mapSize}</label>
                <select 
                  value={settings.mapSize} 
                  onChange={(e) => setSettings({...settings, mapSize: parseInt(e.target.value)})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm"
                >
                  {Object.entries(t.mapSizes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.branching}</label>
                <select 
                  value={settings.branchDensity} 
                  onChange={(e) => setSettings({...settings, branchDensity: e.target.value as any})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm"
                >
                  {Object.entries(t.branchingLevels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.screen}</label>
                <button 
                  onClick={() => setSettings({...settings, fullscreen: !settings.fullscreen})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-left"
                >
                  {settings.fullscreen ? t.screenModes.fullscreen : t.screenModes.windowed}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.language}</label>
                <button 
                  onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-left uppercase font-bold"
                >
                  {lang === 'RU' ? 'Русский' : 'English'}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.accessibility}</label>
                <button 
                  onClick={() => setSettings({...settings, accessibility: !settings.accessibility})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-left"
                >
                  {settings.accessibility ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.seed}</label>
                <input 
                  type="text" 
                  value={settings.seed} 
                  onChange={(e) => setSettings({...settings, seed: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.password}</label>
                <input 
                  type="password" 
                  value={settings.password} 
                  onChange={(e) => setSettings({...settings, password: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm"
                  placeholder={t.enterPasswordPlaceholder}
                />
              </div>
              <div className="col-span-2 space-y-4 border-t border-zinc-800 pt-4">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t.settingsLabels.controls}</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(settings.controls).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center bg-black p-2 rounded border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-600">{key}</span>
                      <input 
                        type="text" 
                        value={val} 
                        readOnly
                        onKeyDown={(e) => {
                          e.preventDefault();
                          setSettings({
                            ...settings, 
                            controls: { ...settings.controls, [key]: e.code }
                          });
                        }}
                        className="w-24 bg-zinc-900 border border-zinc-800 text-center text-[10px] py-1 rounded focus:border-white outline-none cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-800 flex justify-between text-[10px] font-mono text-zinc-600 uppercase">
            <span>{t.version}</span>
            <span>{t.serverStatus}</span>
          </div>
        </div>
      )}

      {view === 'Lobby' && room && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-4xl w-full h-[80vh] flex flex-col gap-8 z-10">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-mono font-bold uppercase flex items-center gap-2">
                  Room: {room.id}
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(room.id);
                    }}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"
                    title="Copy ID"
                  >
                    <Shield size={14} />
                  </button>
                </h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{t.waiting}</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-xs uppercase font-bold">
              <LogOut size={20} /> {lang === 'RU' ? 'Выйти' : 'Leave'}
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
                      <span className="font-mono">{p.name} {p.isHost && <span className="text-[10px] text-zinc-500 ml-2">{t.hostLabel}</span>}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {room.players.find(me => me.id === socket?.id)?.isHost && !p.isHost && (
                        <button
                          onClick={() => kickPlayer(p.id)}
                          className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                          title="Kick"
                        >
                          <LogOut size={14} />
                        </button>
                      )}
                      {p.id === socket?.id && (
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
                  </div>
                ))}
              </div>
              
              {room.players.find(p => p.id === socket?.id)?.isHost && (
                <div className="flex gap-2">
                  <button 
                    onClick={addBot}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Users size={18} />
                    {t.addBot}
                  </button>
                  <button
                    onClick={startGame}
                    disabled={!room.players.every(p => p.isReady || p.isHost)}
                    className="flex-[2] bg-white text-black font-bold py-4 rounded hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                  >
                    {t.startGame}
                  </button>
                </div>
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
                  onKeyDown={(e) => e.key === 'Enter' && chatInput.trim() && (sendMessage(chatInput), setChatInput(''))}
                  placeholder={t.typeMessage}
                  className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-600"
                />
                <button 
                  onClick={() => chatInput.trim() && (sendMessage(chatInput), setChatInput(''))}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded transition-colors"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'Help' && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 z-30 relative min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.guide}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 p-8 bg-black/30 rounded border border-zinc-800/50">
            <h3 className="text-xl font-mono font-bold text-white uppercase tracking-widest underline decoration-zinc-700 underline-offset-8">
              {helpContent[helpPage].title}
            </h3>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              {helpContent[helpPage].text}
            </p>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button 
              disabled={helpPage === 0}
              onClick={() => setHelpPage(p => p - 1)}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-20 text-xs uppercase font-bold"
            >
              {t.back}
            </button>
            <span className="text-[10px] font-mono text-zinc-600 uppercase">{t.page} {helpPage + 1} / {helpContent.length}</span>
            <button 
              disabled={helpPage === helpContent.length - 1}
              onClick={() => setHelpPage(p => p + 1)}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-20 text-xs uppercase font-bold"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {view === 'Achievements' && (
        <div className="fixed top-1/2 -translate-y-1/2 left-12 max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6 z-30">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-mono font-bold uppercase">{t.trophies}</h2>
            <button onClick={() => setView('Menu')} className="text-zinc-500 hover:text-white">{t.close}</button>
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
            {t.achievements.map((a: any, i: number) => {
              const currentVal = a.stat === 'joke' ? (jokeUnlocked ? 1 : 0) : (player?.stats[a.stat as keyof typeof player.stats] || 0);
              const isUnlocked = typeof currentVal === 'number' && currentVal >= a.target;
              return (
                <div key={i} className={`p-3 border rounded transition-all flex flex-col justify-between ${isUnlocked ? 'border-yellow-600/50 bg-yellow-900/5' : 'border-zinc-800/50 bg-black/20 opacity-40'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className={`text-[10px] font-bold truncate ${isUnlocked ? 'text-yellow-500' : 'text-zinc-400'}`}>{a.title}</div>
                      <div className="text-[8px] text-zinc-600 leading-tight mt-1">{a.desc}</div>
                    </div>
                    {isUnlocked && <Trophy size={12} className="text-yellow-500 shrink-0" />}
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[8px] font-mono text-zinc-700 mb-1">
                      <span>{isUnlocked ? 'COMPLETED' : 'PROGRESS'}</span>
                      <span>{Math.min(100, Math.floor((Number(currentVal) / a.target) * 100))}%</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isUnlocked ? 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'bg-zinc-700'}`}
                        style={{ width: `${Math.min(100, (Number(currentVal) / a.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
