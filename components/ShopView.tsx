'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Flame, Droplets, Wind, Mountain, Zap, ArrowRight, Tag, PackagePlus } from 'lucide-react';
import { Spell, CardElement } from '@/lib/types';
import { useState } from 'react';
import { clsx } from 'clsx';
import SpellSwapModal from './SpellSwapModal';

const EL: Record<CardElement, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  FIRE:  { color: 'text-orange-400', bg: 'bg-orange-950/60', border: 'border-orange-500/50', icon: Flame,    label: 'Fire'  },
  WATER: { color: 'text-sky-400',    bg: 'bg-sky-950/60',    border: 'border-sky-500/50',    icon: Droplets, label: 'Water' },
  AIR:   { color: 'text-violet-300', bg: 'bg-violet-950/60', border: 'border-violet-400/50', icon: Wind,     label: 'Air'   },
  EARTH: { color: 'text-amber-500',  bg: 'bg-amber-950/60',  border: 'border-amber-600/50',  icon: Mountain, label: 'Earth' },
  VOID:  { color: 'text-purple-400', bg: 'bg-purple-950/60', border: 'border-purple-500/50', icon: Zap,      label: 'Void'  },
};

type SpareEl = 'FIRE' | 'WATER' | 'AIR' | 'EARTH';

type ShopTab = 'SPELLS' | 'SPARES' | 'SELL';

function SpellShopCard({ spell, onBuy, canAfford }: { spell: Spell; onBuy: () => void; canAfford: boolean }) {
  const cost = spell.isAdvanced ? 80 : 40;
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={clsx(
      'flex flex-col gap-3 p-4 rounded-2xl border transition-all',
      canAfford ? 'bg-zinc-900/60 border-white/8 hover:border-violet-500/40' : 'bg-zinc-900/30 border-white/5 opacity-60',
    )}>
      <div className="flex items-center justify-between">
        <span className="font-black text-zinc-100 text-sm">{spell.name}</span>
        <span className={clsx('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
          spell.isAdvanced ? 'text-violet-300 border-violet-500/40 bg-violet-950/40' : 'text-zinc-400 border-zinc-600/40 bg-zinc-800/40'
        )}>
          {spell.isAdvanced ? 'Advanced' : 'Basic'}
        </span>
      </div>
      {/* Recipe */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {spell.recipe.map((el, i) => {
          const style = EL[el]; const Icon = style.icon;
          return (
            <span key={i} className={clsx('flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold', style.bg, style.border, style.color)}>
              <Icon className="w-2.5 h-2.5" />{el[0]}
            </span>
          );
        })}
        <span className="text-zinc-500 text-[10px] ml-1">→ {spell.baseDamage} dmg</span>
      </div>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        className="flex items-center justify-center gap-2 py-2 rounded-xl font-black uppercase tracking-wider text-xs transition-all bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Tag className="w-3 h-3" />
        {cost}g
      </button>
    </motion.div>
  );
}

