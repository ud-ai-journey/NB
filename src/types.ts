export interface Habit {
  id: string;
  name: string;
  category: 'screen-time' | 'substance' | 'physical' | 'dietary' | 'mental' | 'other';
  startDate: string;
  targetGoal: string; // e.g. "0 hours", "No smoking", "20 mins max"
  currentLevel: string; // e.g. "6 hours", "10 cigarettes", "1.5 hours"
  unit: string; // e.g. "hours", "cigarettes", "times"
  streakDays: number;
  lastActive: string;
}

export interface UrgeLog {
  id: string;
  habitName: string;
  timestamp: string;
  intensity: number; // 1 to 10
  trigger: string; // e.g. "Stress", "Boredom", "Social event"
  situation: string; // Context
  handled: 'surfed' | 'resisted' | 'slipped';
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ActionPlan {
  id: string;
  habitName: string;
  title: string;
  summary: string;
  phases: {
    title: string;
    description: string;
    duration: string;
  }[];
  triggerStrategies: {
    trigger: string;
    mitigation: string;
    replacement: string;
  }[];
  dailyHabits: string[];
  mindsetShift: string;
}

export interface Reflection {
  id: string;
  timestamp: string;
  mood: 'calm' | 'anxious' | 'proud' | 'stressed' | 'hopeful' | 'struggling';
  complianceRate: number; // 1 to 5 stars
  reflectionText: string;
  aiCoachingResponse?: string;
}
