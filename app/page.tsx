'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import ExplorationView from '@/components/ExplorationView';
import CombatView from '@/components/CombatView';
import GameOverView from '@/components/GameOverView';
import WinView from '@/components/WinView';
import ShopView from '@/components/ShopView';
import RestRoomView from '@/components/RestRoomView';
import EventView from '@/components/EventView';
import LevelUpModal from '@/components/LevelUpModal';

export default function Home() {
  const { gamePhase, initializeGame } = useGameStore();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <main className="w-full h-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {gamePhase === 'EXPLORING' && <ExplorationView />}
      {gamePhase === 'COMBAT'    && <CombatView />}
      {gamePhase === 'GAMEOVER'  && <GameOverView />}
      {gamePhase === 'WIN'       && <WinView />}
      {gamePhase === 'SHOP'      && <ShopView />}
      {gamePhase === 'REST'      && <RestRoomView />}
      {gamePhase === 'EVENT'     && <EventView />}
      {gamePhase === 'LEVELUP'   && <LevelUpModal />}
    </main>
  );
}
