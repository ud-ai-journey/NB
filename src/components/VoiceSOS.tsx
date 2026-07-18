import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';

// Public key is safe to expose client-side by design (Vapi's own docs confirm this).
// Never put a Vapi *private/server* key here.
const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;

interface VoiceSOSProps {
  habitName: string;
  trigger?: string;
  intensity?: number;
}

type CallState = 'idle' | 'connecting' | 'active' | 'error';

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Live voice version of the urge-surfing SOS panel.
 * Reuses the same clinical framing as the text-based /api/coaching/quick-support
 * route, but delivers it as a real-time spoken conversation via Vapi instead of
 * a JSON block the user has to read while mid-craving.
 */
export default function VoiceSOS({ habitName, trigger, intensity }: VoiceSOSProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const vapiRef = useRef<any>(null);

  // Lazily create the Vapi client once we actually need it (keeps it out of
  // the initial bundle path and avoids crashing if the key isn't set yet).
  const getVapi = async () => {
    if (vapiRef.current) return vapiRef.current;
    const { default: Vapi } = await import('@vapi-ai/web');
    const instance = new Vapi(VAPI_PUBLIC_KEY as string);

    instance.on('call-start', () => setCallState('active'));
    instance.on('call-end', () => {
      setCallState('idle');
      setAssistantSpeaking(false);
    });
    instance.on('speech-start', () => setAssistantSpeaking(true));
    instance.on('speech-end', () => setAssistantSpeaking(false));
    instance.on('message', (message: any) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setTranscript((prev) => [
          ...prev,
          { role: message.role === 'user' ? 'user' : 'assistant', text: message.transcript },
        ]);
      }
    });
    instance.on('error', (err: any) => {
      console.error('Vapi error', err);
      setErrorMsg(err?.message || 'Voice session hit an error.');
      setCallState('error');
    });

    vapiRef.current = instance;
    return instance;
  };

  const startCall = async () => {
    if (!VAPI_PUBLIC_KEY) {
      setErrorMsg('VITE_VAPI_PUBLIC_KEY is not set. Add it to your .env to enable voice SOS.');
      setCallState('error');
      return;
    }

    setErrorMsg(null);
    setTranscript([]);
    setCallState('connecting');

    try {
      const vapi = await getVapi();

      // Inline (ephemeral) assistant config — mirrors the system prompt already
      // used in server.ts's /api/coaching/quick-support route, adapted for a
      // spoken, turn-taking conversation instead of a one-shot JSON response.
      await vapi.start({
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an emergency crisis support coach for breaking harmful habits, speaking live with someone having an ACUTE, immediate craving right now.

The person is working on: "${habitName}".
Reported trigger: ${trigger || 'not specified'}.
Reported urge intensity: ${intensity ?? 'unknown'}/10.

Guide them out loud through the next 5-10 minutes using urge-surfing and grounding techniques:
- Open with a short, calming anchor line.
- Walk them through slow breathing (in 4s, hold 4s, out 4s) one step at a time, pausing between steps so they can actually do it, not just hear about it.
- Use grounding and body-awareness cues (feet on the floor, shoulders, hands).
- Remind them the urge is a wave that peaks and passes, not a command.
- Never lecture or shame. Never mention this is an AI unless asked.
- Keep every turn SHORT (1-3 sentences) — this is a spoken conversation, not an essay. Wait for them to respond before moving to the next step.
- If they say they're safe and the urge has passed, congratulate them briefly and ask if they want to keep talking or end the call.`,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: 'burt',
        },
        firstMessage: "I'm here with you. Let's ride this out together — take a slow breath in with me right now.",
      });
    } catch (err: any) {
      console.error('Failed to start Vapi call', err);
      setErrorMsg(err?.message || 'Could not start the voice session.');
      setCallState('error');
    }
  };

  const endCall = () => {
    vapiRef.current?.stop();
    setCallState('idle');
  };

  const toggleMute = () => {
    if (!vapiRef.current) return;
    const next = !muted;
    vapiRef.current.setMuted(next);
    setMuted(next);
  };

  // Clean up the call if the component unmounts mid-conversation (e.g. modal closed)
  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  return (
    <div className="bg-[#0A0B0E]/60 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          Talk To Your Coach Live
        </h4>
        {callState === 'active' && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {assistantSpeaking ? 'Coach speaking…' : 'Listening…'}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {callState === 'idle' && (
        <button
          onClick={startCall}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-violet-600/15 transition-all cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Start Voice Session
        </button>
      )}

      {callState === 'connecting' && (
        <div className="w-full flex items-center justify-center gap-2 text-slate-400 text-xs font-mono py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting to your coach…
        </div>
      )}

      {callState === 'active' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className="flex-1 flex items-center justify-center gap-2 bg-[#141518] border border-gray-800 hover:border-gray-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={endCall}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Call
            </button>
          </div>

          {transcript.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs bg-black/20 rounded-xl p-3">
              <AnimatePresence initial={false}>
                {transcript.slice(-6).map((line, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={line.role === 'assistant' ? 'text-violet-300' : 'text-slate-400'}
                  >
                    <span className="font-mono uppercase text-[9px] mr-1.5 opacity-60">
                      {line.role === 'assistant' ? 'coach' : 'you'}
                    </span>
                    {line.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
