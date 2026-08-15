import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Trophy, Edit2, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Quote, Clock, Flame, X } from 'lucide-react';
import { playCompleteBell, playClickSound } from '../utils/audio';

interface Challenge {
  id: string;
  mins: number;
  title: string;
  desc: string;
  quote: string;
}

interface CompletedSession {
  id: string;
  minutes: number;
  completedAt: number;
}

interface TimerDashboardProps {
  isDarkMode?: boolean;
}

const CHALLENGES: Challenge[] = [
  { 
    id: 'sprint', 
    mins: 15, 
    title: '⚡ Spark Sprint', 
    desc: 'Break mental friction with a quick focus burst.', 
    quote: '“The secret of getting ahead is getting started. Focus your mind.”' 
  },
  { 
    id: 'classic', 
    mins: 25, 
    title: '🛡️ Scholar Shield', 
    desc: 'Classic interval for peak absorption and deep flow.', 
    quote: '“Focus is a muscle, and you are building it stronger right now.”' 
  },
  { 
    id: 'marathon', 
    mins: 50, 
    title: '⛰️ Zenith Marathon', 
    desc: 'Conquer a deep cognitive summit with standard rest.', 
    quote: '“He who moves a mountain begins by carrying away small stones.”' 
  },
  { 
    id: 'creative', 
    mins: 10, 
    title: '🎨 Creative Spark', 
    desc: 'Short, rapid brainstorming loop without resistance.', 
    quote: '“Clean spaces and focused blocks unlock true human intelligence.”' 
  },
  { 
    id: 'flow', 
    mins: 45, 
    title: '🧘 Zen Flow State', 
    desc: 'Enter an immersive zone of absolute attention.', 
    quote: '“Your attention is your most precious asset. Guard it beautifully.”' 
  }
];

const GENERAL_QUOTES = [
  "“Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.” — Alexander Graham Bell",
  "“Deep work is the superpower of the 21st century. Conquer your distraction.” — Cal Newport",
  "“Only through focus can you achieve world-class things, no matter your talent.” — Bill Gates",
  "“Simplicity is the ultimate sophistication. Keep your screen simple.” — Steve Jobs",
  "“Make each day your masterpiece through uninterrupted, intentional blocks.” — John Wooden"
];

