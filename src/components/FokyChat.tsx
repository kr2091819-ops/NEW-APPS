import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Send, Sparkles, RefreshCw, ChevronDown, Copy, Check, 
  Volume2, VolumeX, Zap, Brain, Activity, HeartPulse, 
  Search, Plus, Trash2, Edit2, Bookmark, BookmarkCheck, 
  ThumbsUp, ThumbsDown, RotateCcw, Download, History, 
  Sliders, MessageSquare, Pin, ShieldCheck, CheckCircle2,
  FileText, CornerDownLeft, Sparkle
} from 'lucide-react';
import { playClickSound } from '../utils/audio';

export type PersonaMode = 'friendly' | 'coach' | 'socratic' | 'exam';

export interface MessageReaction {
  liked?: boolean;
  disliked?: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'foky';
  text: string;
  timestamp: string;
  isPinned?: boolean;
  reaction?: MessageReaction;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  mode: PersonaMode;
  isPinned?: boolean;
}

interface FokyChatProps {
  isDarkMode?: boolean;
}

// Custom Foky Brand Logo Icon
export function FokyBrandLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr from-[#059669] via-[#10B981] to-[#34D399] p-[1.5px] shadow-[0_0_15px_rgba(16,185,129,0.35)] shrink-0 ${sizeMap[size]} ${className}`}>
      <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center relative overflow-hidden">
        {/* Subtle radial inner glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35)_0%,transparent_70%)]" />
        
        {/* Futurist Minimal AI Orbit & Tick Eye */}
        <svg viewBox="0 0 32 32" fill="none" className="w-[65%] h-[65%] text-[#10B981] relative z-10" xmlns="http://www.w3.org/2000/svg">
          {/* Glowing tick mark */}
          <path d="M8.5 16.5L13 21L23.5 9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Orbiting AI Sparkle dots */}
          <circle cx="24" cy="7.5" r="1.5" fill="#34D399" />
          <circle cx="7.5" cy="24.5" r="1.2" fill="#34D399" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}

const DEFAULT_WELCOME_MSG: Message = {
  id: 'welcome-1',
  sender: 'foky',
  text: "Hi! I'm **Foky**, your AI Study Companion! 🤖✨\n\nI can help you build study schedules, beat procrastination, analyze your focus stats, or guide a 1-minute breathing break. What are we working on today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const STARTER_PROMPTS = [
  "⚡ Generate a 2-hour study schedule",
  "🧘 Guide a 1-min breathing break",
  "📊 Analyze my focus stats today",
  "⚡ How do I beat procrastination right now?"
];

const PERSONA_CONFIGS: Record<PersonaMode, { label: string; icon: any; color: string; desc: string }> = {
  friendly: { label: 'Friendly Buddy', icon: Sparkles, color: '#10B981', desc: 'Warm, encouraging, and supportive study friend.' },
  coach: { label: 'Strict Coach', icon: Zap, color: '#F59E0B', desc: 'High accountability, direct action directives.' },
  socratic: { label: 'Socratic Tutor', icon: Brain, color: '#3B82F6', desc: 'Guides you with questions to think deeply.' },
  exam: { label: 'Exam Specialist', icon: FileText, color: '#8B5CF6', desc: 'Active recall, flashcards, & test prep.' },
};

function createNewThread(mode: PersonaMode = 'friendly'): ChatThread {
  const now = Date.now();
  return {
    id: 'thread-' + now + '-' + Math.random().toString(36).substring(2, 7),
    title: 'New Study Conversation',
    createdAt: now,
    updatedAt: now,
    messages: [{ ...DEFAULT_WELCOME_MSG, id: 'msg-' + Date.now() }],
    mode,
    isPinned: false
  };
}