export default function ShopView() {
  const { player, shopSpells, buySpell, buySpareElements, sellSpell, exitShop, replaceEquippedSpell } = useGameStore();
  const [tab, setTab] = useState<ShopTab>('SPELLS');
  const [loading, setLoading] = useState(false);
  const [pendingSwapSpell, setPendingSwapSpell] = useState<Spell | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);

  if (!player) return null;

  const ownedSpells = player.spells.filter(s => s.location !== 'SHOP');
  const sellableSpells = ownedSpells.filter(s => !s.equipped);

  const SPARE_ELEMENTS: SpareEl[] = ['FIRE', 'WATER', 'AIR', 'EARTH'];
  const SPARE_COST = 10;

  const handleBuySpell = async (spellId: string) => {
    setLoading(true);
    const equippedBefore = player.spells.filter(s => s.equipped).length;
    await buySpell(spellId);

    if (equippedBefore >= 4) {
      // Find the newly purchased spell in the store's updated player spells list
      const latestPlayer = useGameStore.getState().player;
      if (latestPlayer) {
        const boughtSpell = latestPlayer.spells.find(s => s.id === spellId);
        if (boughtSpell) {
          setPendingSwapSpell(boughtSpell);
        }
      }
    }
    setLoading(false);
  };

  const handleBuySpares = async (el: CardElement) => {
    setLoading(true);
    await buySpareElements(el, 2); // Buy 2 at a time
    setLoading(false);
  };

  const handleSell = async (spellId: string) => {
    setLoading(true);
    await sellSpell(spellId);
    setLoading(false);
  };

  const handleExit = async () => {
    setLoading(true);
    await exitShop();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800/60 rounded-3xl p-6 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 rounded-xl border border-amber-500/20">
              <ShoppingBag className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Arcane Shop</h2>
              <span className="text-[10px] text-amber-400 font-bold">{player.gold}g available</span>
            </div>
          </div>
          <button onClick={handleExit} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-white/8 text-zinc-400 hover:text-white text-xs font-bold transition-all hover:border-white/20">
            Leave <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['SPELLS', 'SPARES', 'SELL'] as ShopTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('flex-1 py-2 rounded-xl font-black uppercase tracking-wider text-xs transition-all border',
                tab === t ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:text-zinc-300'
              )}>
              {t === 'SPELLS' ? 'Spells' : t === 'SPARES' ? 'Spare Elements' : 'Sell'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            {tab === 'SPELLS' && (
              <motion.div key="spells" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                {shopSpells.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-zinc-600">No spells available</div>
                ) : shopSpells.map(spell => (
                  <SpellShopCard
                    key={spell.id}
                    spell={spell}
                    onBuy={() => handleBuySpell(spell.id)}
                    canAfford={player.gold >= (spell.isAdvanced ? 80 : 40)}
                  />
                ))}
              </motion.div>
            )}

            {tab === 'SPARES' && (
              <motion.div key="spares" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4">
                <p className="text-xs text-zinc-500 italic">
                  Spare elements expand your combat pool beyond what your spells provide. Each purchase adds 2 to your inventory.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {SPARE_ELEMENTS.map(el => {
                    const style = EL[el]; const Icon = style.icon;
                    const cost = SPARE_COST * 2;
                    const canAfford = player.gold >= cost;
                    const currentCount = player.spareElements[el] ?? 0;
                    return (
                      <motion.div key={el} whileHover={{ scale: 1.02 }}
                        className={clsx('flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all',
                          style.bg, style.border)}>
                        <Icon className={clsx('w-8 h-8', style.color)} />
                        <div className="text-center">
                          <div className={clsx('font-black text-base', style.color)}>{style.label}</div>
                          <div className="text-zinc-500 text-xs">In inventory: {currentCount}</div>
                        </div>
                        <button
                          onClick={() => handleBuySpares(el)}
                          disabled={!canAfford || loading}
                          className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-wider text-xs transition-all border',
                            canAfford
                              ? `${style.bg} ${style.border} ${style.color} hover:opacity-80`
                              : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-600 cursor-not-allowed'
                          )}>
                          <PackagePlus className="w-3.5 h-3.5" />
                          ×2 for {cost}g
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {tab === 'SELL' && (
              <motion.div key="sell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <p className="text-xs text-zinc-500 italic">
                  Sell unequipped spells to free up space and earn gold. You must keep at least 4 total spells.
                </p>
                {sellableSpells.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">No spells available to sell.<br/>Unequip a spell first to sell it.</div>
                ) : sellableSpells.map(spell => {
                  const refund = spell.isAdvanced ? 35 : 15;
                  const canSell = ownedSpells.length > 4;
                  return (
                    <div key={spell.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/8">
                      <div className="flex-1">
                        <div className="font-bold text-zinc-200 text-sm">{spell.name}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {spell.recipe.map((el, i) => (
                            <span key={i} className={clsx('text-[10px] font-bold px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700', EL[el].color)}>
                              {el[0]}
                            </span>
                          ))}
                          <span className="text-zinc-600 text-[10px] ml-1">→ {spell.baseDamage} dmg</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSell(spell.id)}
                        disabled={!canSell || loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Sell · +{refund}g
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: player's current loadout info */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-600">
          <span>Loadout: {player.spells.filter(s => s.equipped).length}/4 equipped · {player.spells.filter(s => s.isAdvanced && s.equipped).length}/2 advanced</span>
          <span>Library: {ownedSpells.length} total spells</span>
        </div>
      </motion.div>

      {/* Spell Swap Modal – shown when loadout is full after shop purchase */}
      {pendingSwapSpell && (
        <SpellSwapModal
          incomingSpell={pendingSwapSpell}
          equippedSpells={player.spells.filter(s => s.equipped)}
          loading={swapLoading}
          onReplace={async (outgoingId) => {
            setSwapLoading(true);
            await replaceEquippedSpell(outgoingId, pendingSwapSpell.id);
            setSwapLoading(false);
            setPendingSwapSpell(null);
          }}
          onDiscard={() => setPendingSwapSpell(null)}
        />
      )}
    </div>
  );
}
