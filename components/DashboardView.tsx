'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, History, Sword, Shield, Sparkles, Eye } from 'lucide-react';
import { clsx } from 'clsx';

const CLASS_ICONS: Record<string, any> = {
  BERSERKER: Sword,
  PALADIN: Shield,
  WIZARD: Sparkles,
  OVERSEER: Eye,
};

const CLASS_COLORS: Record<string, string> = {
  BERSERKER: 'text-red-500',
  PALADIN: 'text-sky-400',
  WIZARD: 'text-purple-400',
  OVERSEER: 'text-emerald-400',
};

export default function DashboardView() {
  const { setPhase, resumeSession, getRecentSessions } = useGameStore();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('dungeon_sweeper_session_id');
      setLastSessionId(id);
    }

    getRecentSessions().then(setRecentSessions);
  }, [getRecentSessions]);

  const handleContinue = () => {
    if (lastSessionId) {
      resumeSession(lastSessionId);
    }
  };

  const handleNewGame = () => {
    setPhase('START_SCREEN');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-zinc-950 p-6">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 text-center mb-12"
      >
        <h1 className="text-8xl font-black uppercase tracking-tighter text-zinc-100 drop-shadow-2xl">
          DUNGEON<br />
          <span className="text-red-500 text-9xl">SWEEPER</span>
        </h1>
        <p className="text-zinc-500 font-medium tracking-[0.3em] mt-6 text-sm uppercase">
          Procedural Rogue-like Deckbuilder
        </p>
      </motion.div>

      <div className="z-10 flex flex-col gap-4 w-full max-w-md">
        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="main-menu"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {lastSessionId && (
                <MenuButton
                  onClick={handleContinue}
                  icon={<Play className="w-5 h-5 fill-current" />}
                  label="CONTINUE JOURNEY"
                  color="bg-zinc-100 text-zinc-950 hover:bg-white"
                />
              )}

              <MenuButton
                onClick={handleNewGame}
                icon={<Sword className="w-5 h-5" />}
                label="NEW EXPEDITION"
                color="bg-red-600 text-white hover:bg-red-500"
              />

              <MenuButton
                onClick={() => setShowHistory(true)}
                icon={<History className="w-5 h-5" />}
                label="MISSION ARCHIVES"
                color="bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800 hover:text-zinc-200"
              />
            </motion.div>
          ) : (
            <motion.div
              key="history-menu"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-zinc-100 font-bold uppercase tracking-widest text-sm">Recent Missions</h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-zinc-500 hover:text-white uppercase text-xs font-bold"
                >
                  [BACK]
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2 text-zinc-100">
                {recentSessions.length === 0 ? (
                  <p className="text-zinc-600 text-center py-8 italic uppercase text-sm">No archives found</p>
                ) : (
                  recentSessions.map((s) => {
                    const Icon = CLASS_ICONS[s.playerClass] || Sword;
                    return (
                      <button
                        key={s.id}
                        onClick={() => resumeSession(s.id)}
                        className="w-full p-4 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-zinc-900 hover:border-white/10 transition-all flex items-center gap-4 text-left group"
                      >
                        <div className={clsx("p-2.5 rounded-xl bg-zinc-800 border border-white/5", CLASS_COLORS[s.playerClass])}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-200 text-xs uppercase tracking-wider">{s.playerClass}</span>
                            <span className="text-zinc-500 text-[10px]">{new Date(s.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-4 mt-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">LVL {s.level}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">FLOOR {s.floor}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuButton({ onClick, icon, label, color }: { onClick: () => void, icon: any, label: string, color: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        "relative w-full p-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
        color
      )}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}
