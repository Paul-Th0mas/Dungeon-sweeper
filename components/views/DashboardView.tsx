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
  BERSERKER: 'text-[#ffb4ab]',
  PALADIN: 'text-[#c0c1ff]',
  WIZARD: 'text-[#c0c1ff]',
  OVERSEER: 'text-[#5adf82]',
};

interface MenuButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  colorClass: string;
  textClass: string;
  bevelClass: string;
}

function MenuButton({ onClick, icon, label, colorClass, textClass, bevelClass }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative w-full py-2.5 px-4 md:py-3.5 md:px-6 border-4 border-black font-space-mono font-bold text-xs md:text-base uppercase tracking-wider",
        "transition-all duration-100 flex items-center justify-center gap-2.5 md:gap-3 select-none",
        "active:translate-y-1 active:translate-x-1 active:shadow-none shadow-[4px_4px_0px_0px_#0d0d15]",
        colorClass,
        textClass,
        bevelClass
      )}
    >
      {/* Glossy top-half sheen */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      {icon}
      <span>{label}</span>
    </button>
  );
}

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
    <div className="crt-screen-container w-full h-screen flex flex-col items-center justify-start bg-[#0d0d15] p-4 md:p-6 relative pt-[12vh] sm:pt-[18vh] md:pt-[24vh] lg:pt-[26vh] overflow-y-auto scrollbar-none">
      {/* Scanline Overlay */}
      <div className="crt-scanlines pointer-events-none" />

      {/* Styled CRT backdrop */}
      <div 
        className="absolute inset-0 bg-cover bg-center mix-blend-normal opacity-85 z-0" 
        style={{ backgroundImage: `url('/dungeon_menu_bg.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d15] via-transparent to-transparent opacity-90 z-0" />

      {/* Main Container */}
      <div className="z-10 flex flex-col items-center justify-center max-w-2xl w-full pb-8">
        {/* Title Block */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-12 select-none"
        >
          {/* Logo - DUNGEON */}
          <h1 className="font-anybody text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter text-[#e4e1ed] retro-shadow-dark uppercase leading-none">
            DUNGEON
          </h1>
          
          {/* Logo - SWEEPER with Speed lines */}
          <div className="flex items-center justify-center gap-2 mt-1 md:mt-2">
            <div className="flex flex-col gap-1 items-end">
              <div className="h-1 w-8 md:h-1.5 md:w-12 bg-[#db031a] transform -skew-x-12 border border-black" />
              <div className="h-1 w-12 md:h-1.5 md:w-20 bg-[#db031a] transform -skew-x-12 border border-black" />
              <div className="h-1 w-6 md:h-1.5 md:w-8 bg-[#db031a] transform -skew-x-12 border border-black" />
            </div>
            <span className="font-anybody text-6xl sm:text-7xl md:text-9xl font-black italic tracking-tighter text-[#db031a] retro-shadow-dark uppercase leading-none">
              SWEEPER
            </span>
          </div>
          
          <p className="font-space-mono text-[#e4e1ed] tracking-[0.2em] md:tracking-[0.25em] mt-4 md:mt-6 text-[10px] md:text-sm uppercase font-bold">
            Procedural Rogue-like Deckbuilder
          </p>
        </motion.div>

        {/* Buttons Menu / History Block */}
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {!showHistory ? (
              <motion.div
                key="main-menu"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="flex flex-col gap-3 md:gap-4"
              >
                {lastSessionId && (
                  <MenuButton
                    onClick={handleContinue}
                    icon={<Play className="w-4 h-4 md:w-5 md:h-5 fill-current stroke-[3]" />}
                    label="CONTINUE JOURNEY"
                    colorClass="bg-white"
                    textClass="text-[#0d0d15]"
                    bevelClass="pixel-bevel-out-white"
                  />
                )}

                <MenuButton
                  onClick={handleNewGame}
                  icon={<Sword className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />}
                  label="NEW EXPEDITION"
                  colorClass="bg-[#db031a]"
                  textClass="text-white"
                  bevelClass="pixel-bevel-out"
                />

                <MenuButton
                  onClick={() => setShowHistory(true)}
                  icon={<History className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />}
                  label="MISSION ARCHIVES"
                  colorClass="bg-[#34343d]"
                  textClass="text-[#e4e1ed]"
                  bevelClass="pixel-bevel-out"
                />
              </motion.div>
            ) : (
              <motion.div
                key="history-menu"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex flex-col gap-4 p-4 md:p-6 border-4 border-black bg-[#1b1b23] shadow-[4px_4px_0px_0px_#0d0d15] pixel-bevel-in text-left"
              >
                <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-2">
                  <h2 className="text-[#e4e1ed] font-space-mono font-bold uppercase tracking-wider text-xs md:text-sm">
                    Recent Missions
                  </h2>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="text-[#908f9d] hover:text-white font-space-mono text-xs font-bold uppercase"
                  >
                    [BACK]
                  </button>
                </div>

                <div className="max-h-[220px] md:max-h-[260px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                  {recentSessions.length === 0 ? (
                    <p className="text-[#908f9d] text-center py-8 italic uppercase text-xs font-space-mono">
                      No archives found
                    </p>
                  ) : (
                    recentSessions.map((s) => {
                      const Icon = CLASS_ICONS[s.playerClass] || Sword;
                      return (
                        <button
                          key={s.id}
                          onClick={() => resumeSession(s.id)}
                          className="w-full p-3 md:p-4 bg-[#13131b] border-4 border-black hover:bg-[#1f1f27] transition-colors flex items-center gap-3 md:gap-4 text-left group active:translate-y-0.5 active:translate-x-0.5"
                          style={{ boxShadow: '2px 2px 0px 0px #0d0d15' }}
                        >
                          <div className={clsx("p-2 bg-[#1b1b23] border-2 border-black", CLASS_COLORS[s.playerClass])}>
                            <Icon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                          </div>
                          <div className="flex-1 font-space-mono">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#e4e1ed] text-xs uppercase tracking-wider">
                                {s.playerClass}
                              </span>
                              <span className="text-[#908f9d] text-[10px]">
                                {new Date(s.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-4 mt-1">
                              <span className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-tight">
                                LVL {s.level}
                              </span>
                              <span className="text-[10px] font-bold text-[#5adf82] uppercase tracking-tight">
                                FLOOR {s.floor}
                              </span>
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
    </div>
  );
}
