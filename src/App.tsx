import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Sun, Moon } from 'lucide-react';
import OpeningAnimation from './components/OpeningAnimation';
import TimerDashboard from './components/TimerDashboard';
import FokyChat from './components/FokyChat';
import { playClickSound } from './utils/audio';

export default function App() {
  const [introPassed, setIntroPassed] = useState<boolean>(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('focustick_theme');
      if (saved !== null) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('focustick_theme', isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    playClickSound();
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans antialiased relative ${
      isDarkMode 
        ? 'bg-[#0F172A] text-[#F8FAFC] ambient-dots-dark-bg' 
        : 'bg-[#FAF9F6] text-[#121212] ambient-dots-bg'
    }`}>
      <AnimatePresence mode="wait">
        {/* Phase A: Logo tick Drawing Entrance */}
        {!introPassed ? (
          <OpeningAnimation key="intro" onComplete={() => setIntroPassed(true)} />
        ) : (
          /* Phase B: Beautiful Centered Timer Workspace */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 mb-12 flex flex-col min-h-screen justify-between"
            id="app-container"
          >
            {/* Minimalist Top Navigation Header Bar */}
            <header className={`flex items-center justify-between border-b pb-5 mb-8 bg-transparent transition-colors duration-300 ${
              isDarkMode ? 'border-[#1E293B]' : 'border-[#E8E8E4]'
            }`}>
              <div className="flex items-center gap-3">
                {/* Micro branding logo tick mark */}
                <div className={`logo text-2xl font-light tracking-tighter ${
                  isDarkMode ? 'text-[#F8FAFC]' : 'text-[#1C1B17]'
                }`}>
                  Focus<span className="text-[#10B981] font-bold ml-0.5">✓</span>
                </div>
                <span className={`h-4 w-px hidden sm:block ${
                  isDarkMode ? 'bg-[#334155]' : 'bg-[#E8E8E4]'
                }`}></span>
                <p className={`text-[10px] font-bold tracking-widest uppercase hidden sm:block font-mono ${
                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8C88]'
                }`}>
                  Study Space
                </p>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-[11px] font-mono font-semibold transition-all cursor-pointer border shadow-2xs hover:scale-105 active:scale-95 ${
                  isDarkMode
                    ? 'bg-[#1E293B] text-[#F8FAFC] border-[#334155] hover:bg-[#334155]'
                    : 'bg-[#FAF9F6] text-[#111111] border-[#E8E8E4] hover:bg-white'
                }`}
                id="theme-toggle-btn"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#F59E0B] stroke-[2.2]" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#6366F1] stroke-[2.2]" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>
            </header>

            {/* Main Interactive Workspace Container */}
            <main className="flex-1 flex items-center justify-center py-6" id="main-workspace">
              <TimerDashboard isDarkMode={isDarkMode} />
            </main>

            {/* Subtle, beautiful minimalist design footer */}
            <footer className={`mt-16 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium bg-transparent transition-colors duration-300 ${
              isDarkMode 
                ? 'border-[#1E293B] text-[#94A3B8]' 
                : 'border-[#E8E8E4] text-[#8C8C88]'
            }`}>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Pure minimal design aesthetic. Beautiful focus workspace.</span>
              </div>
              <div>
                FocusTick &copy; {new Date().getFullYear()} – Refined Zen
              </div>
            </footer>

            {/* AI Chatbot "Foky" on bottom right side */}
            <FokyChat isDarkMode={isDarkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
