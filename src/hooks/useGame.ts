
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
    newSocket.on('message', (msg) => setMessages(prev => [...prev, msg]));
    newSocket.on('exitOpened', () => setRoom(prev => prev ? { ...prev, exitDoorOpen: true } : null));
    
    newSocket.on('gameStateUpdate', ({ monsters, players }) => {
      setRoom(prev => {
        if (!prev) return null;
        return { ...prev, monsters, players };
      });
    });

    newSocket.on('playerMoved', ({ id, x, y }) => {
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map(p => p.id === id ? { ...p, x, y } : p)
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = useCallback((name: string, settings: any) => {
    socket?.emit('createRoom', { name, settings });
  }, [socket]);

  const joinRoom = useCallback((roomId: string, name: string) => {
    socket?.emit('joinRoom', { roomId, name });
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
    stomp
  };
}
