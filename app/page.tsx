'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import ExplorationView from '@/components/views/ExplorationView';
import CombatView from '@/components/views/CombatView';
import GameOverView from '@/components/views/GameOverView';
import WinView from '@/components/views/WinView';
import ShopView from '@/components/views/ShopView';
import RestRoomView from '@/components/views/RestRoomView';
import EventView from '@/components/views/EventView';
import LevelUpModal from '@/components/modals/LevelUpModal';
import StartScreenView from '@/components/views/StartScreenView';
import FloorEndModal from '@/components/modals/FloorEndModal';
import TreasureRoomView from '@/components/views/TreasureRoomView';
import DashboardView from '@/components/views/DashboardView';

export default function Home() {
  const { gamePhase } = useGameStore();


  return (
    <main className="w-full h-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {gamePhase === 'DASHBOARD'    && <DashboardView />}
      {gamePhase === 'START_SCREEN' && <StartScreenView />}
      {gamePhase === 'EXPLORING' && <ExplorationView />}
      {(gamePhase === 'COMBAT' || gamePhase === 'SPELL_REWARD') && <CombatView />}
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
