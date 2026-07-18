import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Smile, Heart, Star, Sparkles, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import { Reflection, Habit } from '../types';

interface DailyReflectionProps {
  currentHabits: Habit[];
  onBackToDashboard?: () => void;
}

export default function DailyReflection({ currentHabits, onBackToDashboard }: DailyReflectionProps) {
  const [mood, setMood] = useState<'calm' | 'anxious' | 'proud' | 'stressed' | 'hopeful' | 'struggling'>('calm');
  const [complianceRate, setComplianceRate] = useState<number>(5);
  const [reflectionText, setReflectionText] = useState('');
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load existing reflections history from local storage
    const saved = localStorage.getItem('habit_breaker_reflections');
    if (saved) {
      try {
        setReflections(JSON.parse(saved));
      } catch (e) {
        setReflections([]);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coaching/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          complianceRate,
          reflectionText,
          currentHabits: currentHabits.map(h => h.name)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to submit reflection');
      }

      const data = await response.json();
      
      const newReflection: Reflection = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        mood,
        complianceRate,
        reflectionText,
        aiCoachingResponse: data.text || "You are making steady progress! Stay focused on your goals."
      };

      const updatedReflections = [newReflection, ...reflections];
      setReflections(updatedReflections);
      localStorage.setItem('habit_breaker_reflections', JSON.stringify(updatedReflections));

      // Reset form
      setReflectionText('');
    } catch (err: any) {
      setError(err.message || 'Could not communicate with the reflection coaching server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReflection = (id: string) => {
    if (confirm('Delete this reflection history entry?')) {
      const updated = reflections.filter(r => r.id !== id);
      setReflections(updated);
      localStorage.setItem('habit_breaker_reflections', JSON.stringify(updated));
    }
  };

  return (
    <div id="daily-reflection-wrapper" className="space-y-6">
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold font-mono text-gray-400 hover:text-indigo-400 cursor-pointer transition-all duration-200 px-4 py-2 rounded-xl bg-[#141518] border border-gray-800/80 hover:border-indigo-500/30 hover:bg-gray-900/40"
        >
          &larr; Back to Dashboard
        </button>
      )}

      <div id="daily-reflection-root" className="grid lg:grid-cols-12 gap-8">
      
      {/* LEFT: Journal Reflection Form */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-850 pb-5">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-white">Daily Diary Check-In</h3>
              <p className="text-xs text-gray-400 mt-0.5">Accountability reflection & CBT analysis</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mood Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">How are you feeling right now?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'calm', label: '😌 Calm' },
                  { key: 'proud', label: '🦁 Proud' },
                  { key: 'hopeful', label: '🌱 Hopeful' },
                  { key: 'anxious', label: '😰 Anxious' },
                  { key: 'stressed', label: '🤯 Stressed' },
                  { key: 'struggling', label: '🥺 Struggling' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMood(item.key as any)}
                    className={`py-2.5 px-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      mood === item.key
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                        : 'bg-[#0A0B0E] border-gray-800 text-gray-400 hover:border-gray-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compliance Star Rating */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider">
                Behavior Reduction Goal Compliance
              </label>
              <div className="flex items-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setComplianceRate(star)}
                    className="text-2xl transition-all cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= complianceRate 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-gray-800'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono text-gray-400 ml-2">
                  {complianceRate === 5 ? 'Excellent compliance' : 
                   complianceRate >= 4 ? 'Very good' : 
                   complianceRate >= 3 ? 'Some slip-ups' : 
                   complianceRate >= 2 ? 'Struggled today' : 'Gave in completely'}
                </span>
              </div>
            </div>

            {/* Reflection Textarea */}
            <div className="space-y-2">
              <label htmlFor="daily-reflection-textarea" className="block text-xs font-bold uppercase text-gray-400 tracking-wider">
                What thoughts, triggers, or successes did you navigate? *
              </label>
              <textarea
                id="daily-reflection-textarea"
                rows={5}
                required
                placeholder="Write honestly about your habits, cravings, trigger management, or mindfulness activities today. The AI coach will read this and offer personalized psychological feedback."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="w-full bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-xs md:text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed transition-colors"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 p-4 rounded-xl leading-relaxed">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2.5 text-white shadow-md shadow-indigo-600/15"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Reflection...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze & Save Check-in
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Reflection History & AI Coaching Insights */}
      <div className="lg:col-span-7 space-y-6">
        
        <div className="bg-[#141518] border border-gray-800 rounded-[32px] p-8 shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-gray-855 pb-4">
            <Heart className="w-5 h-5 text-red-450" />
            <h3 className="font-display font-bold text-lg text-white">Check-in Journey Logs</h3>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {reflections.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center justify-center space-y-3 border border-dashed border-gray-800 rounded-[24px] bg-[#0A0B0E]/20">
                <MessageSquare className="w-8 h-8 text-gray-600 animate-pulse" />
                <p className="max-w-xs px-4 leading-relaxed">No daily reflections on file. Submit your first check-in to generate custom AI behavioral insights!</p>
              </div>
            ) : (
              reflections.map((ref) => (
                <div key={ref.id} className="bg-[#0A0B0E]/60 border border-gray-800/60 p-5 rounded-[20px] space-y-4 text-xs md:text-sm">
                  
                  {/* Card Header details */}
                  <div className="flex items-center justify-between border-b border-gray-855 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">
                        {ref.mood === 'calm' ? '😌 Calm' : 
                         ref.mood === 'proud' ? '🦁 Proud' : 
                         ref.mood === 'hopeful' ? '🌱 Hopeful' : 
                         ref.mood === 'anxious' ? '😰 Anxious' : 
                         ref.mood === 'stressed' ? '🤯 Stressed' : '🥺 Struggling'}
                      </span>
                      <span className="text-gray-700">|</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= ref.complianceRate 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-gray-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(ref.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => handleDeleteReflection(ref.id)}
                        className="text-gray-500 hover:text-red-400 text-[10px] uppercase font-bold transition-colors cursor-pointer bg-[#141518]/80 border border-gray-800 px-2 py-1 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Journal text */}
                  <div>
                    <h5 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Your Diary Reflection</h5>
                    <p className="text-gray-200 leading-relaxed italic">
                      "{ref.reflectionText}"
                    </p>
                  </div>

                  {/* AI response block */}
                  {ref.aiCoachingResponse && (
                    <div className="p-4 bg-indigo-950/20 border border-indigo-550/20 rounded-[14px] space-y-1.5 shadow-inner">
                      <h5 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Coach Response
                      </h5>
                      <p className="text-gray-200 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                        {ref.aiCoachingResponse}
                      </p>
                    </div>
                  )}

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