export default function TimerDashboard({ isDarkMode = false }: TimerDashboardProps) {
  const [celebration, setCelebration] = useState<{
    show: boolean;
    minutes: number;
  } | null>(null);

  // Focus Timer States
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editInputValue, setEditInputValue] = useState<string>("25");

  // Drawer Pull/Push State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Challenge tracking states
  const [activeChallengeId, setActiveChallengeId] = useState<string>('classic');
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);

  // Completed Sessions Today state
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>(() => {
    try {
      const local = localStorage.getItem('focustick_completed_sessions');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('focustick_completed_sessions', JSON.stringify(completedSessions));
    } catch (e) {
      console.error(e);
    }
  }, [completedSessions]);

  // Auto-close drawer when timer is running
  useEffect(() => {
    if (isRunning) {
      setIsDrawerOpen(false);
    }
  }, [isRunning]);

  // Listen for remote set-timer commands from Foky AI
  useEffect(() => {
    const handleSetTimerEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ minutes: number }>;
      if (customEvent.detail && customEvent.detail.minutes) {
        setIsRunning(false);
        updateDuration(customEvent.detail.minutes);
      }
    };
    window.addEventListener('focustick-set-timer', handleSetTimerEvent);
    return () => window.removeEventListener('focustick-set-timer', handleSetTimerEvent);
  }, []);

  const isToday = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const todaySessions = completedSessions.filter(s => isToday(s.completedAt));
  const todayTotalMinutes = todaySessions.reduce((acc, s) => acc + s.minutes, 0);

  const formatTotalTime = (totalMins: number) => {
    if (totalMins === 0) return '0m';
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const totalSecondsRef = useRef<number>(25 * 60);

  // Sync total durations
  const updateDuration = (minutes: number) => {
    const validMinutes = Math.max(1, Math.min(180, minutes));
    setSelectedMinutes(validMinutes);
    setEditInputValue(validMinutes.toString());
    setTimeLeft(validMinutes * 60);
    totalSecondsRef.current = validMinutes * 60;
  };

  // Switch quotes periodically when stopped
  useEffect(() => {
    if (isRunning) return;
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % GENERAL_QUOTES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Main countdown worker
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isRunning) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning]);

  const handleSessionCompletion = () => {
    setIsRunning(false);
    playCompleteBell();

    const newSession: CompletedSession = {
      id: 'session-' + Date.now(),
      minutes: selectedMinutes,
      completedAt: Date.now(),
    };

    setCompletedSessions((prev) => [...prev, newSession]);

    // Mark current challenge as completed if matched
    const matchedChallenge = CHALLENGES.find(c => c.mins === selectedMinutes);
    if (matchedChallenge && !completedChallenges.includes(matchedChallenge.id)) {
      setCompletedChallenges((prev) => [...prev, matchedChallenge.id]);
    }

    setCelebration({
      show: true,
      minutes: selectedMinutes,
    });
  };

  const toggleTimer = () => {
    playClickSound();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    playClickSound();
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
    totalSecondsRef.current = selectedMinutes * 60;
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    playClickSound();
    setIsRunning(false);
    setActiveChallengeId(challenge.id);
    updateDuration(challenge.mins);
  };

  const handleIncrement = () => {
    playClickSound();
    if (!isRunning) {
      updateDuration(selectedMinutes + 5);
      setActiveChallengeId('');
    }
  };

  const handleDecrement = () => {
    playClickSound();
    if (!isRunning && selectedMinutes > 5) {
      updateDuration(selectedMinutes - 5);
      setActiveChallengeId('');
    } else if (!isRunning && selectedMinutes > 1) {
      updateDuration(selectedMinutes - 1);
      setActiveChallengeId('');
    }
  };

  const handleInlineEditSubmit = () => {
    const num = parseInt(editInputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= 180) {
      updateDuration(num);
      const matched = CHALLENGES.find(c => c.mins === num);
      setActiveChallengeId(matched ? matched.id : '');
    } else {
      setEditInputValue(selectedMinutes.toString());
    }
    setIsEditing(false);
  };

  // Numerical display helpers
  const displayMin = Math.floor(timeLeft / 60);
  const displaySec = timeLeft % 60;
  const formattedTime = `${displayMin.toString().padStart(2, '0')}:${displaySec.toString().padStart(2, '0')}`;

  // SVG math parameters
  const circleRadius = 140;
  const circumference = 2 * Math.PI * circleRadius;
  const progressPercent = timeLeft / Math.max(1, totalSecondsRef.current);
  const strokeDashoffset = circumference * (1 - progressPercent);

  // Active challenge quote
  const activeChallengeObj = CHALLENGES.find(c => c.id === activeChallengeId);
  const displayQuote = activeChallengeObj ? activeChallengeObj.quote : GENERAL_QUOTES[currentQuoteIndex];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center relative" id="timer-dashboard-container">
      {/* Visual Celebration Screen Overlay */}
      <AnimatePresence>
        {celebration?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 ${
              isDarkMode ? 'bg-[#0F172A]/95' : 'bg-white/95'
            }`}
            id="celebration-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className={`max-w-md p-8 rounded-3xl shadow-2xl flex flex-col items-center border transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]' 
                  : 'bg-[#FAF9F6] border-[#E6E5DF] text-[#111111]'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-5 border border-[#10B981]/20">
                <Trophy className="w-8 h-8 stroke-[1.5]" />
              </div>
              <p className="text-[10px] font-mono tracking-[0.25em] text-[#10B981] uppercase font-bold mb-2">Goal Completed</p>
              
              <h3 className={`text-2xl font-light leading-snug ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'}`}>
                You maintained pure focus for <span className="font-bold text-[#10B981]">{celebration.minutes} minutes</span>!
              </h3>

              <p className={`text-xs mt-3 leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-gray-500'}`}>
                "Keep close to Nature's heart... and break clear away, once in a while, and climb a mountain or spend a week in the woods. Wash your spirit clean."
              </p>
              
              <button
                onClick={() => {
                  playClickSound();
                  setCelebration(null);
                }}
                className={`mt-8 px-8 py-3 rounded-full font-semibold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md ${
                  isDarkMode
                    ? 'bg-[#10B981] text-white hover:bg-[#10B981]/90'
                    : 'bg-[#111111] text-white hover:bg-black'
                }`}
                id="btn-dismiss-celebration"
              >
                Return to Workspace
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Side Handle Trigger when drawer is closed and timer is stopped */}
      {!isRunning && !isDrawerOpen && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={() => {
            playClickSound();
            setIsDrawerOpen(true);
          }}
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 border-l border-t border-b pl-3 pr-2.5 py-3.5 rounded-l-2xl shadow-xl flex flex-col items-center gap-2 cursor-pointer transition-all group ${
            isDarkMode 
              ? 'bg-[#1E293B] text-[#F8FAFC] border-[#334155] hover:bg-[#334155]' 
              : 'bg-[#111111] text-white border-[#222] hover:bg-black'
          }`}
          title="Open Focus Quests Drawer"
          id="drawer-pull-tab"
        >
          <ChevronLeft className="w-4 h-4 text-[#10B981] group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 opacity-80 group-hover:opacity-100">
            Quests & Quotes
          </span>
          <Trophy className="w-3.5 h-3.5 text-[#10B981]" />
        </motion.button>
      )}

      {/* MAIN COUNTDOWN TIMER PANEL */}
      <div 
        className={`w-full flex flex-col items-center justify-center p-8 md:p-12 border rounded-2xl relative overflow-hidden transition-colors duration-500 shadow-sm ${
          isDarkMode
            ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]'
            : 'bg-white border-[#E6E5DF] text-[#111111]'
        }`}
        id="timer-panel"
      >
        {/* Top Indicators */}
        <div className={`absolute top-5 left-5 text-[9px] font-mono tracking-[0.15em] pointer-events-none uppercase font-semibold ${
          isDarkMode ? 'text-[#94A3B8]' : 'text-[#A1A096]'
        }`}>
          {isRunning ? '✦ Active Focus Session' : '✦ Workspace Prepared'}
        </div>
        
        <div className={`absolute bottom-5 right-5 text-[9px] font-mono tracking-[0.15em] pointer-events-none uppercase font-semibold ${
          isDarkMode ? 'text-[#94A3B8]' : 'text-[#A1A096]'
        }`}>
          Focus✓
        </div>

        {/* Top Right Drawer Open Trigger Button */}
        {!isRunning && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => {
                playClickSound();
                setIsDrawerOpen(!isDrawerOpen);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                isDarkMode
                  ? 'bg-[#0F172A] text-[#F8FAFC] border-[#334155] hover:bg-[#1E293B]'
                  : 'bg-[#111111] text-white border-transparent hover:bg-black'
              }`}
              id="btn-toggle-challenge-drawer"
              title="Open Focus Quests & Quotes Drawer"
            >
              <Trophy className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="hidden sm:inline">Quests & Quotes</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* Configurator Controls when timer is stopped */}
        {!isRunning && (
          <div className="flex flex-col items-center mb-8 z-10 w-full mt-4 sm:mt-0">
            <span className={`text-[9.5px] font-mono uppercase tracking-[0.2em] mb-3.5 font-bold ${
              isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
            }`}>
              Adjust Focus Duration
            </span>

            <div className={`flex items-center gap-4 border px-5 py-2.5 rounded-full shadow-2xs transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155]' 
                : 'bg-[#FAF9F6] border-[#E6E5DF]'
            }`}>
              <button
                onClick={handleDecrement}
                disabled={selectedMinutes <= 1}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all disabled:opacity-30 cursor-pointer text-sm font-bold ${
                  isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#475569]'
                    : 'bg-white border-[#E6E5DF] text-[#8C8B82] hover:text-[#111111] hover:border-[#CDCCC6]'
                }`}
                title="Decrease time"
              >
                -
              </button>

              <div className="flex items-center gap-1 min-w-[80px] justify-center">
                {isEditing ? (
                  <input
                    type="text"
                    value={editInputValue}
                    onChange={(e) => setEditInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={handleInlineEditSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInlineEditSubmit();
                      if (e.key === 'Escape') {
                        setEditInputValue(selectedMinutes.toString());
                        setIsEditing(false);
                      }
                    }}
                    autoFocus
                    className={`w-14 text-center text-xs font-mono font-bold rounded py-0.5 outline-none border focus:border-[#10B981] ${
                      isDarkMode 
                        ? 'bg-[#1E293B] border-[#475569] text-[#F8FAFC]' 
                        : 'bg-white border-[#CDCCC6] text-[#111111]'
                    }`}
                  />
                ) : (
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsEditing(true);
                    }}
                    className={`flex items-center gap-1 font-mono text-xs font-bold hover:text-[#10B981] transition-colors ${
                      isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
                    }`}
                    title="Click to input custom time"
                  >
                    <span className="text-sm font-semibold">{selectedMinutes}</span>
                    <span className={`font-semibold text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'}`}>mins</span>
                    <Edit2 className="w-2.5 h-2.5 opacity-50" />
                  </button>
                )}
              </div>

              <button
                onClick={handleIncrement}
                disabled={selectedMinutes >= 180}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all disabled:opacity-30 cursor-pointer text-sm font-bold ${
                  isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#475569]'
                    : 'bg-white border-[#E6E5DF] text-[#8C8B82] hover:text-[#111111] hover:border-[#CDCCC6]'
                }`}
                title="Increase time"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Giant Circle Countdown Wheel */}
        <div className="relative w-76 h-76 md:w-80 md:h-80 flex items-center justify-center mb-8" id="visual-countdown-wheel">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r={circleRadius}
              className={isDarkMode ? 'stroke-[#0F172A]' : 'stroke-[#FAF9F6]'}
              strokeWidth="5"
              fill="none"
              style={{ cx: '50%', cy: '50%' }}
            />
            <circle
              cx="160"
              cy="160"
              r={circleRadius}
              className={isDarkMode ? 'stroke-[#334155]' : 'stroke-[#E6E5DF]'}
              strokeWidth="1.2"
              fill="none"
              style={{ cx: '50%', cy: '50%' }}
            />
            <circle
              cx="160"
              cy="160"
              r={circleRadius - 10}
              className={isDarkMode ? 'stroke-[#334155]/50' : 'stroke-[#E6E5DF]/40'}
              strokeWidth="1"
              strokeDasharray="2 4"
              fill="none"
              style={{ cx: '50%', cy: '50%' }}
            />
            <motion.circle
              cx="160"
              cy="160"
              r={circleRadius}
              className="stroke-[#10B981]"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              style={{ cx: '50%', cy: '50%' }}
              animate={{ 
                strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset 
              }}
              transition={{ duration: 0.1, ease: 'linear' }}
              strokeDasharray={circumference}
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <span className={`text-[9px] font-mono tracking-[0.2em] uppercase mb-2 font-bold ${
              isDarkMode ? 'text-[#94A3B8]' : 'text-[#A1A096]'
            }`}>
              {isRunning ? 'Deep Concentration' : 'Selected Target'}
            </span>
            <span className={`text-6xl md:text-7xl font-display font-light tracking-[-0.04em] tabular-nums leading-none ${
              isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
            }`}>
              {formattedTime}
            </span>

            {activeChallengeObj && !isRunning && (
              <span className="text-[9.5px] text-[#10B981] font-mono font-bold mt-2 uppercase tracking-wider">
                {activeChallengeObj.title}
              </span>
            )}
          </div>
        </div>

        {/* Timer Play Control Bar */}
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={resetTimer}
            className={`p-3 rounded-full border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#475569]'
                : 'bg-white border-[#E6E5DF] text-[#8C8B82] hover:text-[#111111] hover:border-[#CDCCC6]'
            }`}
            title="Reset timer"
            id="btn-timer-reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-10 py-3.5 rounded-full font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm ${
              isRunning
                ? isDarkMode
                  ? 'bg-[#F8FAFC] text-[#0F172A] hover:bg-white'
                  : 'bg-[#111111] text-white hover:bg-black'
                : 'bg-[#10B981] text-white hover:bg-[#10B981]/90'
            }`}
            id="btn-timer-trigger"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Flow</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Begin Session</span>
              </>
            )}
          </button>
        </div>

        {/* Today's Focus Session Summary (Visible when not running) */}
        <AnimatePresence>
          {!isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className={`mt-8 pt-6 border-t w-full max-w-sm flex flex-col items-center gap-3 z-10 ${
                isDarkMode ? 'border-[#334155]' : 'border-[#E6E5DF]'
              }`}
              id="today-summary-container"
            >
              <div className="flex items-center justify-between w-full px-1">
                <span className={`text-[9.5px] font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                }`}>
                  <Flame className="w-3.5 h-3.5 text-[#10B981]" />
                  Today's Summary
                </span>
                {todaySessions.length > 0 && (
                  <span className="text-[9.5px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2.5 py-0.5 rounded-full">
                    {todaySessions.length} {todaySessions.length === 1 ? 'Session' : 'Sessions'}
                  </span>
                )}
              </div>

              <div className={`w-full border rounded-xl p-3.5 flex items-center justify-between shadow-2xs transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-[#0F172A] border-[#334155]' 
                  : 'bg-[#FAF9F6] border-[#E6E5DF]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-[#10B981] ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E6E5DF]'
                  }`}>
                    <Clock className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`text-[10px] font-mono uppercase font-semibold ${
                      isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                    }`}>
                      Total Focused Today
                    </span>
                    <span className={`text-base font-bold font-mono tracking-tight ${
                      isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
                    }`}>
                      {formatTotalTime(todayTotalMinutes)}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center gap-2 border-l pl-4 text-right ${
                  isDarkMode ? 'border-[#334155]' : 'border-[#E6E5DF]'
                }`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-mono uppercase font-semibold ${
                      isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                    }`}>
                      Sessions
                    </span>
                    <span className={`text-base font-bold font-mono ${
                      isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
                    }`}>
                      {todaySessions.length}
                    </span>
                  </div>
                </div>
              </div>

              {todaySessions.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                  {todaySessions.slice(-4).map((s, idx) => (
                    <span
                      key={s.id || idx}
                      className={`text-[9.5px] font-mono border px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isDarkMode 
                          ? 'bg-[#0F172A] border-[#334155] text-[#CBD5E1]' 
                          : 'bg-white border-[#E6E5DF] text-[#555552]'
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#10B981]" />
                      {s.minutes}m
                    </span>
                  ))}
                  {todaySessions.length > 4 && (
                    <span className={`text-[9px] font-mono px-1 ${
                      isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                    }`}>
                      +{todaySessions.length - 4} more
                    </span>
                  )}
                </div>
              ) : (
                <p className={`text-[10.5px] italic text-center mt-0.5 ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                }`}>
                  No completed focus sessions today yet.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PULL/PUSH SLIDE-OVER DRAWER (RIGHT SIDE PANEL) */}
      <AnimatePresence>
        {isDrawerOpen && !isRunning && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playClickSound();
                setIsDrawerOpen(false);
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
              id="drawer-backdrop"
            />

            {/* Right Slide Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`fixed top-0 right-0 h-full w-full max-w-md border-l shadow-2xl z-50 flex flex-col p-6 overflow-y-auto transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]' 
                  : 'bg-white border-[#E6E5DF] text-[#111111]'
              }`}
              id="challenge-drawer"
            >
              {/* Drawer Header with Close & Push button */}
              <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                isDarkMode ? 'border-[#334155]' : 'border-[#E6E5DF]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] border border-[#10B981]/20">
                    <Trophy className="w-4.5 h-4.5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold uppercase tracking-wider font-mono ${
                      isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
                    }`}>
                      Focus Quests & Goals
                    </h3>
                    <p className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'}`}>
                      Select a quest to set your target duration
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    setIsDrawerOpen(false);
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer border border-transparent ${
                    isDarkMode
                      ? 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0F172A] hover:border-[#334155]'
                      : 'text-[#8C8B82] hover:text-[#111111] hover:bg-[#FAF9F6] hover:border-[#E6E5DF]'
                  }`}
                  title="Close Drawer"
                  id="btn-close-drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Goal Attainment Quote Block */}
              <div className={`p-5 border rounded-2xl relative overflow-hidden flex flex-col gap-2.5 mb-6 shadow-2xs transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-[#0F172A] border-[#334155]'
                  : 'bg-[#FAF9F6] border-[#E6E5DF]'
              }`}>
                <div className={`absolute top-3 right-3 pointer-events-none ${
                  isDarkMode ? 'text-[#334155]' : 'text-gray-200'
                }`}>
                  <Quote className="w-8 h-8 transform rotate-180" />
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#10B981] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#10B981]" />
                  Goal Attainment Whisper
                </span>
                <p className={`text-xs italic font-serif leading-relaxed pr-4 ${
                  isDarkMode ? 'text-[#CBD5E1]' : 'text-[#555552]'
                }`}>
                  {displayQuote}
                </p>
              </div>

              {/* Challenges list */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-[10.5px] font-mono uppercase tracking-wider font-bold ${
                    isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                  }`}>
                    Available Focus Quests
                  </h4>
                  <span className="text-[9.5px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2.5 py-0.5 rounded-full">
                    {completedChallenges.length} / {CHALLENGES.length} Completed
                  </span>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1 custom-scrollbar">
                  {CHALLENGES.map((challenge) => {
                    const isSelected = activeChallengeId === challenge.id;
                    const isCompleted = completedChallenges.includes(challenge.id);

                    return (
                      <button
                        key={challenge.id}
                        onClick={() => {
                          handleSelectChallenge(challenge);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-[#0F172A] border-[#10B981] shadow-[0_4px_12px_rgba(16,185,129,0.12)]'
                              : 'bg-[#FAF9F6] border-[#10B981] shadow-[0_4px_12px_rgba(16,185,129,0.06)]'
                            : isDarkMode
                              ? 'bg-[#0F172A]/70 hover:bg-[#0F172A] border-[#334155] hover:border-[#475569]'
                              : 'bg-white hover:bg-[#FAF9F6]/60 hover:border-[#CDCCC6] border-[#E6E5DF]'
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                              isSelected ? 'text-[#10B981]' : isDarkMode ? 'text-[#94A3B8]' : 'text-gray-400'
                            }`}>
                              {challenge.mins}m Goal
                            </span>
                            {isCompleted && (
                              <span className="text-[9px] bg-[#10B981]/10 text-[#10B981] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Achieved
                              </span>
                            )}
                          </div>
                          
                          <h5 className={`text-xs font-bold tracking-tight ${
                            isDarkMode ? 'text-[#F8FAFC]' : 'text-[#111111]'
                          }`}>
                            {challenge.title}
                          </h5>
                          
                          <p className={`text-[10.5px] leading-relaxed mt-0.5 ${
                            isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                          }`}>
                            {challenge.desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-mono font-bold transition-colors ${
                            isDarkMode 
                              ? 'text-[#94A3B8] group-hover:text-[#F8FAFC]' 
                              : 'text-gray-400 group-hover:text-[#111111]'
                          }`}>
                            {challenge.mins}:00
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                            isDarkMode 
                              ? 'text-[#64748B] group-hover:text-[#F8FAFC]' 
                              : 'text-gray-300 group-hover:text-[#111111]'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
