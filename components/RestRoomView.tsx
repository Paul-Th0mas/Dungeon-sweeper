'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Heart, Wand2, Star, ChevronRight } from 'lucide-react';
import { Spell, CardElement } from '@/lib/types';
import { useState } from 'react';
import { clsx } from 'clsx';

const EL_COLOR: Record<CardElement, string> = {
  FIRE: 'text-orange-400', WATER: 'text-sky-400',
  AIR: 'text-violet-300', EARTH: 'text-amber-500', VOID: 'text-purple-400',
};

function SpellCard({ spell, onSelect, selected, disabled }: {
  spell: Spell; onSelect: () => void; selected?: boolean; disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : onSelect}
      className={clsx(
        'flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all w-full',
        selected ? 'bg-amber-950/40 border-amber-500/60' : 'bg-zinc-900/50 border-white/8',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-amber-500/40 cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-black text-zinc-100 text-sm">{spell.name}
          {spell.isUpgraded && <span className="ml-2 text-amber-400 text-xs">★ Upgraded</span>}
        </span>
        {spell.isAdvanced && (
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-violet-950/50 border border-violet-500/40 text-violet-300">
            Advanced
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {spell.recipe.map((el, i) => (
          <span key={i} className={clsx('text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700', EL_COLOR[el])}>
            {el[0]}
          </span>
        ))}
        <span className="text-[10px] text-zinc-500 ml-1">→ {spell.isUpgraded ? Math.floor(spell.baseDamage * 1.25) : spell.baseDamage} dmg</span>
      </div>
    </motion.button>
  );
}

type RestMode = 'MAIN' | 'UPGRADE';

export default function RestRoomView() {
  const { player, sessionId, restHeal, restUpgradeSpell } = useGameStore();
  const [mode, setMode] = useState<RestMode>('MAIN');
  const [selectedSpell, setSelectedSpell] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!player || !sessionId) return null;

  const ownedSpells = player.spells.filter(s => s.location !== 'SHOP');
  const upgradableSpells = ownedSpells.filter(s => !s.isUpgraded);

  const handleHeal = async () => {
    setLoading(true);
    await restHeal();
    setLoading(false);
  };

  const handleUpgrade = async () => {
    if (!selectedSpell) return;
    setLoading(true);
    await restUpgradeSpell(selectedSpell);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800/60 rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
            className="p-4 bg-orange-500/15 rounded-2xl border border-orange-500/20 mb-4">
            <Flame className="w-10 h-10 text-orange-400 animate-pulse" />
          </motion.div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">Restful Campfire</h2>
          <p className="text-zinc-500 text-sm">The warmth eases your soul. Choose <strong className="text-zinc-300">one</strong> action.</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'MAIN' && (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-4">
              {/* Heal */}
              <button
                onClick={handleHeal}
                disabled={loading}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
              >
                <div className="p-3 bg-red-500/15 rounded-xl group-hover:scale-110 transition-transform">
                  <Heart className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center">
                  <span className="block font-black text-zinc-100 uppercase tracking-tight">Rest & Heal</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">+50% HP Restored</span>
                </div>
                <div className="text-xs text-green-400 font-bold">
                  +{Math.floor(player.maxHp * 0.5)} HP
                </div>
              </button>

              {/* Upgrade Spell */}
              <button
                onClick={() => setMode('UPGRADE')}
                disabled={upgradableSpells.length === 0}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="p-3 bg-amber-500/15 rounded-xl group-hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-amber-400" />
                </div>
                <div className="text-center">
                  <span className="block font-black text-zinc-100 uppercase tracking-tight">Upgrade Spell</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">+25% Spell Damage</span>
                </div>
                {upgradableSpells.length === 0 ? (
                  <div className="text-xs text-zinc-600 font-bold">All spells upgraded</div>
                ) : (
                  <div className="text-xs text-amber-400 font-bold">{upgradableSpells.length} eligible</div>
                )}
              </button>
            </motion.div>
          )}

          {mode === 'UPGRADE' && (
            <motion.div key="upgrade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-zinc-200 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  Select a Spell to Upgrade
                </h3>
                <button onClick={() => setMode('MAIN')} className="text-xs text-zinc-500 hover:text-white transition-colors">
                  ← Back
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {upgradableSpells.map(spell => (
                  <SpellCard
                    key={spell.id}
                    spell={spell}
                    onSelect={() => setSelectedSpell(spell.id)}
                    selected={selectedSpell === spell.id}
                  />
                ))}
              </div>
              <button
                onClick={handleUpgrade}
                disabled={!selectedSpell || loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4" />
                Upgrade Selected Spell
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest mt-8">
          Rest rooms can only be used once
        </p>
      </motion.div>
    </div>
  );
}
