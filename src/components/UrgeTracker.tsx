import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, History, Brain, LineChart, CheckCircle2, AlertOctagon, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { UrgeLog } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface UrgeTrackerProps {
  logs: UrgeLog[];
  onAddLog: (log: UrgeLog) => void;
  activeHabitName?: string;
  onBackToDashboard?: () => void;
}

interface AIAnalysis {
  timeAnalysis: string;
  triggerInsights: string;
  statisticsSummary: string;
  recommendations: string[];
}

export default function UrgeTracker({ logs, onAddLog, activeHabitName, onBackToDashboard }: UrgeTrackerProps) {
  const [intensity, setIntensity] = useState<number>(5);
  const [trigger, setTrigger] = useState<string>('Stress');
  const [situation, setSituation] = useState<string>('');
  const [handled, setHandled] = useState<'surfed' | 'resisted' | 'slipped'>('surfed');
  const [notes, setNotes] = useState<string>('');

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Filter logs for active habit if provided
  const filteredLogs = activeHabitName 
    ? logs.filter(l => l.habitName.toLowerCase() === activeHabitName.toLowerCase())
    : logs;

  // Calculate statistics
  const totalLogs = filteredLogs.length;
  const surfedLogs = filteredLogs.filter(l => l.handled === 'surfed' || l.handled === 'resisted').length;
  const successRate = totalLogs > 0 ? Math.round((surfedLogs / totalLogs) * 100) : 100;
  
  const avgIntensity = totalLogs > 0 
    ? (filteredLogs.reduce((acc, l) => acc + l.intensity, 0) / totalLogs).toFixed(1)
    : '0';

  const triggerCounts = filteredLogs.reduce((acc, l) => {
    acc[l.trigger] = (acc[l.trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTrigger = Object.keys(triggerCounts).length > 0
    ? Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'None yet';

  // 1. Chart Data: Severity trend over time (chronological)
  const chronologicalLogs = [...filteredLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const trendData = chronologicalLogs.slice(-10).map((log, idx) => {
    const d = new Date(log.timestamp);
    return {
      index: idx + 1,
      date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      intensity: log.intensity,
      trigger: log.trigger,
    };
  });

  // 2. Chart Data: Outcomes distribution
  const outcomeCounts = filteredLogs.reduce((acc, l) => {
    acc[l.handled] = (acc[l.handled] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const outcomeData = [
    { name: 'Surfed', value: outcomeCounts['surfed'] || 0, color: '#10b981' },
    { name: 'Resisted', value: outcomeCounts['resisted'] || 0, color: '#0ea5e9' },
    { name: 'Slipped', value: outcomeCounts['slipped'] || 0, color: '#f43f5e' },
  ].filter(item => item.value > 0);

  // 3. Chart Data: Triggers frequency
  const triggerData = Object.entries(triggerCounts).map(([key, val]) => ({
    name: key.length > 12 ? `${key.substring(0, 10)}...` : key,
    count: val,
  })).sort((a, b) => b.count - a.count);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHabitName) {
      alert("Please select or create an active habit first on the dashboard!");
      return;
    }

    const newLog: UrgeLog = {
      id: Date.now().toString(),
      habitName: activeHabitName,
      timestamp: new Date().toISOString(),
      intensity,
      trigger,
      situation,
      handled,
      notes
    };

    onAddLog(newLog);
    
    // Reset form fields
    setIntensity(5);
    setSituation('');
    setNotes('');
    setHandled('surfed');
    
    // Reset analysis since logs changed
    setAiAnalysis(null);
  };

  const handleAIAnalysis = async () => {
    if (filteredLogs.length < 2) {
      setAnalysisError("The AI Coach needs at least 2 logged urges to perform a meaningful pattern analysis. Log a few situations first!");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/coaching/analyze-urges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urges: filteredLogs,
          habitName: activeHabitName || "Your Habit"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze logs');
      }

      const analysis: AIAnalysis = await response.json();
      setAiAnalysis(analysis);
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to contact the behavioral analysis engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div id="urge-tracker-wrapper" className="space-y-6">
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-gray-400 hover:text-indigo-400 cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl bg-[#141518] border border-gray-800/80 hover:border-indigo-500/30 hover:bg-gray-900/40"
        >
          &larr; Back to Dashboard
        </button>
      )}

      <div id="urge-tracker-root" className="grid lg:grid-cols-12 gap-8">
      
      {/* LEFT COLUMN: Input Form & Stats */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* LOG FORM */}
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-xl flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Log a Craving / Urge</h3>
              {activeHabitName ? (
                <p className="text-gray-400 text-xs mt-0.5">Active habit: <span className="text-indigo-400 font-bold">{activeHabitName}</span></p>
              ) : (
                <p className="text-red-400 text-xs mt-0.5 font-semibold">⚠️ Please select a habit first!</p>
              )}
            </div>
          </div>

          <form onSubmit={handleLogSubmit} className="space-y-4">
            {/* Intensity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase text-gray-400 tracking-wider">
                <span>Urge Intensity</span>
                <span className="text-indigo-400 font-mono font-bold text-sm">{intensity}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-[#0A0B0E] rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Trigger Scenario */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">Primary Trigger</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Stress">Stress & Anxiety</option>
                <option value="Boredom">Boredom or Inactivity</option>
                <option value="Social Pressure">Social Setting / Peer Activity</option>
                <option value="Emotional Spark">Anger, Sadness, or Loneliness</option>
                <option value="Fatigue">Fatigue & Exhaustion</option>
                <option value="Environment">Environmental Cues (e.g. sitting at desk, waking up)</option>
                <option value="Habit Loop">Subconscious Routine Trigger</option>
              </select>
            </div>

            {/* Context / Situation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">Situational Context</label>
              <input
                type="text"
                placeholder="e.g. Working late at home office, watching TV on couch"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Coping State */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">How did you respond? *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHandled('surfed')}
                  className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    handled === 'surfed'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                      : 'bg-[#0A0B0E] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  🏄‍♂️ Surfed
                </button>
                <button
                  type="button"
                  onClick={() => setHandled('resisted')}
                  className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    handled === 'resisted'
                      ? 'bg-sky-950/40 border-sky-500 text-sky-400 shadow-md shadow-sky-500/5'
                      : 'bg-[#0A0B0E] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  🛡️ Resisted
                </button>
                <button
                  type="button"
                  onClick={() => setHandled('slipped')}
                  className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    handled === 'slipped'
                      ? 'bg-red-950/40 border-red-500 text-red-400 shadow-md shadow-red-500/5'
                      : 'bg-[#0A0B0E] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  ⚠️ Slipped
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">CBT Journal / Feelings Note</label>
              <textarea
                rows={2}
                placeholder="What thoughts were in your head? How did you feel afterward?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!activeHabitName}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer border border-indigo-500/20 shadow-md shadow-indigo-600/10"
            >
              Log Craving Entry
            </button>
          </form>
        </div>

        {/* LOG STATS PANEL */}
        <div className="bg-[#141518] border border-gray-800 rounded-[24px] p-5 shadow-xl grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#0A0B0E]/60 border border-gray-850 rounded-[18px] text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1 tracking-wider">Entries</span>
            <span className="text-2xl font-mono font-black text-white">{totalLogs}</span>
          </div>
          <div className="p-4 bg-[#0A0B0E]/60 border border-gray-850 rounded-[18px] text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1 tracking-wider">Success</span>
            <span className={`text-2xl font-mono font-black ${successRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {successRate}%
            </span>
          </div>
          <div className="p-4 bg-[#0A0B0E]/60 border border-gray-850 rounded-[18px] text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1 tracking-wider">Avg Severity</span>
            <span className="text-2xl font-mono font-black text-indigo-400">{avgIntensity}</span>
          </div>
          <div className="p-4 bg-[#0A0B0E]/60 border border-gray-850 rounded-[18px] text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1 tracking-wider">Top Trigger</span>
            <span className="text-xs font-bold text-gray-200 block truncate mt-1">{topTrigger}</span>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: History & AI Pattern Analysis */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* NEURAL BEHAVIORAL CHARTS */}
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-855 pb-4">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Neural Habit Analytics</h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time Recharts visualizers of urge dynamics</p>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs border border-dashed border-gray-800/80 rounded-[24px] bg-[#0A0B0E]/20">
              No chart data available yet. Log an urge to begin plotting behavioral dynamics.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chart 1: Intensity Trend */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Urge Severity Timeline (Last 10 Logs)</span>
                <div className="h-44 w-full bg-[#0A0B0E]/40 border border-gray-850 rounded-2xl p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={9} tickLine={false} />
                      <YAxis stroke="#6b7280" fontSize={9} tickLine={false} domain={[1, 10]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#141518', borderColor: '#374151', borderRadius: '12px' }}
                        labelStyle={{ color: '#9ca3af', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff', fontSize: '11px' }}
                      />
                      <Area type="monotone" dataKey="intensity" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIntensity)" name="Intensity" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid of Outcome Pie & Trigger Bar */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Outcomes Pie */}
                <div className="space-y-2 bg-[#0A0B0E]/30 border border-gray-850 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Coping Outcome Ratio</span>
                  {outcomeData.length > 0 ? (
                    <div className="h-32 flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outcomeData}
                            cx="40%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {outcomeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#141518', borderColor: '#374151', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '11px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 space-y-1.5 text-right">
                        {outcomeData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 justify-end text-[9px]">
                            <span className="text-gray-300 font-mono">{item.name}: {item.value}</span>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-gray-550">No data</div>
                  )}
                </div>

                {/* Triggers Bar Chart */}
                <div className="space-y-2 bg-[#0A0B0E]/30 border border-gray-855 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Triggers Distribution</span>
                  {triggerData.length > 0 ? (
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={triggerData.slice(0, 4)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.1} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickLine={false} />
                          <YAxis stroke="#6b7280" fontSize={8} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#141518', borderColor: '#374151', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '10px' }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Count">
                            {triggerData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={idx === 0 ? '#6366f1' : '#4f46e5'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-gray-550">No data</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI PATTERN RECOGNITION */}
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">AI Pattern Analysis</h3>
                <p className="text-xs text-gray-400 mt-0.5">Automated CBT habit cycle detection</p>
              </div>
            </div>
            <button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing || filteredLogs.length < 2}
              className="flex items-center justify-center gap-2.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-550 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze Urges Pattern
                </>
              )}
            </button>
          </div>

          {analysisError && (
            <div className="text-yellow-400 text-xs flex items-start gap-2 bg-yellow-950/20 border border-yellow-900/30 p-3 rounded-lg leading-relaxed">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}

          {aiAnalysis ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5 text-sm"
            >
              <div className="grid grid-cols-1 gap-5">
                <div className="p-4 bg-[#0A0B0E]/60 border border-gray-855 rounded-[18px]">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1.5">High-Risk Scenarios</h4>
                  <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{aiAnalysis.timeAnalysis}</p>
                </div>
                <div className="p-4 bg-[#0A0B0E]/60 border border-gray-855 rounded-[18px]">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1.5">Trigger Psychology</h4>
                  <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{aiAnalysis.triggerInsights}</p>
                </div>
                <div className="p-4 bg-[#0A0B0E]/60 border border-gray-855 rounded-[18px]">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5">Recovery Summary</h4>
                  <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{aiAnalysis.statisticsSummary}</p>
                </div>
                <div className="p-4 bg-[#0A0B0E]/60 border border-gray-855 rounded-[18px]">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2.5">Actionable Recommendations</h4>
                  <ul className="space-y-2.5">
                    {aiAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs md:text-sm text-gray-200">
                        <span className="w-5 h-5 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-3 border border-dashed border-gray-800 rounded-[24px] bg-[#0A0B0E]/30">
              <LineChart className="w-8 h-8 text-gray-600 animate-pulse" />
              <p className="text-xs max-w-sm px-4 leading-relaxed">
                {filteredLogs.length < 2 
                  ? "Log at least 2 urge entries to unlock real-time behavioral neural pattern recognition." 
                  : "Click 'Analyze Urges Pattern' to execute an automated cognitive trigger analysis."}
              </p>
            </div>
          )}
        </div>

        {/* LOG HISTORY LIST */}
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-gray-855 pb-4">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="font-display font-bold text-lg text-white">Craving Logs History</h3>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-3.5 pr-2 scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs border border-dashed border-gray-800/80 rounded-2xl bg-[#0A0B0E]/20">
                No craving logs found. When an urge hits, log it above to start tracking!
              </div>
            ) : (
              [...filteredLogs].reverse().map((log) => (
                <div key={log.id} className="bg-[#0A0B0E]/60 border border-gray-800/60 rounded-[20px] p-5 flex gap-4 text-xs">
                  {/* Status indicator icon */}
                  <div className="flex-shrink-0">
                    {log.handled === 'surfed' ? (
                      <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-full flex items-center justify-center font-bold text-sm shadow-inner" title="Surfed urge">
                        🏄‍♂️
                      </div>
                    ) : log.handled === 'resisted' ? (
                      <div className="w-8 h-8 bg-sky-500/10 text-sky-400 border border-sky-500/15 rounded-full flex items-center justify-center font-bold text-sm shadow-inner" title="Resisted successfully">
                        🛡️
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-500/10 text-red-400 border border-red-500/15 rounded-full flex items-center justify-center font-bold text-sm shadow-inner" title="Slipped">
                        ⚠️
                      </div>
                    )}
                  </div>

                  {/* Body details */}
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        {log.trigger} <span className="text-gray-400 font-medium text-xs">({log.handled})</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                      <span>Intensity: <strong className="text-indigo-400 font-mono">{log.intensity}/10</strong></span>
                      {log.situation && (
                        <span>Context: <strong className="text-gray-200">{log.situation}</strong></span>
                      )}
                    </div>

                    {log.notes && (
                      <p className="text-gray-300 border-l-2 border-indigo-500/60 pl-3 leading-relaxed italic mt-1 bg-[#141518]/30 py-1 rounded-r">
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
    </div>
  );
}
