'use client';

import { useGameStore } from '@/store/useGameStore';
import { PlayerClass } from '@/lib/types';
import { motion } from 'framer-motion';

// Custom 16-Bit Pixel-Art SVG Icons

const SwordIcon = ({ color }: { color: string }) => (
  <svg className="w-12 h-12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blade */}
    <rect x="11" y="3" width="2" height="2" fill={color} />
    <rect x="10" y="4" width="2" height="2" fill={color} />
    <rect x="9" y="5" width="2" height="2" fill={color} />
    <rect x="8" y="6" width="2" height="2" fill={color} />
    <rect x="7" y="7" width="2" height="2" fill={color} />
    <rect x="6" y="8" width="2" height="2" fill={color} />
    <rect x="5" y="9" width="2" height="2" fill={color} />
    <rect x="12" y="2" width="2" height="2" fill={color} />
    <rect x="13" y="1" width="1" height="1" fill={color} />
    {/* Crossguard */}
    <rect x="3" y="10" width="4" height="2" fill={color} />
    <rect x="4" y="9" width="2" height="4" fill={color} />
    {/* Handle */}
    <rect x="2" y="12" width="2" height="2" fill={color} />
    <rect x="1" y="13" width="2" height="2" fill={color} />
  </svg>
);

const ShieldIcon = ({ color }: { color: string }) => (
  <svg className="w-12 h-12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer rim */}
    <rect x="3" y="2" width="10" height="2" fill={color} />
    <rect x="2" y="4" width="2" height="6" fill={color} />
    <rect x="12" y="4" width="2" height="6" fill={color} />
    <rect x="3" y="10" width="2" height="2" fill={color} />
    <rect x="11" y="10" width="2" height="2" fill={color} />
    <rect x="4" y="12" width="2" height="2" fill={color} />
    <rect x="10" y="12" width="2" height="2" fill={color} />
    <rect x="6" y="13" width="4" height="2" fill={color} />
    {/* Inner detail */}
    <rect x="5" y="5" width="6" height="4" fill={color} opacity="0.6" />
    <rect x="7" y="9" width="2" height="3" fill={color} opacity="0.6" />
  </svg>
);

const WandIcon = ({ color }: { color: string }) => (
  <svg className="w-12 h-12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shaft */}
    <rect x="2" y="12" width="2" height="2" fill={color} />
    <rect x="4" y="10" width="2" height="2" fill={color} />
    <rect x="6" y="8" width="2" height="2" fill={color} />
    <rect x="8" y="6" width="2" height="2" fill={color} />
    <rect x="10" y="4" width="2" height="2" fill={color} />
    {/* Star Tip */}
    <rect x="12" y="1" width="2" height="2" fill={color} />
    <rect x="11" y="2" width="4" height="1" fill={color} />
    <rect x="12" y="0" width="2" height="4" fill={color} />
    {/* Sparkles */}
    <rect x="8" y="1" width="1" height="1" fill={color} />
    <rect x="14" y="5" width="1" height="1" fill={color} />
    <rect x="7" y="5" width="1" height="1" fill={color} />
  </svg>
);

const EyeIcon = ({ color }: { color: string }) => (
  <svg className="w-12 h-12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Eye shape */}
    <rect x="2" y="7" width="12" height="2" fill={color} />
    <rect x="4" y="5" width="8" height="2" fill={color} />
    <rect x="4" y="9" width="8" height="2" fill={color} />
    <rect x="6" y="4" width="4" height="1" fill={color} />
    <rect x="6" y="11" width="4" height="1" fill={color} />
    {/* Pupil */}
    <rect x="7" y="7" width="2" height="2" fill="#0d0d15" />
  </svg>
);