export default function FokyChat({ isDarkMode = false }: FokyChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // Multi-thread state
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('focustick_foky_threads_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error reading saved threads:', e);
    }
    return [createNewThread()];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return threads[0]?.id || '';
  });

  // Active Thread helper
  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0] || createNewThread();

  // Drawers and View Mode
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState<boolean>(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState<boolean>(false);

  // Search History
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Editing Thread Title
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitleVal, setEditingTitleVal] = useState<string>('');

  // Editing User Message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageVal, setEditingMessageVal] = useState<string>('');

  // Input & Audio States
  const [inputVal, setInputVal] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [activeTimerNotice, setActiveTimerNotice] = useState<string | null>(null);

  // Guided Breathing State
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSecondsLeft, setBreathSecondsLeft] = useState<number>(60);
  const [breathPhaseCount, setBreathPhaseCount] = useState<number>(4);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync threads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('focustick_foky_threads_v2', JSON.stringify(threads));
    } catch (e) {
      console.error('Failed to save threads:', e);
    }
  }, [threads]);

  // Scroll to bottom when new message added or window opened
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [activeThreadId, activeThread.messages.length, isOpen, isTyping, isBreathingActive]);

  // Guided Breathing Timer Engine
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let phaseInterval: NodeJS.Timeout | null = null;

    if (isBreathingActive) {
      timer = setInterval(() => {
        setBreathSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsBreathingActive(false);
            speakText("Breathing exercise completed! Your mind is calm and clear.");
            return 60;
          }
          return prev - 1;
        });
      }, 1000);

      phaseInterval = setInterval(() => {
        setBreathPhase((current) => {
          if (current === 'Inhale') return 'Hold';
          if (current === 'Hold') return 'Exhale';
          return 'Inhale';
        });
        setBreathPhaseCount(4);
      }, 4000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (phaseInterval) clearInterval(phaseInterval);
    };
  }, [isBreathingActive]);

  // Countdown timer for 4-second sub-phase
  useEffect(() => {
    let subTimer: NodeJS.Timeout | null = null;
    if (isBreathingActive) {
      subTimer = setInterval(() => {
        setBreathPhaseCount((prev) => (prev > 1 ? prev - 1 : 4));
      }, 1000);
    }
    return () => {
      if (subTimer) clearInterval(subTimer);
    };
  }, [isBreathingActive]);

  // Speech Synthesis Helper
  const speakText = (text: string) => {
    if (!isAudioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\*\*/g, '').replace(/#/g, '').replace(/[*_~`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech Synthesis error:', err);
    }
  };

  // Helper to update active thread's messages
  const updateActiveThreadMessages = (newMsgs: Message[], newTitle?: string) => {
    setThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        let updatedTitle = t.title;
        // Auto-generate title if it's the first real user message
        if (newTitle) {
          updatedTitle = newTitle;
        } else if (t.title === 'New Study Conversation' && newMsgs.length >= 2) {
          const firstUserMsg = newMsgs.find(m => m.sender === 'user');
          if (firstUserMsg) {
            updatedTitle = firstUserMsg.text.length > 28 ? firstUserMsg.text.slice(0, 28) + '...' : firstUserMsg.text;
          }
        }
        return {
          ...t,
          title: updatedTitle,
          messages: newMsgs,
          updatedAt: Date.now()
        };
      }
      return t;
    }));
  };

  // Handle Create New Chat
  const handleCreateNewChat = (mode?: PersonaMode) => {
    playClickSound();
    const newT = createNewThread(mode || activeThread.mode);
    setThreads(prev => [newT, ...prev]);
    setActiveThreadId(newT.id);
    setShowHistoryDrawer(false);
  };

  // Handle Switch Thread
  const handleSelectThread = (threadId: string) => {
    playClickSound();
    setActiveThreadId(threadId);
    setShowHistoryDrawer(false);
  };

  // Handle Delete Thread
  const handleDeleteThread = (threadId: string, e: MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== threadId);
      if (filtered.length === 0) {
        const fresh = createNewThread();
        setActiveThreadId(fresh.id);
        return [fresh];
      }
      if (activeThreadId === threadId) {
        setActiveThreadId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Handle Rename Thread
  const handleSaveThreadTitle = (threadId: string) => {
    if (!editingTitleVal.trim()) return;
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, title: editingTitleVal.trim() } : t));
    setEditingThreadId(null);
    setEditingTitleVal('');
  };

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string, customMsgs?: Message[]) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isTyping) return;

    playClickSound();

    // Trigger 1-minute breathing
    if (text.toLowerCase().includes('breath') || text.toLowerCase().includes('meditat')) {
      setIsBreathingActive(true);
      setBreathSecondsLeft(60);
      setBreathPhase('Inhale');
      setBreathPhaseCount(4);
      setInputVal('');
      speakText("Beginning 60-second mindfulness breathing exercise. Inhale deeply.");
      return;
    }

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentMsgs = customMsgs || activeThread.messages;
    const newMsgs = [...currentMsgs, userMsg];

    updateActiveThreadMessages(newMsgs);
    setInputVal('');
    setIsTyping(true);

    try {
      const payloadMessages = newMsgs.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('/api/foky/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          mode: activeThread.mode,
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || "I'm right here! Let's get back to focused studying.";
      
      const fokyReplyMsg: Message = {
        id: 'foky-' + Date.now(),
        sender: 'foky',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveThreadMessages([...newMsgs, fokyReplyMsg]);
      speakText(replyText);

    } catch (err) {
      console.error('Foky Chat Error:', err);
      const errorMsg: Message = {
        id: 'foky-err-' + Date.now(),
        sender: 'foky',
        text: "I experienced a brief connection blip. ⚡ But don't worry—you can still hit start on your timer and lock in your study focus!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveThreadMessages([...newMsgs, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Edit & Retry User Message
  const handleSaveAndRetryUserMsg = (msgId: string) => {
    if (!editingMessageVal.trim()) return;
    const msgIndex = activeThread.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Truncate messages up to this point
    const truncatedMsgs = activeThread.messages.slice(0, msgIndex);
    const textToResend = editingMessageVal.trim();
    
    setEditingMessageId(null);
    setEditingMessageVal('');

    handleSendMessage(textToResend, truncatedMsgs);
  };

  // Regenerate Last AI Response
  const handleRegenerateLastResponse = () => {
    const lastUserMsgIndex = [...activeThread.messages].reverse().findIndex(m => m.sender === 'user');
    if (lastUserMsgIndex === -1) return;

    const realIndex = activeThread.messages.length - 1 - lastUserMsgIndex;
    const truncatedMsgs = activeThread.messages.slice(0, realIndex);
    const lastUserText = activeThread.messages[realIndex].text;

    handleSendMessage(lastUserText, truncatedMsgs);
  };

  // Toggle Message Pin (Saved Notes)
  const handleTogglePinMessage = (msgId: string) => {
    playClickSound();
    const newMsgs = activeThread.messages.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m);
    updateActiveThreadMessages(newMsgs);
  };

  // Reaction (Like / Dislike)
  const handleReaction = (msgId: string, type: 'liked' | 'disliked') => {
    playClickSound();
    const newMsgs = activeThread.messages.map(m => {
      if (m.id === msgId) {
        const currentR = m.reaction || {};
        return {
          ...m,
          reaction: {
            liked: type === 'liked' ? !currentR.liked : false,
            disliked: type === 'disliked' ? !currentR.disliked : false,
          }
        };
      }
      return m;
    });
    updateActiveThreadMessages(newMsgs);
  };

  // Export Chat Thread Transcript
  const handleExportTranscript = () => {
    playClickSound();
    const textContent = activeThread.messages.map(m => {
      const senderLabel = m.sender === 'user' ? 'User' : 'Foky AI';
      return `[${m.timestamp}] ${senderLabel}:\n${m.text}\n`;
    }).join('\n----------------------------------------\n\n');

    const blob = new Blob([`Foky AI Study Session: ${activeThread.title}\nDate: ${new Date(activeThread.createdAt).toLocaleDateString()}\n\n${textContent}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Foky_${activeThread.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Remote Timer Action Helper
  const handleSetTimerRemote = (minutes: number) => {
    playClickSound();
    const event = new CustomEvent('focustick-set-timer', { detail: { minutes } });
    window.dispatchEvent(event);
    setActiveTimerNotice(`Timer set to ${minutes} mins!`);
    setTimeout(() => setActiveTimerNotice(null), 3000);
  };

  // Copy to Clipboard Helper
  const handleCopyText = (id: string, text: string) => {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAudio = () => {
    playClickSound();
    if (isAudioEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAudioEnabled(prev => !prev);
  };

  // Filter threads for search
  const filteredThreads = threads.filter(t => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    const matchTitle = t.title.toLowerCase().includes(q);
    const matchMsg = t.messages.some(m => m.text.toLowerCase().includes(q));
    return matchTitle || matchMsg;
  });

  // Collect all pinned notes across threads
  const allPinnedNotes = threads.flatMap(t => 
    t.messages.filter(m => m.isPinned).map(m => ({ ...m, threadTitle: t.title }))
  );

  // Render formatted markdown text with clickable timer buttons
  const renderFormattedText = (text: string) => {
    const parts = text.split('\n');
    const minutesFound: number[] = [];
    [10, 15, 25, 45, 50].forEach(m => {
      if (text.includes(`${m}-min`) || text.includes(`${m} min`) || text.includes(`${m}m`) || text.includes(`${m} minutes`)) {
        if (!minutesFound.includes(m)) minutesFound.push(m);
      }
    });

    return (
      <div className="flex flex-col gap-1">
        {parts.map((line, lIdx) => {
          const lineParts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>
              {lineParts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-[#10B981]">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}

        {minutesFound.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-emerald-500/20">
            {minutesFound.map((m) => (
              <button
                key={m}
                onClick={() => handleSetTimerRemote(m)}
                className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#10B981] text-white hover:bg-[#10B981]/90 transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <Zap className="w-3 h-3 fill-current" />
                Set {m}m Timer
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const currentPersona = PERSONA_CONFIGS[activeThread.mode] || PERSONA_CONFIGS.friendly;
  const PersonaIcon = currentPersona.icon;

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (Bottom Right Side - Modern Circle with Distinct Brand Logo) */}
      <div className="fixed bottom-6 right-6 z-40" id="foky-floating-container">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                setIsOpen(true);
              }}
              className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-full shadow-[0_8px_30px_rgb(16,185,129,0.3)] flex items-center justify-center cursor-pointer transition-all duration-300 group ${
                isDarkMode
                  ? 'bg-[#0F172A] border-2 border-[#10B981] hover:border-[#34D399]'
                  : 'bg-[#111111] border-2 border-[#10B981] hover:bg-black'
              }`}
              id="btn-open-foky"
              title="Foky AI - Your Focus Assistant"
            >
              {/* Animated Outer Pulse Ring */}
              <span className="absolute inset-0 rounded-full border-2 border-[#10B981] animate-ping opacity-30 pointer-events-none" />

              {/* Online indicator badge */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#10B981] border-2 border-white dark:border-[#0F172A] items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                </span>
              </span>

              {/* Centered Distinct Brand Logo */}
              <FokyBrandLogo size="lg" className="group-hover:rotate-12 transition-transform duration-300" />

              {/* Floating Tooltip Label on Hover (Desktop) */}
              <span className={`absolute right-full mr-3 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold whitespace-nowrap shadow-xl border opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:flex items-center gap-1.5 ${
                isDarkMode ? 'bg-[#1E293B] text-[#F8FAFC] border-[#334155]' : 'bg-[#111111] text-white border-black'
              }`}>
                <span>Foky AI Companion</span>
                <Sparkles className="w-3 h-3 text-[#10B981]" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* CHAT POPUP WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[88vh] border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 relative ${
              isDarkMode
                ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]'
                : 'bg-white border-[#E6E5DF] text-[#111111]'
            }`}
            id="foky-chat-window"
          >
            {/* Header Bar */}
            <div className={`p-3 px-4 border-b flex items-center justify-between transition-colors z-10 ${
              isDarkMode ? 'border-[#334155] bg-[#0F172A]' : 'border-[#E6E5DF] bg-[#FAF9F6]'
            }`}>
              <div className="flex items-center gap-2">
                {/* History Drawer Toggle Button */}
                <button
                  onClick={() => {
                    playClickSound();
                    setShowHistoryDrawer(prev => !prev);
                    setShowBookmarksDrawer(false);
                    setShowPersonaSelector(false);
                  }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                    showHistoryDrawer
                      ? 'bg-[#10B981] text-white border-[#10B981]'
                      : isDarkMode
                        ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white'
                        : 'bg-white border-[#E6E5DF] text-[#555552] hover:text-black'
                  }`}
                  title="Search & Chat History"
                  id="btn-toggle-history-drawer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold hidden sm:inline">
                    {threads.length}
                  </span>
                </button>

                <div className="flex items-center gap-2 ml-1">
                  <FokyBrandLogo size="md" />
                  <div className="flex flex-col max-w-[140px] sm:max-w-[170px]">
                    <h4 className="text-xs font-bold font-mono tracking-tight truncate flex items-center gap-1">
                      {activeThread.title}
                    </h4>
                    <span className={`text-[9px] font-mono flex items-center gap-1 truncate ${
                      isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                      {currentPersona.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* New Chat Button */}
                <button
                  onClick={() => handleCreateNewChat()}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isDarkMode ? 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]' : 'text-[#8C8B82] hover:text-[#111111] hover:bg-[#E6E5DF]/60'
                  }`}
                  title="New Conversation Thread"
                  id="btn-new-chat"
                >
                  <Plus className="w-4 h-4 text-[#10B981]" />
                </button>

                {/* Saved Bookmarks Button */}
                <button
                  onClick={() => {
                    playClickSound();
                    setShowBookmarksDrawer(prev => !prev);
                    setShowHistoryDrawer(false);
                    setShowPersonaSelector(false);
                  }}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer relative ${
                    showBookmarksDrawer
                      ? 'text-[#10B981] bg-[#10B981]/10'
                      : isDarkMode ? 'text-[#94A3B8] hover:text-[#F8FAFC]' : 'text-[#8C8B82] hover:text-[#111111]'
                  }`}
                  title="Saved Focus Notes & Bookmarks"
                  id="btn-toggle-bookmarks"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {allPinnedNotes.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#10B981]"></span>
                  )}
                </button>

                {/* Audio Toggle */}
                <button
                  onClick={toggleAudio}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isAudioEnabled ? 'text-[#10B981]' : isDarkMode ? 'text-[#64748B]' : 'text-[#8C8B82]'
                  }`}
                  title={isAudioEnabled ? 'Mute audio replies' : 'Enable voice replies'}
                >
                  {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Export Chat */}
                <button
                  onClick={handleExportTranscript}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                  }`}
                  title="Export Chat Transcript"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Close Chat */}
                <button
                  onClick={() => {
                    playClickSound();
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    setIsOpen(false);
                  }}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                  }`}
                  title="Minimize window"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Persona Selector Bar */}
            <div className={`p-2 px-3 border-b flex items-center justify-between text-xs z-10 ${
              isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FAF9F6] border-[#E6E5DF]'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono ${isDarkMode ? 'text-[#64748B]' : 'text-gray-400'}`}>Persona:</span>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowPersonaSelector(prev => !prev);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                    isDarkMode 
                      ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:border-[#10B981]' 
                      : 'bg-white border-[#E6E5DF] text-[#111111] hover:border-[#10B981]'
                  }`}
                >
                  <PersonaIcon className="w-3 h-3 text-[#10B981]" />
                  <span>{currentPersona.label}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSendMessage("⚡ Generate a 2-hour study schedule")}
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white' : 'bg-white border-[#E6E5DF] text-[#555552] hover:text-black'
                  }`}
                >
                  + Schedule
                </button>
                <button
                  onClick={() => {
                    setIsBreathingActive(true);
                    setBreathSecondsLeft(60);
                    setBreathPhase('Inhale');
                    setBreathPhaseCount(4);
                    speakText("Beginning 60-second mindfulness breathing exercise. Inhale deeply.");
                  }}
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white' : 'bg-white border-[#E6E5DF] text-[#555552] hover:text-black'
                  }`}
                >
                  + Breath
                </button>
              </div>
            </div>

            {/* Persona Selector Popover Drawer */}
            <AnimatePresence>
              {showPersonaSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-[82px] left-3 right-3 z-30 p-3 rounded-2xl shadow-2xl border transition-colors ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-white border-[#E6E5DF] text-black'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-500/20">
                    <span className="text-xs font-bold font-mono flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-[#10B981]" /> Select AI Persona Mode
                    </span>
                    <button onClick={() => setShowPersonaSelector(false)} className="text-xs text-gray-400 hover:text-black dark:hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(PERSONA_CONFIGS) as PersonaMode[]).map((modeKey) => {
                      const p = PERSONA_CONFIGS[modeKey];
                      const IconComp = p.icon;
                      const isSelected = activeThread.mode === modeKey;

                      return (
                        <button
                          key={modeKey}
                          onClick={() => {
                            playClickSound();
                            setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, mode: modeKey } : t));
                            setShowPersonaSelector(false);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                            isSelected
                              ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                              : isDarkMode
                                ? 'bg-[#1E293B] border-[#334155] hover:border-[#10B981]/50 text-[#CBD5E1]'
                                : 'bg-[#FAF9F6] border-[#E6E5DF] hover:border-[#10B981]/50 text-[#555552]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono flex items-center gap-1.5">
                              <IconComp className="w-3.5 h-3.5" style={{ color: p.color }} />
                              {p.label}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                          </div>
                          <p className="text-[9.5px] opacity-75 mt-0.5 leading-tight">
                            {p.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HISTORY DRAWER (Conversations List & Search) */}
            <AnimatePresence>
              {showHistoryDrawer && (
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className={`absolute inset-0 top-[45px] z-20 p-4 flex flex-col gap-3 transition-colors ${
                    isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-white text-black'
                  }`}
                >
                  {/* Top Bar inside History Drawer */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#10B981]" />
                      Conversation History
                    </h4>
                    <button
                      onClick={() => handleCreateNewChat()}
                      className="px-2.5 py-1 rounded-lg bg-[#10B981] text-white text-xs font-mono font-bold flex items-center gap-1 hover:bg-[#10B981]/90 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Chat
                    </button>
                  </div>

                  {/* Search History Bar */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FAF9F6] border-[#E6E5DF]'
                  }`}>
                    <Search className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Search past chats or messages..."
                      className="w-full text-xs bg-transparent outline-none"
                    />
                    {historySearchQuery && (
                      <button onClick={() => setHistorySearchQuery('')} className="text-gray-400 hover:text-black dark:hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* List of Threads */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                    {filteredThreads.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 font-mono">
                        No matching conversations found.
                      </div>
                    ) : (
                      filteredThreads.map((thread) => {
                        const isSelected = thread.id === activeThreadId;
                        const isEditingThis = editingThreadId === thread.id;

                        return (
                          <div
                            key={thread.id}
                            onClick={() => handleSelectThread(thread.id)}
                            className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-center justify-between group ${
                              isSelected
                                ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                                : isDarkMode
                                  ? 'bg-[#1E293B] border-[#334155] hover:border-[#10B981]/50 text-white'
                                  : 'bg-[#FAF9F6] border-[#E6E5DF] hover:border-[#10B981]/50 text-black'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />

                              {isEditingThis ? (
                                <input
                                  type="text"
                                  value={editingTitleVal}
                                  onChange={(e) => setEditingTitleVal(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveThreadTitle(thread.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs px-2 py-1 rounded bg-black/20 outline-none border border-[#10B981] flex-1 text-white"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex flex-col min-w-0">
                                  <span className="font-mono font-bold truncate">
                                    {thread.title}
                                  </span>
                                  <span className={`text-[9px] font-mono ${isDarkMode ? 'text-[#64748B]' : 'text-gray-400'}`}>
                                    {new Date(thread.updatedAt).toLocaleDateString()} • {thread.messages.length} msgs
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isEditingThis ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveThreadTitle(thread.id);
                                  }}
                                  className="p-1 text-[#10B981]"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingThreadId(thread.id);
                                    setEditingTitleVal(thread.title);
                                  }}
                                  className="p-1 hover:text-[#10B981]"
                                  title="Rename thread"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                onClick={(e) => handleDeleteThread(thread.id, e)}
                                className="p-1 hover:text-red-500"
                                title="Delete thread"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOOKMARKS / SAVED NOTES DRAWER */}
            <AnimatePresence>
              {showBookmarksDrawer && (
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className={`absolute inset-0 top-[45px] z-20 p-4 flex flex-col gap-3 transition-colors ${
                    isDarkMode ? 'bg-[#0F172A] text-white' : 'bg-white text-black'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-500/20">
                    <h4 className="text-xs font-bold font-mono flex items-center gap-1.5">
                      <Bookmark className="w-4 h-4 text-[#10B981]" />
                      Saved Notes & Bookmarks ({allPinnedNotes.length})
                    </h4>
                    <button
                      onClick={() => setShowBookmarksDrawer(false)}
                      className="text-xs text-gray-400 hover:text-black dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                    {allPinnedNotes.length === 0 ? (
                      <div className="text-center py-12 text-xs text-gray-400 font-mono">
                        No saved notes yet. Click the bookmark icon on any AI reply to pin key study tips here!
                      </div>
                    ) : (
                      allPinnedNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                            isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FAF9F6] border-[#E6E5DF]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9.5px] font-mono text-[#10B981]">
                            <span>From: {note.threadTitle}</span>
                            <button
                              onClick={() => handleTogglePinMessage(note.id)}
                              className="hover:text-red-500"
                              title="Unpin note"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="leading-relaxed">
                            {renderFormattedText(note.text)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remote Timer Active Notice Banner */}
            <AnimatePresence>
              {activeTimerNotice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#10B981] text-white text-[10.5px] font-mono font-bold px-3 py-1.5 flex items-center justify-between z-10"
                >
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {activeTimerNotice}
                  </span>
                  <span className="text-[9px] underline">Workspace Updated</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interactive Mindful Breathing Card */}
            <AnimatePresence>
              {isBreathingActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 border-b flex flex-col items-center justify-center text-center relative z-10 ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FAF9F6] border-[#E6E5DF]'
                  }`}
                >
                  <button
                    onClick={() => setIsBreathingActive(false)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#10B981] font-bold mb-2">
                    Mindful Reset ({breathSecondsLeft}s left)
                  </span>

                  <motion.div
                    animate={{
                      scale: breathPhase === 'Inhale' ? 1.35 : breathPhase === 'Hold' ? 1.35 : 0.85,
                      opacity: breathPhase === 'Inhale' ? 1 : 0.8,
                    }}
                    transition={{ duration: 4, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#059669] to-[#34D399] flex items-center justify-center text-white my-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    <HeartPulse className="w-8 h-8 stroke-[1.5]" />
                  </motion.div>

                  <h5 className="text-sm font-bold font-mono text-[#10B981]">
                    {breathPhase}... <span className="text-xs font-normal">({breathPhaseCount}s)</span>
                  </h5>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-[#94A3B8]' : 'text-gray-500'}`}>
                    {breathPhase === 'Inhale' && 'Breathe in slowly through your nose...'}
                    {breathPhase === 'Hold' && 'Hold your breath gently and stay present...'}
                    {breathPhase === 'Exhale' && 'Release slowly through your mouth...'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Messages Container */}
            <div className={`flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar ${
              isDarkMode ? 'bg-[#0F172A]/50' : 'bg-[#FAF9F6]/40'
            }`}>
              {activeThread.messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                const isEditingThisMsg = editingMessageId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2 max-w-[88%] ${
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isUser && <FokyBrandLogo size="sm" className="mt-0.5" />}

                    <div className="flex flex-col group relative">
                      {isEditingThisMsg ? (
                        <div className="p-2 rounded-xl bg-black/20 border border-[#10B981] flex flex-col gap-1.5 w-full">
                          <textarea
                            value={editingMessageVal}
                            onChange={(e) => setEditingMessageVal(e.target.value)}
                            className="text-xs bg-transparent outline-none resize-none p-1 text-white w-full h-16"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-0.5 text-[10px] text-gray-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveAndRetryUserMsg(msg.id)}
                              className="px-2 py-0.5 text-[10px] bg-[#10B981] text-white rounded font-mono font-bold"
                            >
                              Save & Resend
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed transition-all ${
                            isUser
                              ? 'bg-[#10B981] text-white rounded-tr-xs shadow-xs'
                              : isDarkMode
                                ? 'bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-tl-xs shadow-2xs'
                                : 'bg-white border border-[#E6E5DF] text-[#111111] rounded-tl-xs shadow-2xs'
                          }`}
                        >
                          {renderFormattedText(msg.text)}
                        </div>
                      )}

                      {/* Message Actions Bar */}
                      <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[8.5px] font-mono ${
                          isDarkMode ? 'text-[#64748B]' : 'text-[#A1A096]'
                        }`}>
                          {msg.timestamp}
                        </span>

                        {isUser && !isEditingThisMsg && (
                          <button
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingMessageVal(msg.text);
                            }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer ${
                              isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                            }`}
                            title="Edit & Resend prompt"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}

                        {!isUser && (
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Copy text */}
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className={`p-0.5 rounded cursor-pointer ${
                                isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                              }`}
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-2.5 h-2.5 text-[#10B981]" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>

                            {/* Audio Speak */}
                            <button
                              onClick={() => speakText(msg.text)}
                              className={`p-0.5 rounded cursor-pointer ${
                                isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                              }`}
                              title="Speak response"
                            >
                              <Volume2 className="w-2.5 h-2.5" />
                            </button>

                            {/* Bookmark / Pin */}
                            <button
                              onClick={() => handleTogglePinMessage(msg.id)}
                              className={`p-0.5 rounded cursor-pointer ${
                                msg.isPinned ? 'text-[#10B981]' : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                              }`}
                              title={msg.isPinned ? 'Unpin note' : 'Pin to Saved Notes'}
                            >
                              {msg.isPinned ? <BookmarkCheck className="w-2.5 h-2.5 text-[#10B981]" /> : <Bookmark className="w-2.5 h-2.5" />}
                            </button>

                            {/* Like Reaction */}
                            <button
                              onClick={() => handleReaction(msg.id, 'liked')}
                              className={`p-0.5 rounded cursor-pointer ${
                                msg.reaction?.liked ? 'text-[#10B981]' : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                              }`}
                              title="Helpful reply"
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                            </button>

                            {/* Dislike Reaction */}
                            <button
                              onClick={() => handleReaction(msg.id, 'disliked')}
                              className={`p-0.5 rounded cursor-pointer ${
                                msg.reaction?.disliked ? 'text-red-500' : isDarkMode ? 'text-[#94A3B8] hover:text-white' : 'text-[#8C8B82] hover:text-black'
                              }`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-2.5 h-2.5" />
                            </button>

                            {/* Regenerate AI reply (if this is the last AI message) */}
                            {index === activeThread.messages.length - 1 && (
                              <button
                                onClick={handleRegenerateLastResponse}
                                className={`p-0.5 rounded cursor-pointer hover:text-[#10B981] ${
                                  isDarkMode ? 'text-[#94A3B8]' : 'text-[#8C8B82]'
                                }`}
                                title="Regenerate AI response"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mr-auto"
                >
                  <FokyBrandLogo size="sm" />
                  <div className={`p-2.5 px-3.5 rounded-2xl rounded-tl-xs text-xs font-mono flex items-center gap-1.5 border ${
                    isDarkMode 
                      ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8]' 
                      : 'bg-white border-[#E6E5DF] text-[#8C8B82]'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[10px] ml-1">Foky is formulating a response...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Starter Prompts (Shown if <= 2 messages) */}
            {activeThread.messages.length <= 2 && (
              <div className={`p-2.5 border-t flex flex-wrap gap-1.5 ${
                isDarkMode ? 'border-[#334155] bg-[#0F172A]' : 'border-[#E6E5DF] bg-[#FAF9F6]'
              }`}>
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all cursor-pointer truncate max-w-full text-left ${
                      isDarkMode
                        ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:border-[#10B981] hover:text-white'
                        : 'bg-white border-[#E6E5DF] text-[#555552] hover:border-[#10B981] hover:text-black'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className={`p-3 border-t flex items-center gap-2 transition-colors ${
                isDarkMode ? 'border-[#334155] bg-[#1E293B]' : 'border-[#E6E5DF] bg-white'
              }`}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask Foky about schedules, study goals..."
                disabled={isTyping}
                className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl outline-none border transition-colors ${
                  isDarkMode
                    ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#10B981]'
                    : 'bg-[#FAF9F6] border-[#E6E5DF] text-[#111111] placeholder:text-[#8C8B82] focus:border-[#10B981]'
                }`}
                id="foky-input-field"
              />

              <button
                type="submit"
                disabled={!inputVal.trim() || isTyping}
                className={`p-2.5 rounded-xl text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  inputVal.trim() ? 'bg-[#10B981] hover:bg-[#10B981]/90 shadow-2xs' : 'bg-[#10B981]/50'
                }`}
                id="btn-send-foky-msg"
                title="Send message to Foky"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
