import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, Sparkles, ChevronRight, CheckCircle2, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { ActionPlan } from '../types';

interface PlanGeneratorProps {
  onPlanGenerated: (plan: ActionPlan) => void;
  activePlan: ActionPlan | null;
  currentHabitName?: string;
  logs: any[];
}

export default function PlanGenerator({ onPlanGenerated, activePlan, currentHabitName, logs }: PlanGeneratorProps) {
  const [habitName, setHabitName] = useState(currentHabitName || '');
  const [category, setCategory] = useState<'screen-time' | 'substance' | 'physical' | 'dietary' | 'mental' | 'other'>('screen-time');
  const [currentLevel, setCurrentLevel] = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [triggers, setTriggers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentHabitName) {
      setHabitName(currentHabitName);
    }
  }, [currentHabitName]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) {
      setError('Please provide a habit name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coaching/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitName,
          category,
          currentLevel,
          targetGoal,
          triggers,
          recentLogs: logs,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate plan');
      }

      const plan: ActionPlan = await response.json();
      plan.id = Date.now().toString();
      plan.habitName = habitName;

      // Save to localStorage
      localStorage.setItem(`habit_plan_${habitName}`, JSON.stringify(plan));
      onPlanGenerated(plan);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while contacting the coach.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (activePlan) {
      if (confirm('Are you sure you want to generate a new action plan? This will replace your current plan.')) {
        localStorage.removeItem(`habit_plan_${activePlan.habitName}`);
        onPlanGenerated(null as any);
      }
    }
  };

  return (
    <div id="plan-generator-container" className="space-y-8">
      {/* If an active plan exists, show the plan with an option to rebuild */}
      {activePlan ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 md:p-10 space-y-8 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/60 pb-6">
            <div>
              <span className="px-3.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-full uppercase tracking-widest">
                Active CBT Recovery Plan
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white mt-3">
                {activePlan.title}
              </h2>
              <p className="text-gray-400 mt-1">Targeting: <span className="text-indigo-400 font-semibold">{activePlan.habitName}</span></p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-[#0A0B0E] hover:bg-gray-900 text-gray-300 hover:text-white border border-gray-800 rounded-xl text-xs font-bold transition-colors self-start md:self-center cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Re-generate Plan
            </button>
          </div>

          {/* Habit Loop Summary */}
          <div className="p-6 bg-indigo-950/15 border border-indigo-500/20 rounded-[24px] space-y-2.5">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-wider">
              <Brain className="w-4 h-4 text-indigo-400" /> Understanding Your Habit Loop
            </h3>
            <p className="text-gray-200 text-sm md:text-base leading-relaxed italic">"{activePlan.summary}"</p>
          </div>

          {/* Timeline / Reduction Phases */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Structured Reduction Roadmap
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {activePlan.phases.map((phase, idx) => (
                <div key={idx} className="relative bg-[#0A0B0E]/60 border border-gray-800 rounded-[24px] p-6 space-y-3 shadow-inner hover:border-gray-700 transition-colors">
                  <div className="absolute top-5 right-5 text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/25">
                    {phase.duration}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-500/10">
                      {idx + 1}
                    </div>
                    <h4 className="font-bold text-white text-sm pr-14">{phase.title}</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{phase.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger, Mitigation, Replacement */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              High-Risk Trigger & Mitigation Plan
            </h3>
            <div className="space-y-4">
              {activePlan.triggerStrategies.map((strat, idx) => (
                <div key={idx} className="grid md:grid-cols-3 gap-6 bg-[#0A0B0E]/60 border border-gray-800 rounded-[24px] p-6 text-sm">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-500 tracking-widest block mb-2">Trigger Scenario</span>
                    <p className="text-white font-semibold leading-relaxed">{strat.trigger}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-sky-400 tracking-widest block mb-2">CBT Cognitive Reframe</span>
                    <p className="text-gray-300 leading-relaxed">{strat.mitigation}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest block mb-2">Dopamine Replacement</span>
                    <p className="text-gray-300 leading-relaxed">{strat.replacement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Habits & Mindset Shift */}
          <div className="grid md:grid-cols-2 gap-6 pt-2">
            {/* Positive Daily Rituals */}
            <div className="bg-[#0A0B0E]/60 border border-gray-800 rounded-[24px] p-6 space-y-4">
              <h4 className="font-bold text-white flex items-center gap-2 text-sm border-b border-gray-800/50 pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Positive Replacement Rituals
              </h4>
              <ul className="space-y-3">
                {activePlan.dailyHabits.map((habit, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs md:text-sm text-gray-300">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{habit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mindset Shift */}
            <div className="bg-[#0A0B0E]/60 border border-gray-800 rounded-[24px] p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 text-sm border-b border-gray-800/50 pb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Your Calming Mantra / Shift
                </h4>
                <p className="text-xs md:text-sm text-gray-200 italic leading-relaxed mt-4">
                  "{activePlan.mindsetShift}"
                </p>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-4 border-t border-gray-800/50 pt-3">
                Tip: Repeat this mantra when you feel an urge peaking. Cravings last an average of 15 minutes.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Plan Generator Form */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 md:p-10 shadow-xl space-y-6"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white flex items-center gap-3">
              <Brain className="text-indigo-500 w-8 h-8" />
              Generate Your CBT Action Plan
            </h2>
            <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              Provide details about the habit you want to break, and the coach will construct a progressive, clinical action plan to rewire your reward pathway.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Habit Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Which habit or addiction are you breaking? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excessive Screen Time, Smoking, Sugar Cravings"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Habit Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="screen-time">Screen Time & Digital (Apps, Games)</option>
                  <option value="substance">Substance Intake (Nicotine, Alcohol, Caffeine)</option>
                  <option value="dietary">Dietary & Eating (Sugar, Fast Food, Snacking)</option>
                  <option value="physical">Physical Habits (Nail Biting, Hair Pulling, Cracking Knuckles)</option>
                  <option value="mental">Mental & Behavioral (Procrastination, Negative Self-Talk)</option>
                  <option value="other">Other Behavioral Addictions</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Level */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Current Level of Engagement
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 hours a day, 10 cigarettes a day, every evening"
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Target Goal */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Your Target Goal / Ultimate Ideal
                </label>
                <input
                  type="text"
                  placeholder="e.g. Under 1 hour, Complete cessation, Only once a week"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Triggers */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                What are your main triggers or high-risk situations?
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Stress after work, boredom on weekends, feeling lonely in evenings, seeing others do it"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm flex items-center gap-2 bg-red-950/20 border border-red-900/30 p-3.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-6.5 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Custom Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate My Action Plan
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
