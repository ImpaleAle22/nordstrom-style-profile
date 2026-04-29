'use client';

/**
 * Swipe UI Component (rebuilt following framer-motion swipe-to-dismiss pattern)
 * Based on framer-motion's best practices for card stacking and gesture handling
 */

import { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import type { SwipeStack, SwipeCard } from '@/lib/types';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';

interface SwipeUIProps {
  customerId: string;
  stacks: SwipeStack[];
}

export default function SwipeUI({ customerId, stacks }: SwipeUIProps) {
  const [selectedStack, setSelectedStack] = useState<SwipeStack | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<Array<{
    cardId: string;
    verdict: 'yes' | 'no';
    dwellMs: number;
  }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentCardIndex]);

  const handleStackSelect = (stack: SwipeStack) => {
    setSelectedStack(stack);
    setCurrentCardIndex(0);
    setSwipeHistory([]);
    setIsComplete(false);
    setCardStartTime(Date.now());
  };

  const handleSwipe = (verdict: 'yes' | 'no') => {
    if (!selectedStack) return;

    const currentCard = selectedStack.cards[currentCardIndex];
    const dwellMs = Date.now() - cardStartTime;

    const newHistory = [
      ...swipeHistory,
      {
        cardId: currentCard.cardId,
        verdict,
        dwellMs,
      },
    ];

    // Move to next card or complete
    if (currentCardIndex >= selectedStack.cards.length - 1) {
      completeSession(newHistory);
    } else {
      setSwipeHistory(newHistory);
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const completeSession = async (finalHistory: typeof swipeHistory) => {
    if (!selectedStack) return;

    // Save session to Supabase
    const sessionData = {
      session_id: `swipe_${customerId}_${selectedStack.stack_id}_${Date.now()}`,
      customer_id: customerId,
      stack_id: selectedStack.stack_id,
      stack_type: selectedStack.stack_type,
      stack_recipe: selectedStack.recipe_type,
      completed_at: new Date().toISOString(),
      completion_type: 'full' as const,
      card_count: selectedStack.card_count,
      cards_viewed: finalHistory.length,
      cards: finalHistory.map((swipe, idx) => {
        const card = selectedStack.cards[idx];
        return {
          cardId: swipe.cardId,
          cardType: card.cardType,
          verdict: swipe.verdict,
          dwellMs: swipe.dwellMs,
          swipeVelocity: swipe.dwellMs < 2000 ? 'fast' : swipe.dwellMs < 5000 ? 'medium' : 'slow',
          saved: false,
          miniPdpOpened: false,
          tags: card.tags,
        };
      }),
      session_signals: {},
      meta: {},
    };

    try {
      await supabase.from('swipe_sessions').insert(sessionData);
      console.log('✓ Session saved:', sessionData.session_id);
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setIsComplete(true);
  };

  const backToSelector = () => {
    setSelectedStack(null);
    setIsComplete(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStack || isComplete) return;

      if (e.key === 'ArrowLeft') {
        handleSwipe('no');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('yes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStack, isComplete, currentCardIndex, swipeHistory]);

  if (stacks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-semibold mb-2">No Stacks Available</h2>
          <p className="text-gray-600 mb-6">
            No swipe stacks are available for your profile yet.
          </p>
          <Link
            href={`/profile/${customerId}`}
            className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900"
          >
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  // Stack Selector
  if (!selectedStack) {
    return (
      <div className="min-h-screen bg-[#FAF9F5]">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold tracking-[3px]">
              NORDSTROM
            </Link>
            <Link href={`/profile/${customerId}`} className="text-sm hover:opacity-60">
              Back to Profile
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-serif font-light mb-2">Style Swipes</h1>
          <p className="text-gray-600 mb-8">Choose a stack to start swiping</p>

          <div className="space-y-4">
            {stacks.map((stack) => (
              <button
                key={stack.stack_id}
                onClick={() => handleStackSelect(stack)}
                className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-black hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-semibold mb-1">{stack.title}</h3>
                {stack.description && (
                  <p className="text-gray-600 text-sm mb-3">{stack.description}</p>
                )}
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {stack.card_count} cards
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                    {stack.stack_type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Completion Screen
  if (isComplete) {
    const yesCount = swipeHistory.filter((s) => s.verdict === 'yes').length;
    const noCount = swipeHistory.filter((s) => s.verdict === 'no').length;

    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-3xl font-serif font-light mb-2">Stack Complete!</h2>
          <p className="text-gray-600 mb-8">Thanks for sharing your style preferences</p>

          <div className="bg-white rounded-xl p-6 mb-6 text-left">
            <div className="text-sm text-gray-500 mb-2">Session Summary</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Cards viewed:</span>
                <span className="font-semibold">{swipeHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Liked:</span>
                <span className="font-semibold text-green-600">{yesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Passed:</span>
                <span className="font-semibold text-gray-400">{noCount}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={backToSelector}
              className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
            >
              Browse More Stacks
            </button>
            <Link
              href={`/profile/${customerId}`}
              className="block w-full bg-white border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              View Your Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Swipe Interface
  const currentCard = selectedStack.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / selectedStack.card_count) * 100;

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">{selectedStack.title}</h2>
        <button
          onClick={backToSelector}
          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          ✕
        </button>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full max-w-md h-[70vh] max-h-[600px]">
          {/* Card stack - show next 2 cards underneath */}
          {[2, 1].map((offset) => {
            const nextIndex = currentCardIndex + offset;
            if (nextIndex >= selectedStack.cards.length) return null;

            return (
              <div
                key={selectedStack.cards[nextIndex].cardId}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  zIndex: -offset,
                }}
              >
                <div
                  className="w-full h-full bg-white rounded-2xl shadow-lg transition-transform duration-200"
                  style={{
                    transform: `scale(${1 - offset * 0.03}) translateY(${offset * 10}px)`,
                    opacity: 1 - offset * 0.2,
                  }}
                >
                  <div
                    className="w-full h-full rounded-2xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${selectedStack.cards[nextIndex].imageUrl})` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Current draggable card */}
          <SwipeCard
            key={currentCard.cardId}
            card={currentCard}
            onSwipe={handleSwipe}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 flex justify-center gap-6">
        <button
          onClick={() => handleSwipe('no')}
          className="w-16 h-16 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-2xl hover:border-red-500 hover:text-red-500 hover:scale-110 transition-all active:scale-95"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipe('yes')}
          className="w-16 h-16 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-2xl hover:border-green-500 hover:text-green-500 hover:scale-110 transition-all active:scale-95"
        >
          ❤️
        </button>
      </div>

      {/* Helper Text */}
      <div className="text-center pb-6 text-sm text-gray-500">
        Swipe or use arrow keys • {currentCardIndex + 1} of {selectedStack.card_count}
      </div>
    </div>
  );
}

// Draggable card following framer-motion swipe-to-dismiss pattern
function SwipeCard({
  card,
  onSwipe,
}: {
  card: SwipeCard;
  onSwipe: (verdict: 'yes' | 'no') => void;
}) {
  const [exitX, setExitX] = useState(0);

  const onDragEnd = (_event: any, info: PanInfo) => {
    // Swipe threshold: absolute distance > 150 OR velocity > 300
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (Math.abs(offset) > 150 || Math.abs(velocity) > 300) {
      // Set exit animation direction
      setExitX(offset > 0 ? 1000 : -1000);
      // Trigger swipe after animation starts
      const verdict = offset > 0 ? 'yes' : 'no';
      setTimeout(() => onSwipe(verdict), 100);
    }
  };

  // Calculate rotation and opacity from drag
  const cardVariants = {
    enter: {
      x: 0,
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.3 }
    },
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    },
    exit: (exitX: number) => ({
      x: exitX,
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3, ease: 'easeOut' }
    })
  };

  return (
    <motion.div
      className="absolute inset-0 w-full h-full"
      style={{
        zIndex: 1,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={onDragEnd}
      variants={cardVariants}
      initial="enter"
      animate={exitX !== 0 ? 'exit' : 'center'}
      custom={exitX}
    >
      <motion.div
        className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{
          cursor: 'grab',
        }}
        whileDrag={{
          cursor: 'grabbing',
          scale: 1.05,
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        onDragEnd={onDragEnd}
      >
        {/* Card Content */}
        <div className="relative w-full h-full">
          {/* Background Image */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${card.imageUrl})`,
            }}
          />

          {/* Gradient Overlay for Text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Card Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h3 className="text-white text-2xl font-semibold mb-2 drop-shadow-lg">
              {card.displayData.title}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {card.tags.pillars.map((pillar) => (
                <span
                  key={pillar}
                  className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full border border-white/30"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          {/* Like/Nope Overlays */}
          <motion.div
            className="absolute top-16 right-12 px-6 py-3 border-4 border-green-500 bg-white/90 rounded-lg transform rotate-12"
            initial={{ opacity: 0, scale: 0.5 }}
            whileDrag={(_, info) => ({
              opacity: info.offset.x > 50 ? Math.min((info.offset.x - 50) / 100, 1) : 0,
              scale: info.offset.x > 50 ? 1 : 0.5,
            })}
          >
            <span className="text-green-500 text-3xl font-bold">LIKE</span>
          </motion.div>

          <motion.div
            className="absolute top-16 left-12 px-6 py-3 border-4 border-red-500 bg-white/90 rounded-lg transform -rotate-12"
            initial={{ opacity: 0, scale: 0.5 }}
            whileDrag={(_, info) => ({
              opacity: info.offset.x < -50 ? Math.min((Math.abs(info.offset.x) - 50) / 100, 1) : 0,
              scale: info.offset.x < -50 ? 1 : 0.5,
            })}
          >
            <span className="text-red-500 text-3xl font-bold">NOPE</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
