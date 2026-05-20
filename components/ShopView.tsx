'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion } from 'framer-motion';
import { ShoppingCart, X, Zap, Shield, Sparkles, Trash2, ArrowUpCircle, RotateCw, Coins } from 'lucide-react';
import { purchaseItem, exitShop, purchaseCardRemoval, purchaseCardUpgrade, purchaseRelic } from '@/lib/actions';
import CardComponent from './Card';
import { Card } from '@/lib/types';
import { useState } from 'react';
import { clsx } from 'clsx';

function getCardPrice(card: Card): number {
  const isWildcard = card.specialModifier && (card.specialModifier as any).isWildcard;
  if (isWildcard) return 50;
  const rank = card.rank;
  if (rank >= 14) return 120;
  if (rank >= 10) return 60;
  return 30;
}

function getCardSellValue(card: Card): number {
  if (card.isAsh) return 3;
  const isWildcard = card.specialModifier && (card.specialModifier as any).isWildcard;
  if (isWildcard) return 25;
  const rank = card.rank;
  if (rank >= 14) return 60;
  if (rank >= 10) return 30;
  if (rank >= 6) return 15;
  return 5; // Basic card
}

export default function ShopView() {
  const { player, sessionId, grid, shopCards, shopRerolled, buyCard, sellCard, rerollShop } = useGameStore();
  const [shopMode, setShopMode] = useState<'MAIN' | 'REMOVE' | 'UPGRADE' | 'SELL'>('MAIN');

  if (!player || !sessionId) return null;

  const closeShop = async () => {
    const sessionData = await exitShop(sessionId);
    if (sessionData) {
      useGameStore.setState({ 
        gamePhase: sessionData.phase,
        player: sessionData.player,
        grid: sessionData.grid
      });
    } else {
      useGameStore.setState({ gamePhase: 'EXPLORING' });
    }
  };

  const handlePurchase = async (itemType: 'HEAL' | 'REVEAL') => {
    const sessionData = await purchaseItem(sessionId, itemType);
    if (sessionData) {
      useGameStore.setState({
        player: sessionData.player,
        grid: sessionData.grid,
      });
    }
  };

  const handleCardRemoval = async (cardId: string) => {
    const sessionData = await purchaseCardRemoval(sessionId, cardId);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
      setShopMode('MAIN');
    }
  };

  const handleCardUpgrade = async (cardId: string) => {
    const sessionData = await purchaseCardUpgrade(sessionId, cardId);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
      setShopMode('MAIN');
    }
  };

  const handleRelicPurchase = async () => {
    // Hardcoded for now. A real implementation would pick 3 random relics to offer.
    const sessionData = await purchaseRelic(sessionId, 'MITHRIL_COIN', 150);
    if (sessionData) {
      useGameStore.setState({ player: sessionData.player, grid: sessionData.grid });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass w-full max-w-4xl p-6 md:p-8 rounded-3xl border-zinc-800"
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/25 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
              <ShoppingCart className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">The Merchant</h2>
              <p className="text-zinc-500 text-xs font-medium italic">"Got some rare goods for a traveler like you..."</p>
            </div>
          </div>
          <button 
            onClick={closeShop}
            className="p-2 hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-zinc-800"
          >
            <X className="w-6 h-6 text-zinc-500 hover:text-white transition-colors" />
          </button>
        </div>

        {/* SHOP BODY */}
        {shopMode === 'MAIN' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
            
            {/* LEFT / SECTION A: CARD MARKET (8 cols) */}
            <div className="md:col-span-8 bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="font-black text-base uppercase tracking-tight text-zinc-150 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" /> Card Market
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-medium">Direct card purchases & wildcard anomalies</p>
                  </div>
                  
                  {/* REROLL BUTTON */}
                  <button
                    disabled={shopRerolled || player.gold < 15}
                    onClick={async () => {
                      await rerollShop();
                    }}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                      shopRerolled
                        ? "bg-zinc-900/30 border-zinc-900 text-zinc-600 cursor-not-allowed"
                        : player.gold < 15
                        ? "bg-red-500/10 border-red-500/20 text-red-400 opacity-60 cursor-not-allowed"
                        : "bg-purple-950/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                    )}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reroll</span>
                    <span className="opacity-60">(15g)</span>
                  </button>
                </div>

                {/* CARDS GRID */}
                <div className="grid grid-cols-4 gap-3 mb-4 justify-items-center">
                  {shopCards.map((c) => {
                    const price = getCardPrice(c);
                    const canAfford = player.gold >= price;
                    return (
                      <div key={c.id} className="flex flex-col items-center gap-2 group">
                        <div 
                          onClick={async () => {
                            if (canAfford) await buyCard(c.id);
                          }}
                          className={clsx(
                            "transition-all duration-300",
                            canAfford ? "hover:scale-105 active:scale-95 cursor-pointer" : "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <CardComponent card={c} selected={false} onClick={() => {}} />
                        </div>
                        <span className={clsx(
                          "text-xs font-mono font-black flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-900/60 border border-zinc-800/80 shadow-inner",
                          canAfford ? "text-yellow-500" : "text-red-400"
                        )}>
                          {price}g
                        </span>
                      </div>
                    );
                  })}
                  {shopCards.length === 0 && (
                    <div className="col-span-4 py-16 text-center text-xs text-zinc-500 font-medium italic">
                      All cards purchased from Card Market.
                    </div>
                  )}
                </div>
              </div>

              {/* SELL TRIGGER AREA */}
              <div className="border-t border-zinc-800/50 pt-4 flex justify-between items-center mt-4">
                <div>
                  <h4 className="text-xs font-black text-zinc-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <Coins className="w-4 h-4 text-yellow-500" /> Sell Cards
                  </h4>
                  <p className="text-[10px] text-zinc-500">Banish unwanted cards from deck to retrieve gold</p>
                </div>
                <button
                  onClick={() => setShopMode('SELL')}
                  className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-black uppercase tracking-tight rounded-lg hover:bg-yellow-500/25 transition-all shadow-[0_0_10px_rgba(234,179,8,0.05)]"
                >
                  Select Card to Sell
                </button>
              </div>
            </div>

            {/* RIGHT / SERVICES (4 cols) */}
            <div className="md:col-span-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight text-zinc-150 flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-yellow-500" /> Services
                </h3>
                <div className="flex flex-col gap-2.5">
                  <div 
                    onClick={() => handlePurchase('REVEAL')}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col"
                  >
                    <h4 className="font-bold text-xs text-zinc-200 group-hover:text-yellow-500 transition-colors">Reveal Map</h4>
                    <p className="text-[9px] text-zinc-500 leading-normal">Instantly reveals 3 random hidden hexes.</p>
                    <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-mono font-bold mt-1.5">
                      <Zap className="w-3.5 h-3.5" /> 25g
                    </div>
                  </div>

                  <div 
                    onClick={() => handlePurchase('HEAL')}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col"
                  >
                    <h4 className="font-bold text-xs text-zinc-200 group-hover:text-yellow-500 transition-colors">Health Potion</h4>
                    <p className="text-[9px] text-zinc-500 leading-normal">Restores 25 HP.</p>
                    <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-mono font-bold mt-1.5">
                      <Zap className="w-3.5 h-3.5" /> 40g
                    </div>
                  </div>

                  <div 
                    onClick={() => setShopMode('REMOVE')}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col"
                  >
                    <h4 className="font-bold text-xs text-zinc-200 group-hover:text-yellow-500 transition-colors">Remove Card</h4>
                    <p className="text-[9px] text-zinc-500 leading-normal">Thin your deck by permanently destroying a card.</p>
                    <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-mono font-bold mt-1.5">
                      <Zap className="w-3.5 h-3.5" /> 50g
                    </div>
                  </div>

                  <div 
                    onClick={() => setShopMode('UPGRADE')}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col"
                  >
                    <h4 className="font-bold text-xs text-zinc-200 group-hover:text-yellow-500 transition-colors">Upgrade Card</h4>
                    <p className="text-[9px] text-zinc-500 leading-normal">Permanently upgrade a card's power.</p>
                    <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-mono font-bold mt-1.5">
                      <Zap className="w-3.5 h-3.5" /> 75g
                    </div>
                  </div>
                </div>
              </div>
              
              {!player.relics?.includes('MITHRIL_COIN') && (
                <div 
                  onClick={handleRelicPurchase}
                  className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-black text-yellow-500 text-xs flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> Mithril Coin
                    </h4>
                    <p className="text-[9px] text-zinc-400">Relic. Max HP increases on gold gain.</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 font-mono font-bold text-xs">
                    <Zap className="w-3.5 h-3.5" /> 150g
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DECK INTERACTIVE SELECTION MODES (REMOVE, UPGRADE, SELL) */
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4 bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                  {shopMode === 'REMOVE' && <Trash2 className="w-4 h-4 text-red-400" />}
                  {shopMode === 'UPGRADE' && <ArrowUpCircle className="w-4 h-4 text-emerald-400" />}
                  {shopMode === 'SELL' && <Coins className="w-4 h-4 text-yellow-500" />}
                  {shopMode === 'REMOVE' ? 'Merchant Card Purge' : shopMode === 'UPGRADE' ? 'Merchant Forge' : 'Liquidate Assets'}
                </h3>
                <p className="text-zinc-500 text-xs font-medium italic">
                  {shopMode === 'REMOVE'
                    ? 'Select a card to permanently banish from your deck (50g fee)'
                    : shopMode === 'UPGRADE'
                    ? 'Select a card to permanently increase its rank by +2 (75g fee)'
                    : 'Select a card from your deck to dismantle for immediate gold'}
                </p>
              </div>
              <button 
                onClick={() => setShopMode('MAIN')} 
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-all"
              >
                Back to Shop
              </button>
            </div>
            
            <div className="flex flex-wrap gap-4 max-h-[300px] overflow-y-auto p-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl justify-center">
              {player.deck.map((c) => {
                const sellVal = getCardSellValue(c);
                return (
                  <div 
                    key={c.id} 
                    onClick={async () => {
                      if (shopMode === 'REMOVE') {
                        if (player.gold >= 50) await handleCardRemoval(c.id);
                      } else if (shopMode === 'UPGRADE') {
                        if (player.gold >= 75) await handleCardUpgrade(c.id);
                      } else if (shopMode === 'SELL') {
                        await sellCard(c.id);
                        setShopMode('MAIN');
                      }
                    }}
                    className={clsx(
                      "transition-all duration-300 flex flex-col items-center gap-2",
                      (shopMode === 'REMOVE' && player.gold < 50) || (shopMode === 'UPGRADE' && player.gold < 75)
                        ? "opacity-40 cursor-not-allowed scale-95"
                        : "cursor-pointer hover:scale-105 active:scale-95"
                    )}
                  >
                    <CardComponent 
                      card={c} 
                      selected={false} 
                      onClick={() => {}} 
                    />
                    {shopMode === 'SELL' && (
                      <span className="text-xs text-yellow-500 font-black font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 shadow-inner">
                        +{sellVal}g
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between items-center pt-6 border-t border-zinc-800/80 mt-4">
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-850 px-4 py-2 rounded-xl">
            <span className="text-zinc-500 text-xs font-black uppercase tracking-wider">Player Purse:</span>
            <span className="text-lg font-mono font-black text-yellow-500">{player.gold}g</span>
          </div>
          <button 
            onClick={closeShop}
            className="px-8 py-3 bg-zinc-100 text-zinc-950 font-black uppercase tracking-tight rounded-xl hover:bg-yellow-500 hover:text-zinc-950 active:scale-98 transition-all"
          >
            Leave Shop
          </button>
        </div>
      </motion.div>
    </div>
  );
}
