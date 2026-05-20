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
import StartScreenView from '@/components/StartScreenView';
import FloorEndModal from '@/components/FloorEndModal';
import TreasureRoomView from '@/components/TreasureRoomView';
import DashboardView from '@/components/DashboardView';

export default function Home() {
  const { gamePhase } = useGameStore();


  return (
    <main className="w-full h-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {gamePhase === 'DASHBOARD'    && <DashboardView />}
      {gamePhase === 'START_SCREEN' && <StartScreenView />}
      {gamePhase === 'EXPLORING' && <ExplorationView />}
      {gamePhase === 'COMBAT'    && <CombatView />}
      {gamePhase === 'GAMEOVER'  && <GameOverView />}
      {gamePhase === 'WIN'       && <WinView />}
      {gamePhase === 'SHOP'      && <ShopView />}
      {gamePhase === 'REST'      && <RestRoomView />}
      {gamePhase === 'EVENT'     && <EventView />}
      {gamePhase === 'TREASURE'  && <TreasureRoomView />}
      {gamePhase === 'LEVELUP'   && <LevelUpModal />}
      {gamePhase === 'FLOOR_END' && (
        <>
          <ExplorationView />
          <FloorEndModal />
        </>
      )}
    </main>
  );
}
