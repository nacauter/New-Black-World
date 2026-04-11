
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, ChatMessage } from '../types';

export function useGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomList, setRoomList] = useState<{ id: string, host: string }[]>([]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('roomList', (list) => setRoomList(list));
    newSocket.on('roomCreated', (room) => setRoom(room));
    newSocket.on('roomUpdated', (room) => setRoom(room));
    newSocket.on('gameStarted', (room) => setRoom(room));
    newSocket.on('gameOver', (room) => setRoom(room));
    newSocket.on('message', (msg) => setMessages(prev => [...prev, msg]));
    newSocket.on('error', (err) => {});
    newSocket.on('exitOpened', () => setRoom(prev => prev ? { ...prev, exitDoorOpen: true } : null));
    
    newSocket.on('gameStateUpdate', ({ monsters, players }: { monsters: any[], players: Player[] }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, monsters, players };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = useCallback((name: string, settings: any) => {
    socket?.emit('createRoom', { name, settings });
  }, [socket]);

  const joinRoom = useCallback((roomId: string, name: string, password?: string) => {
    socket?.emit('joinRoom', { roomId, name, password });
  }, [socket]);

  const setReady = useCallback((ready: boolean) => {
    socket?.emit('setReady', ready);
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('startGame');
  }, [socket]);

  const sendMessage = useCallback((text: string) => {
    socket?.emit('sendMessage', text);
  }, [socket]);

  const move = useCallback((input: { x: number, y: number }) => {
    socket?.emit('move', input);
  }, [socket]);

  const stomp = useCallback(() => {
    socket?.emit('stomp');
  }, [socket]);

  const kickPlayer = useCallback((targetId: string) => {
    socket?.emit('kickPlayer', targetId);
  }, [socket]);

  const addBot = useCallback(() => {
    socket?.emit('addBot');
  }, [socket]);

  return {
    socket,
    room,
    messages,
    roomList,
    createRoom,
    joinRoom,
    setReady,
    startGame,
    sendMessage,
    move,
    stomp,
    kickPlayer,
    addBot
  };
}
