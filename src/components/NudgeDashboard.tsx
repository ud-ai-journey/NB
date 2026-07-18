import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  Target, 
  Plus, 
  TrendingUp, 
  AlertOctagon, 
  Smile, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Trash2,
  Volume2,
  RefreshCw,
  Bell
} from 'lucide-react';
import { Habit, UrgeLog } from '../types';
import VoiceSOS from './VoiceSOS';

interface NudgeDashboardProps {
  habits: Habit[];
  onAddHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  activeHabit: Habit | null;
  onSelectActive: (habit: Habit) => void;
  logs: UrgeLog[];
}

interface SOSData {
  headline: string;
  steps: string[];
  reframe: string;
}

export default function NudgeDashboard({
  habits,
  onAddHabit,
  onDeleteHabit,
  activeHabit,
  onSelectActive,
  logs
}: NudgeDashboardProps) {
  // Habit Add Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'screen-time' | 'substance' | 'physical' | 'dietary' | 'mental' | 'other'>('screen-time');
  const [newCurrent, setNewCurrent] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState('times');

  // SOS state
  const [showSOS, setShowSOS] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosData, setSosData] = useState<SOSData | null>(null);
  
  // Metronome breathing state
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)'>('Inhale');
  const [breathTimer, setBreathTimer] = useState(4);

  // Proactive Notifications States
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [scheduledAlertsEnabled, setScheduledAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('habit_breaker_scheduled_alerts') === 'true';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<{ riskHour: string | null; count: number }>({ riskHour: null, count: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Calculate high risk craving hours from logs
  useEffect(() => {
    if (!logs || logs.length === 0) {
      setRiskAnalysis({ riskHour: null, count: 0 });
      return;
    }
    const hourCounts: { [key: number]: number } = {};
    logs.forEach(log => {
      try {
        const date = new Date(log.timestamp);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    let maxHour: string | null = null;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = hour;
      }
    });

    if (maxHour !== null) {
      const hInt = parseInt(maxHour);
      const ampm = hInt >= 12 ? 'PM' : 'AM';
      const formattedHour = `${hInt % 12 || 12}:00 ${ampm}`;
      setRiskAnalysis({ riskHour: formattedHour, count: maxCount });
    } else {
      setRiskAnalysis({ riskHour: null, count: 0 });
    }
  }, [logs]);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast("❌ System notifications not supported in this browser.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      showToast("🔔 System notifications enabled! Alerts are now active.");
    }
  };

  const testProactiveNudge = () => {
    const defaultMessages = [
      "Breathe through this moment. An urge lasts only 15 minutes on average. Surf it!",
      "PAUSE: What emotion are you feeling right now? Is it loneliness, stress, or just a routine trigger?",
      "Take a deep breath. Let's do a 4-7-8 breathing sequence before you take any action.",
      "A habit loop can be interrupted by shifting your physical space. Step away for 2 minutes!"
    ];
    const activeMsg = nudge && nudge !== 'Select a habit below to load custom AI coaching insights.' 
      ? nudge 
      : defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification("Habit Breaker Coach 🧘", {
          body: activeMsg,
        });
      } catch (err) {
        console.error("Failed to show system notification:", err);
      }
    }

    showToast(`🔔 PROACTIVE NUDGE: ${activeMsg}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // Dynamic Daily Nudge state
  const [nudge, setNudge] = useState<string>('Select a habit below to load custom AI coaching insights.');
  const [nudgeLoading, setNudgeLoading] = useState(false);

  // Metronome animation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showSOS) {
      interval = setInterval(() => {
        setBreathTimer((prev) => {
          if (prev <= 1) {
            // Move to next state
            setBreathState((currentState) => {
              switch (currentState) {
                case 'Inhale': return 'Hold (Full)';
                case 'Hold (Full)': return 'Exhale';
                case 'Exhale': return 'Hold (Empty)';
                case 'Hold (Empty)': return 'Inhale';
              }
            });
            return 4; // Reset to 4 seconds
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showSOS]);

  // Fetch dynamic nudge from Gemini based on the selected habit
  useEffect(() => {
    if (!activeHabit) {
      setNudge('Select a habit below to load custom AI coaching insights.');
      return;
    }

    const fetchNudge = async () => {
      setNudgeLoading(true);
      try {
        const response = await fetch('/api/coaching/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              text: `Give me a single, highly actionable, inspiring, 1-sentence cognitive tip (under 30 words) to help me stay strong on my habit goal of reducing "${activeHabit.name}". No other conversational intro, just the tip.`
            }],
            habitContext: {
              name: activeHabit.name,
              category: activeHabit.category,
              targetGoal: activeHabit.targetGoal
            },
            recentLogs: logs
          })
        });

        if (response.ok) {
          const data = await response.json();
          setNudge(data.text || "Your daily strength comes from standard routine replacement. Stay strong!");
        } else {
          setNudge("Consistency rewires pathways. You are stronger than your habit loop!");
        }
      } catch (err) {
        setNudge("Cravings are just thoughts. They will peak and they will pass.");
      } finally {
        setNudgeLoading(false);
      }
    };

    fetchNudge();
  }, [activeHabit]);

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      name: newName,
      category: newCategory,
      startDate: new Date().toISOString().split('T')[0],
      currentLevel: newCurrent || 'Not specified',
      targetGoal: newTarget || 'None',
      unit: newUnit,
      streakDays: 1,
      lastActive: new Date().toISOString()
    };

    onAddHabit(habit);
    setNewName('');
    setNewCurrent('');
    setNewTarget('');
    setShowAddForm(false);
  };

  const triggerSOS = async () => {
    if (!activeHabit) {
      alert("Please select or add an active habit first to launch the Emergency SOS Surfer.");
      return;
    }

    setShowSOS(true);
    setSosLoading(true);
    setSosData(null);

    // Filter recent urges to feed current intensity/trigger state to the metronome
    const lastUrge = logs.filter(l => l.habitName === activeHabit.name).slice(-1)[0];

    try {
      const response = await fetch('/api/coaching/quick-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intensity: lastUrge?.intensity || 7,
          trigger: lastUrge?.trigger || "Sudden Craving Spike",
          context: lastUrge?.situation || "In daily environment",
          habitName: activeHabit.name
        })
      });

      if (!response.ok) throw new Error('SOS generation failed');
      const data = await response.json();
      setSosData(data);
    } catch (e) {
      setSosData({
        headline: "Take a deep breath. Cravings are wave crests.",
        steps: [
          "Breathe in slowly for 4 seconds, feeling your chest expand.",
          "Hold that breath for 4 seconds, letting yourself feel present.",
          "Release the air for 4 seconds, pushing out all tension."
        ],
        reframe: "Your urge is a temporary chemical spike in the brain. It peaks at 5-10 minutes. If you surf this wave, it will dissolve."
      });
    } finally {
      setSosLoading(false);
    }
  };

  const handleIncrementStreak = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting as active if they just click the streak fire
    const updatedHabits = habits.map(h => {
      if (h.id === id) {
        return {
          ...h,
          streakDays: h.streakDays + 1,
          lastActive: new Date().toISOString()
        };
      }
      return h;
    });
    // Write back
    localStorage.setItem('habit_breaker_habits', JSON.stringify(updatedHabits));
    window.location.reload(); // Refresh local state smoothly
  };

  return (
    <div id="nudge-dashboard-root" className="space-y-8">
      
      {/* Dynamic Toast System */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm bg-gradient-to-r from-indigo-950 to-[#141518] border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl flex items-start gap-3.5"
          >
            <div className="w-8 h-8 bg-indigo-550/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
              <Zap className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Coach Alert</h4>
              <p className="text-white text-xs leading-relaxed">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)} 
              className="text-gray-500 hover:text-white text-xs font-bold font-mono ml-auto cursor-pointer"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic AI Intelligent Nudge Banner */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-[#141518] border border-indigo-500/20 rounded-[32px] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-bold flex-shrink-0">
            AI
          </div>
          <div className="space-y-1">
            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/20">
              Adaptive Nudge Coach
            </span>
            <div className="text-slate-200 text-sm md:text-base font-medium leading-relaxed mt-2 max-w-2xl">
              {nudgeLoading ? (
                <span className="text-slate-500 flex items-center gap-2 font-mono text-xs">
                  <Clock className="w-4 h-4 animate-spin text-indigo-400" /> Analyzing real-time triggers & adapting...
                </span>
              ) : (
                <span className="italic">"{nudge}"</span>
              )}
            </div>
          </div>
        </div>

        {activeHabit && (
          <button
            onClick={triggerSOS}
            className="z-10 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-red-600/15 hover:shadow-red-600/30 transition-all cursor-pointer flex-shrink-0 border border-red-500/30"
          >
            <AlertOctagon className="w-4 h-4" />
            SOS Craving Metronome
          </button>
        )}
        <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-indigo-500/5 rounded-full filter blur-xl"></div>
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141518] border border-gray-800 p-6 rounded-[24px] flex items-center gap-4 hover:border-gray-700/85 transition-colors">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Streak</span>
            <span className="text-xl font-black font-mono text-white">{activeHabit?.streakDays || 0} days</span>
          </div>
        </div>

        <div className="bg-[#141518] border border-gray-800 p-6 rounded-[24px] flex items-center gap-4 hover:border-gray-700/85 transition-colors">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Habits</span>
            <span className="text-xl font-black font-mono text-white">{habits.length}</span>
          </div>
        </div>

        <div className="bg-[#141518] border border-gray-800 p-6 rounded-[24px] flex items-center gap-4 hover:border-gray-700/85 transition-colors">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Cravings</span>
            <span className="text-xl font-black font-mono text-white">{logs.length}</span>
          </div>
        </div>

        <div className="bg-[#141518] border border-gray-800 p-6 rounded-[24px] flex items-center gap-4 hover:border-gray-700/85 transition-colors">
          <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Resisted</span>
            <span className="text-xl font-black font-mono text-white">
              {logs.filter(l => l.handled === 'surfed' || l.handled === 'resisted').length} times
            </span>
          </div>
        </div>
      </div>

      {/* PROACTIVE NUDGE CENTER */}
      <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">Proactive Alert Engine</h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time Web Notification API & CBT nudges</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {permission === 'default' && (
              <button
                onClick={requestNotificationPermission}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer border border-indigo-500/25"
              >
                Enable Notifications
              </button>
            )}
            {permission === 'granted' && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl">
                ● System Active
              </span>
            )}
            {permission === 'denied' && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl" title="Unblock permissions in browser address bar to test system notifications">
                ⚠️ Blocked in Browser
              </span>
            )}

            <button
              onClick={testProactiveNudge}
              className="bg-gray-805 hover:bg-gray-800 text-gray-200 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer border border-gray-700 flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Simulate Nudge
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#0A0B0E] border border-gray-850 p-5 rounded-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Scheduled Nudge Model</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Daily Adaptive Triggers</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={scheduledAlertsEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setScheduledAlertsEnabled(enabled);
                    localStorage.setItem('habit_breaker_scheduled_alerts', String(enabled));
                    showToast(enabled ? "🔔 Scheduled alerts enabled. We will monitor your behavior times." : "❌ Scheduled alerts paused.");
                  }}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">Runs in-background during your session to prompt your cognitive reframing.</p>
          </div>

          <div className="bg-[#0A0B0E] border border-gray-850 p-5 rounded-2xl space-y-2 col-span-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Risk Analysis (Craving Heatmap Output)</span>
            {riskAnalysis.riskHour ? (
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-indigo-400 font-mono">{riskAnalysis.riskHour}</span>
                <span className="text-gray-600">|</span>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Based on <strong className="text-white font-semibold font-mono">{riskAnalysis.count} logs</strong>, your cravings spike at this hour. We have calibrated proactive alerts to prompt you 15 minutes before this window.
                </p>
              </div>
            ) : (
              <div className="text-xs text-gray-500 leading-relaxed italic flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                No craving trends analyzed yet. Add entries to the Urge Tracker to calculate your peak risk hour!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HABIT TRACKING AND MANAGER */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141518]/30 p-5 rounded-[24px] border border-gray-800/40">
          <div>
            <h3 className="text-lg font-display font-bold text-white">Target Behavior Goals</h3>
            <p className="text-xs text-gray-400">Click a card to activate real-time CBT coaching for that behavior</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-indigo-500/20 shadow-md shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            Create Behavior Target
          </button>
        </div>

        {/* Add Habit Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141518] border border-gray-800 p-6 rounded-[24px] space-y-4 shadow-xl"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Create New Habit Goal</h4>
            <form onSubmit={handleCreateHabit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Habit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nicotine Vaping"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                >
                  <option value="screen-time">Screen Time</option>
                  <option value="substance">Nicotine/Substance</option>
                  <option value="dietary">Sugar/Dietary</option>
                  <option value="physical">Physical/Nervous Action</option>
                  <option value="mental">Procrastination/Mental</option>
                  <option value="other">Other behavioral</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Current Daily Usage</label>
                <input
                  type="text"
                  placeholder="e.g. 4 hours, 10 times"
                  value={newCurrent}
                  onChange={(e) => setNewCurrent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Target Threshold Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Under 1 hour, Complete stop"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">Unit of Measurement</label>
                <input
                  type="text"
                  placeholder="e.g. hours, cigarettes, times"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Save Habit Goal
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Habits Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {habits.length === 0 ? (
            <div className="col-span-2 py-12 text-center border border-dashed border-gray-800 rounded-[24px] text-gray-500 text-xs bg-[#141518]/20">
              No habits created. Add your first habit goal above to start rewiring!
            </div>
          ) : (
            habits.map((habit) => {
              const isActive = activeHabit?.id === habit.id;
              return (
                <div
                  key={habit.id}
                  onClick={() => onSelectActive(habit)}
                  className={`border p-6 flex items-start justify-between gap-4 transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-br from-indigo-950/25 to-[#141518] border-indigo-500 rounded-[24px] shadow-xl shadow-indigo-500/5' 
                      : 'bg-[#141518] border-gray-800 rounded-[24px] hover:border-gray-700/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        habit.category === 'screen-time' ? 'bg-indigo-400' :
                        habit.category === 'substance' ? 'bg-red-400' :
                        habit.category === 'dietary' ? 'bg-amber-400' : 'bg-purple-400'
                      }`}></span>
                      <h4 className="font-display font-extrabold text-white text-sm md:text-base">{habit.name}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                      <div>Current: <strong className="text-gray-200">{habit.currentLevel}</strong></div>
                      <div>Target: <strong className="text-gray-200">{habit.targetGoal}</strong></div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                      <span>Started {habit.startDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <button
                      onClick={(e) => handleIncrementStreak(habit.id, e)}
                      title="Completed daily reduction checklist! Click to increment daily streak."
                      className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-all cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {habit.streakDays}d
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete the habit "${habit.name}"?`)) {
                          onDeleteHabit(habit.id);
                        }
                      }}
                      className="text-gray-600 hover:text-red-400 p-1.5 rounded hover:bg-gray-900/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* URGE SURFER SOS OVERLAY MODAL */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#141518] border border-gray-800 max-w-xl w-full rounded-[32px] p-8 md:p-10 space-y-6 shadow-2xl relative"
            >
              {/* Back to safety button */}
              <button
                onClick={() => setShowSOS(false)}
                className="absolute top-6 right-6 text-xs font-semibold text-gray-400 hover:text-white bg-[#0A0B0E] px-3.5 py-1.5 rounded-full border border-gray-800 hover:border-gray-750 transition-colors cursor-pointer"
              >
                Close SOS
              </button>

              <div className="text-center space-y-2 border-b border-slate-850 pb-5">
                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold rounded-full uppercase tracking-widest">
                  SOS Urge Surfing Metronome
                </span>
                <h3 className="text-xl md:text-2xl font-display font-bold text-slate-100 pt-2">
                  {sosLoading ? "Contacting your emergency clinical coach..." : sosData?.headline}
                </h3>
              </div>

              {/* Dynamic metronome graphic */}
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                {/* Breathing ball */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: breathState === 'Inhale' ? 1.6 : 
                             breathState === 'Hold (Full)' ? 1.6 :
                             breathState === 'Exhale' ? 1 : 1
                    }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="absolute inset-0 bg-violet-600/15 border-2 border-violet-500/40 rounded-full"
                  />
                  <div className="z-10 text-center space-y-1">
                    <span className="text-2xl font-display font-bold text-slate-100 block">{breathState}</span>
                    <span className="text-xs text-slate-400 font-mono">Next change in: <strong>{breathTimer}s</strong></span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-wider text-center max-w-[280px]">
                  Match your breathing rate with the expanding bubble.
                </p>
              </div>

              {/* Live voice coaching option (Vapi) */}
              {activeHabit && !sosLoading && (
                <VoiceSOS
                  habitName={activeHabit.name}
                  trigger={logs.filter(l => l.habitName === activeHabit.name).slice(-1)[0]?.trigger}
                  intensity={logs.filter(l => l.habitName === activeHabit.name).slice(-1)[0]?.intensity}
                />
              )}

              {/* Steps and Reframe */}
              {sosLoading ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Analyzing last recorded urge to build custom grounding protocol...</p>
                </div>
              ) : (
                sosData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Urge surfing steps */}
                    <div className="space-y-3 bg-[#0A0B0E]/60 border border-gray-800 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Grounding Exercise Steps</h4>
                      <ol className="space-y-2.5 text-xs md:text-sm text-gray-300 leading-relaxed">
                        {sosData.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-2.5">
                            <span className="font-mono font-bold text-indigo-400">{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Cognitive reframe */}
                    <div className="p-4 bg-indigo-950/15 border-l-4 border-indigo-500 text-gray-200 text-xs md:text-sm rounded-r-xl leading-relaxed italic">
                      "{sosData.reframe}"
                    </div>
                  </motion.div>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
