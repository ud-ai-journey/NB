import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  LayoutDashboard, 
  Brain, 
  TrendingUp, 
  Bot, 
  CalendarRange, 
  Target, 
  Flame, 
  ShieldAlert 
} from 'lucide-react';
import { Habit, UrgeLog, ActionPlan } from './types';
import NudgeDashboard from './components/NudgeDashboard';
import PlanGenerator from './components/PlanGenerator';
import UrgeTracker from './components/UrgeTracker';
import CoachingChat from './components/CoachingChat';
import DailyReflection from './components/DailyReflection';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plan' | 'tracker' | 'chat' | 'reflection'>('dashboard');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<UrgeLog[]>([]);
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    // 1. Habits
    const savedHabits = localStorage.getItem('habit_breaker_habits');
    let loadedHabits: Habit[] = [];
    if (savedHabits) {
      try {
        loadedHabits = JSON.parse(savedHabits);
        setHabits(loadedHabits);
      } catch (e) {
        console.error('Error loading habits', e);
      }
    } else {
      // Create a gentle starter habit so the user isn't immediately faced with an empty screen
      const starterHabit: Habit = {
        id: 'starter_screen',
        name: 'Excessive App Scrolling',
        category: 'screen-time',
        startDate: new Date().toISOString().split('T')[0],
        currentLevel: '4 hours/day',
        targetGoal: 'Under 1 hour/day',
        unit: 'hours',
        streakDays: 1,
        lastActive: new Date().toISOString()
      };
      loadedHabits = [starterHabit];
      setHabits(loadedHabits);
      localStorage.setItem('habit_breaker_habits', JSON.stringify(loadedHabits));
    }

    // 2. Active Habit
    const savedActiveId = localStorage.getItem('habit_breaker_active_id');
    if (savedActiveId && loadedHabits.some(h => h.id === savedActiveId)) {
      const match = loadedHabits.find(h => h.id === savedActiveId) || null;
      setActiveHabit(match);
    } else if (loadedHabits.length > 0) {
      setActiveHabit(loadedHabits[0]);
      localStorage.setItem('habit_breaker_active_id', loadedHabits[0].id);
    }

    // 3. Urge Logs
    const savedLogs = localStorage.getItem('habit_breaker_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Error loading logs', e);
      }
    }
  }, []);

  // Update active plan when activeHabit changes
  useEffect(() => {
    if (activeHabit) {
      const savedPlan = localStorage.getItem(`habit_plan_${activeHabit.name}`);
      if (savedPlan) {
        try {
          setActivePlan(JSON.parse(savedPlan));
        } catch (e) {
          setActivePlan(null);
        }
      } else {
        setActivePlan(null);
      }
    } else {
      setActivePlan(null);
    }
  }, [activeHabit]);

  // Handle setting active habit
  const handleSelectActive = (habit: Habit) => {
    setActiveHabit(habit);
    localStorage.setItem('habit_breaker_active_id', habit.id);
  };

  // Handle adding a new habit
  const handleAddHabit = (habit: Habit) => {
    const updated = [...habits, habit];
    setHabits(updated);
    localStorage.setItem('habit_breaker_habits', JSON.stringify(updated));
    handleSelectActive(habit);
  };

  // Handle deleting a habit
  const handleDeleteHabit = (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    localStorage.setItem('habit_breaker_habits', JSON.stringify(updated));
    
    if (activeHabit?.id === id) {
      if (updated.length > 0) {
        handleSelectActive(updated[0]);
      } else {
        setActiveHabit(null);
        localStorage.removeItem('habit_breaker_active_id');
      }
    }
  };

  // Handle adding a craving/urge log
  const handleAddLog = (log: UrgeLog) => {
    const updated = [log, ...logs];
    setLogs(updated);
    localStorage.setItem('habit_breaker_logs', JSON.stringify(updated));
  };

  // Handle plan generated
  const handlePlanGenerated = (plan: ActionPlan) => {
    setActivePlan(plan);
  };

  return (
    <div id="app-wrapper" className="min-h-screen flex flex-col bg-[#0A0B0E] font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* GLOBAL TOP HEADER */}
      <header className="border-b border-gray-800/50 bg-[#0A0B0E]/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-400/30 shadow-lg shadow-emerald-600/20">
              <Flame className="w-5 h-5 text-slate-100 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                Breaking Bad <span className="text-emerald-400 font-normal text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">AI</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                Cognitive Habit Reprogramming
              </p>
            </div>
          </div>

          {/* AI Engines Dual-Failover Badge & Active Habit */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2 text-xs">
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-mono text-[11px]">
                Engine: <strong className="text-emerald-100">Gemini/OpenAI Failover Active</strong>
              </span>
            </div>

            {activeHabit && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-[#141518] border border-gray-800 rounded-2xl px-4 py-2 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-gray-400">Focusing on:</span>
                  <span className="text-white font-bold">{activeHabit.name}</span>
                </div>
                <span className="text-gray-800">|</span>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                  <span className="text-white font-bold font-mono">{activeHabit.streakDays}d streak</span>
                </div>
              </motion.div>
            )}
          </div>

        </div>
      </header>

      {/* GLOBAL NAVIGATION TABS (Bento Capsule Design) */}
      <nav className="bg-[#0A0B0E]/80 border-b border-gray-800/30 py-3.5 px-4 overflow-x-auto scrollbar-none sticky top-[73px] z-30">
        <div className="max-w-2xl mx-auto bg-[#141518] border border-gray-800/90 rounded-full p-1.5 flex items-center justify-between gap-1">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">CBT Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Cravings</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Coach</span>
          </button>

          <button
            onClick={() => setActiveTab('reflection')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'reflection'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span className="hidden sm:inline">Daily</span>
          </button>

        </div>
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* Render respective tab based on selection */}
        {activeTab === 'dashboard' && (
          <NudgeDashboard 
            habits={habits}
            onAddHabit={handleAddHabit}
            onDeleteHabit={handleDeleteHabit}
            activeHabit={activeHabit}
            onSelectActive={handleSelectActive}
            logs={logs}
          />
        )}

        {activeTab === 'plan' && (
          <PlanGenerator 
            activePlan={activePlan}
            onPlanGenerated={handlePlanGenerated}
            currentHabitName={activeHabit?.name}
            logs={logs}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'tracker' && (
          <UrgeTracker 
            logs={logs}
            onAddLog={handleAddLog}
            activeHabitName={activeHabit?.name}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'chat' && (
          <CoachingChat 
            activeHabit={activeHabit}
            logs={logs}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'reflection' && (
          <DailyReflection 
            currentHabits={habits}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

      </main>

      {/* humbler static credit lines */}
      <footer className="border-t border-slate-900 py-6 px-4 bg-slate-950 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Breaking Bad AI Habit Coach</span>
          <span>Cognitive Behavioral Therapy (CBT) & Habit Loops Reprogramming</span>
        </div>
      </footer>

    </div>
  );
}
