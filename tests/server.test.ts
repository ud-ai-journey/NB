import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';

// Mock the GoogleGenAI client SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockImplementation(({ contents, config }) => {
            // Check if schema-based JSON response is expected
            if (config && config.responseMimeType === 'application/json') {
              return {
                text: JSON.stringify({
                  title: "Mock Action Plan",
                  summary: "CBT habit loops are rewired by routine replacement.",
                  phases: [
                    { title: "Awareness Phase", description: "Log daily urges.", duration: "Week 1" },
                    { title: "Intervention Phase", description: "Use breathing techniques.", duration: "Week 2" },
                    { title: "Sustenance Phase", description: "Establish replacement routines.", duration: "Week 3" }
                  ],
                  triggerStrategies: [
                    { trigger: "Anxiety", mitigation: "Surfing the urge", replacement: "Deep breathing" }
                  ],
                  dailyHabits: ["Mindful pause", "Log cravings", "Breathing metronome"],
                  mindsetShift: "Cravings are only thoughts, not commands.",
                  headline: "Anchor yourself",
                  steps: ["Pause and take a breath", "Observe the physical urge"],
                  reframe: "Urges peak and pass like waves.",
                  timeAnalysis: "Cravings peak late night",
                  triggerInsights: "Stress triggers cravings",
                  statisticsSummary: "You surfed 80% of urges",
                  recommendations: ["Breathing exercises", "Journaling", "Environment shifts"]
                })
              };
            }
            // General text response (e.g. for chat or check-in)
            return {
              text: "This is a supportive behavioral mock advice response."
            };
          })
        }
      };
    }),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN'
    }
  };
});

beforeAll(() => {
  process.env.GEMINI_API_KEY = "mock_key";
  process.env.OPENAI_API_KEY = "mock_key";
});

describe('Express API Server Endpoints', () => {
  describe('POST /api/coaching/generate-plan', () => {
    it('should return 400 if habitName or category is missing', async () => {
      const res = await request(app)
        .post('/api/coaching/generate-plan')
        .send({ category: 'screen-time' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 400 for an invalid category', async () => {
      const res = await request(app)
        .post('/api/coaching/generate-plan')
        .send({ habitName: 'Excessive Gaming', category: 'invalid-category' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('category');
    });

    it('should generate plan successfully for valid inputs', async () => {
      const res = await request(app)
        .post('/api/coaching/generate-plan')
        .send({
          habitName: 'Excessive Scrolling',
          category: 'screen-time',
          currentLevel: '4 hours',
          targetGoal: '1 hour',
          triggers: 'Stress, Boredom'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.phases).toHaveLength(3);
    });
  });

  describe('POST /api/coaching/chat', () => {
    it('should return 400 if messages list is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/coaching/chat')
        .send({ habitContext: null });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('messages');
    });

    it('should reply successfully for a valid conversation message', async () => {
      const res = await request(app)
        .post('/api/coaching/chat')
        .send({
          messages: [
            { role: 'user', text: 'I am struggling with cravings today.' }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('text');
      expect(res.body.text).toContain('supportive');
    });
  });

  describe('POST /api/coaching/analyze-urges', () => {
    it('should return 400 if urges is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/coaching/analyze-urges')
        .send({ habitName: 'Vaping' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('urges');
    });

    it('should analyze urge logs successfully', async () => {
      const res = await request(app)
        .post('/api/coaching/analyze-urges')
        .send({
          habitName: 'Vaping',
          urges: [
            { timestamp: new Date().toISOString(), intensity: 8, trigger: 'Stress', handled: 'surfed' },
            { timestamp: new Date().toISOString(), intensity: 5, trigger: 'Boredom', handled: 'slipped' }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timeAnalysis');
      expect(res.body).toHaveProperty('triggerInsights');
      expect(res.body).toHaveProperty('statisticsSummary');
      expect(res.body.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/coaching/quick-support', () => {
    it('should support urge surfing recommendations successfully', async () => {
      const res = await request(app)
        .post('/api/coaching/quick-support')
        .send({
          intensity: 8,
          trigger: 'Loneliness',
          context: 'At home alone',
          habitName: 'Scrolling'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('headline');
      expect(res.body.steps).toHaveLength(2);
      expect(res.body).toHaveProperty('reframe');
    });
  });

  describe('POST /api/coaching/reflection', () => {
    it('should evaluate and coach on reflections successfully', async () => {
      const res = await request(app)
        .post('/api/coaching/reflection')
        .send({
          mood: 'stressed',
          complianceRate: 3,
          reflectionText: 'I slipped once in the afternoon but kept up for the rest of the day.',
          currentHabits: ['Scrolling']
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('text');
      expect(res.body.text).toContain('supportive');
    });
  });
});