// Pixel-Art Torch for background immersion
const PixelTorch = () => (
  <div className="relative flex flex-col items-center select-none pointer-events-none z-0">
    {/* Torch Flicker flame */}
    <svg className="w-8 h-12 animate-torch-flicker" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="1" width="2" height="2" fill="#ffb4ab" />
      <rect x="2" y="3" width="4" height="2" fill="#ea580c" />
      <rect x="1" y="5" width="6" height="3" fill="#db031a" />
      <rect x="3" y="3" width="2" height="2" fill="#eab308" />
      <rect x="2" y="5" width="4" height="2" fill="#eab308" />
      <rect x="3" y="5" width="2" height="2" fill="#ffffff" />
      <rect x="3" y="6" width="1" height="1" fill="#ffffff" />
    </svg>
    {/* Torch Wall Mount Bracket */}
    <svg className="w-4 h-8 mt-1" viewBox="0 0 4 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="0" width="2" height="2" fill="#464652" />
      <rect x="0" y="2" width="4" height="1" fill="#292932" />
      <rect x="1" y="3" width="2" height="4" fill="#1b1b23" />
    </svg>
  </div>
);

interface ClassDetails {
  id: PlayerClass;
  name: string;
  color: string;
  themeColor: string; // Tailwind class equivalent
  focus: React.ReactNode;
  desc: React.ReactNode;
  icon: React.ElementType;
}

const CLASSES: ClassDetails[] = [
  {
    id: 'BERSERKER',
    name: 'BERSERKER',
    color: '#db031a', // Secondary / Power Red
    themeColor: 'hover:ring-[#db031a] hover:shadow-[0_0_15px_rgba(219,3,26,0.35)]',
    focus: (
      <span>
        DECK FOCUS: <span className="text-[#db031a] font-bold">FIRE</span> & <span className="text-[#c0c1ff] font-bold">AIR</span>
      </span>
    ),
    desc: (
      <span>
        Aggressive melee fighter. Gains bonus damage on <span className="text-[#db031a] font-bold">FIRE</span> spells and heals on kills.
      </span>
    ),
    icon: SwordIcon,
  },
  {
    id: 'PALADIN',
    name: 'PALADIN',
    color: '#38bdf8', // Sonic Blue / Sky Blue
    themeColor: 'hover:ring-[#38bdf8] hover:shadow-[0_0_15px_rgba(56,189,248,0.35)]',
    focus: (
      <span>
        DECK FOCUS: <span className="text-[#38bdf8] font-bold">WATER</span> & <span className="text-[#db031a] font-bold">FIRE</span>
      </span>
    ),
    desc: (
      <span>
        Holy defender. <span className="text-[#38bdf8] font-bold">WATER</span> spells heal you. <span className="text-[#38bdf8] font-bold">Freeze</span> lasts longer.
      </span>
    ),
    icon: ShieldIcon,
  },
  {
    id: 'WIZARD',
    name: 'WIZARD',
    color: '#c084fc', // Purple
    themeColor: 'hover:ring-[#c084fc] hover:shadow-[0_0_15px_rgba(192,132,252,0.35)]',
    focus: (
      <span>
        DECK FOCUS: <span className="text-[#c084fc] font-bold">AIR</span> & <span className="text-[#db031a] font-bold">FIRE</span>
      </span>
    ),
    desc: (
      <span>
        Master of elements. <span className="text-[#c084fc] font-bold">AIR</span> chains exponentially faster.
      </span>
    ),
    icon: WandIcon,
  },
  {
    id: 'OVERSEER',
    name: 'OVERSEER',
    color: '#5adf82', // Chaos Emerald Green / Tertiary
    themeColor: 'hover:ring-[#5adf82] hover:shadow-[0_0_15px_rgba(90,223,130,0.35)]',
    focus: (
      <span>
        DECK FOCUS: <span className="text-[#5adf82] font-bold">EARTH</span> & <span className="text-[#38bdf8] font-bold">WATER</span>
      </span>
    ),
    desc: (
      <span>
        Tactical rogue. <span className="text-[#5adf82] font-bold">EARTH</span> spells draw more cards and generate gold.
      </span>
    ),
    icon: EyeIcon,
  },
];

