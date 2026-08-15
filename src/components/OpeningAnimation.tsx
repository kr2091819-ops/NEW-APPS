import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playTickSound, playClickSound } from '../utils/audio';

interface OpeningAnimationProps {
  onComplete: () => void;
  key?: string;
}

export default function OpeningAnimation({ onComplete }: OpeningAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'stable' | 'collapse' | 'draw' | 'success' | 'exit'>('enter');

  // Animation Timeline Controller
  useEffect(() => {
    // 1. Enter state for 1500ms (letters showing and settling)
    const tStable = setTimeout(() => {
      setPhase('stable');
    }, 1500);

    // 2. Stable for 1000ms, then trigger letter collapse
    const tCollapse = setTimeout(() => {
      setPhase('collapse');
    }, 2500);

    // 3. Collapse duration 500ms, then trigger tick sign drawing
    const tDraw = setTimeout(() => {
      setPhase('draw');
      // Play high-fidelity click sound when drawing starts
      playTickSound();
    }, 3100);

    // 4. Stay on success for 1000ms
    const tSuccess = setTimeout(() => {
      setPhase('success');
    }, 4300);

    // 5. Exit out of intro
    const tExit = setTimeout(() => {
      setPhase('exit');
    }, 5400);

    // 6. Complete and trigger dashboard
    const tComplete = setTimeout(() => {
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(tStable);
      clearTimeout(tCollapse);
      clearTimeout(tDraw);
      clearTimeout(tSuccess);
      clearTimeout(tExit);
      clearTimeout(tComplete);
    };
  }, [onComplete]);

  // Focus word spelling helper
  const focusWord = "Focus".split("");
  const tickWord = "tick".split("");

  return (
    <div 
      className="fixed inset-0 bg-[#FAF9F6] flex flex-col items-center justify-center z-50 overflow-hidden"
      id="intro-animation-container"
    >
      {/* Decorative premium ultra-soft grid background */}
      <div className="absolute inset-0 bg-[#FAF9F6]" />
      <div className="absolute inset-0 bg-[radial-gradient(#E5E3DB_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 flex flex-col items-center select-none"
      >
        <motion.div
          animate={
            phase === 'exit' 
              ? { scale: 0.98, opacity: 0, filter: 'blur(10px)', y: -12 } 
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Logo Brand Frame */}
          <div className="flex items-center justify-center h-24">
            <h1 className="flex items-center text-5xl sm:text-6xl md:text-7xl tracking-tighter font-display font-medium text-[#111111]">
              {/* "focus" word section */}
              <span className="flex">
                {focusWord.map((letter, index) => (
                  <motion.span
                    key={`focus-${index}`}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: index * 0.08,
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>

              {/* Transition logic for "tick" -> checkmark */}
              <span className="relative flex items-center justify-start ml-0.5">
                <AnimatePresence mode="popLayout">
                  {/* WORD TICK PHASE: Shown during enter and stable, fades out inside collapse */}
                  {(phase === 'enter' || phase === 'stable') && (
                    <motion.span
                      key="word-tick"
                      initial={{ opacity: 0, scale: 0.9, x: -6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.85, 
                        letterSpacing: "-0.08em",
                        filter: "blur(4px)",
                        transition: { duration: 0.4 }
                      }}
                      className="flex text-[#10B981] font-semibold"
                    >
                      {tickWord.map((letter, index) => (
                        <motion.span
                          key={`tick-${index}`}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{
                            delay: 0.4 + index * 0.06,
                            duration: 0.6,
                            ease: [0.16, 1, 0.3, 1]
                          }}
                          className="inline-block"
                        >
                          {letter}
                        </motion.span>
                      ))}
                    </motion.span>
                  )}

                  {/* TICKMARK DRAWING PHASE */}
                  {(phase === 'draw' || phase === 'success' || phase === 'exit' || phase === 'collapse') && (
                    <motion.div
                      key="icon-tick"
                      initial={{ scale: 0, opacity: 0, rotate: -20 }}
                      animate={{ 
                        scale: phase === 'collapse' ? 0 : 1, 
                        opacity: phase === 'collapse' ? 0 : 1, 
                        rotate: 0 
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 220, 
                        damping: 20,
                        delay: phase === 'collapse' ? 0 : 0.05
                      }}
                      className="flex items-center justify-center ml-1"
                    >
                      {/* Premium circular SVG checkmark with thin, pristine drawing animation */}
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 100 100"
                        className="w-12 h-12 sm:w-16 sm:h-16 text-[#10B981]"
                      >
                        {/* Outer pristine ring */}
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          initial={{ pathLength: 0, opacity: 0.15 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                        {/* Inner checkmark path */}
                        <motion.path
                          d="M34 52 L46 63 L66 38"
                          stroke="currentColor"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ 
                            delay: 0.25, 
                            duration: 0.6, 
                            ease: [0.16, 1, 0.3, 1] 
                          }}
                        />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
            </h1>
          </div>

          {/* Elegant tagline beneath */}
          <div className="h-6 overflow-hidden mt-4">
            <AnimatePresence>
              {phase !== 'exit' && (
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.4 }}
                  exit={{ y: -15, opacity: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-[10px] font-mono tracking-[0.22em] uppercase font-bold text-[#111111]"
                >
                  {phase === 'draw' || phase === 'success' 
                    ? "ready to focus" 
                    : "refined attention"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