export default function StartScreenView() {
  const { initializeGame, setPhase } = useGameStore();

  return (
    <div className="crt-screen-container relative w-full h-screen overflow-y-auto flex flex-col items-center justify-start bg-[#0d0d15] p-6 md:p-12">
      {/* Scanline Overlay */}
      <div className="crt-scanlines pointer-events-none" />

      {/* Backdrop Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center mix-blend-normal opacity-85 z-0" 
        style={{ backgroundImage: `url('/dungeon_menu_bg.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d15] via-transparent to-transparent opacity-95 z-0" />

      {/* Return to Dashboard back button */}
      <button
        onClick={() => setPhase('DASHBOARD')}
        className="absolute top-6 left-6 z-20 px-4 py-2 bg-[#1b1b23] border-4 border-black text-[#e4e1ed] font-space-mono font-bold text-xs uppercase tracking-wider active:translate-y-0.5 active:translate-x-0.5 shadow-[4px_4px_0px_0px_#0d0d15] hover:bg-[#292932] transition-all cursor-pointer"
        style={{
          boxShadow: '4px 4px 0px 0px #0d0d15',
        }}
      >
        [ESC] RETURN TO MENU
      </button>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl my-auto flex flex-col items-center justify-center py-12">
        {/* Title */}
        <motion.h2 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="font-anybody text-3xl sm:text-4xl md:text-5xl font-black italic text-center text-white mb-12 tracking-tight uppercase retro-shadow-red z-10"
        >
          CHOOSE YOUR EXPEDITIONER
        </motion.h2>

        {/* Outer Grid wrapping Cards & Background Torches */}
        <div className="relative w-full">
          {/* Torch 1 (between Berserker and Paladin) */}
          <div className="absolute left-[25%] top-[10%] -translate-x-1/2 -translate-y-12 z-0 hidden lg:block">
            <PixelTorch />
          </div>

          {/* Torch 2 (between Wizard and Overseer) */}
          <div className="absolute left-[75%] top-[10%] -translate-x-1/2 -translate-y-12 z-0 hidden lg:block">
            <PixelTorch />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full relative z-10">
            {CLASSES.map((cls, i) => {
              const Icon = cls.icon;
              return (
                <motion.button
                  key={cls.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 80 }}
                  onClick={() => initializeGame(cls.id)}
                  className={`group relative flex flex-col items-center p-6 bg-[#13131b]/95 text-left select-none cursor-pointer h-full transition-all duration-100 border-4 border-[#0d0d15] ring-4 ring-[#c8966c] shadow-[8px_8px_0px_0px_#0d0d15] active:translate-y-1 active:translate-x-1 active:shadow-none ${cls.themeColor}`}
                >
                  {/* Glossy top-half sheen */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                  {/* Icon Container with colored circle */}
                  <div 
                    className="w-24 h-24 rounded-full mb-6 flex items-center justify-center border-4 bg-[#0d0d15] transition-transform duration-300 group-hover:scale-105"
                    style={{ borderColor: cls.color }}
                  >
                    <Icon color={cls.color} />
                  </div>

                  {/* Class Name */}
                  <h3 className="text-2xl font-anybody font-black uppercase tracking-tight text-white mb-2 text-center w-full text-shadow-[2px_2px_0px_#0d0d15]">
                    {cls.name}
                  </h3>
                  
                  {/* Focus Subtitle */}
                  <div className="font-space-mono text-[10px] uppercase tracking-widest text-[#908f9d] mb-4 text-center w-full">
                    {cls.focus}
                  </div>

                  {/* Divider line */}
                  <div className="w-full h-1 bg-[#292932] mb-4 border-b border-black" />

                  {/* Description Paragraph */}
                  <p className="text-[#e4e1ed] font-space-grotesk text-sm leading-relaxed text-center mt-2 flex-grow">
                    {cls.desc}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
