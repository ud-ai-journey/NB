import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, BrainCircuit, RefreshCw, Sparkles, Camera, X } from 'lucide-react';
import { ChatMessage, Habit, UrgeLog } from '../types';

interface CoachingChatProps {
  activeHabit: Habit | null;
  logs: UrgeLog[];
}

export default function CoachingChat({ activeHabit, logs }: CoachingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload snapshot states
  const [selectedImage, setSelectedImage] = useState<{ mimeType: string; data: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const commaIdx = resultStr.indexOf(',');
        const data = resultStr.substring(commaIdx + 1);
        const mimeType = file.type;
        setSelectedImage({ mimeType, data });
        setImagePreview(resultStr);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Suggested prompt chips for CBT
  const promptChips = [
    { label: "🚨 Having a strong urge right now", text: "I am having an intense craving/urge right now. Help me surf it." },
    { label: "💔 I slipped up, help me reset", text: "I just slipped up and engaged in my bad habit. I feel discouraged. Help me process this and reset without shaming myself." },
    { label: "🛡️ Teach me the 5Ds of delay", text: "What are the 5Ds of urge management? Show me how to apply them to my habit." },
    { label: "🧠 Reframe my stress trigger", text: "I use my habit to cope with stress and anxiety. Let's do a CBT cognitive reframe exercise." },
  ];

  // Initialize with welcome message from AI
  useEffect(() => {
    const defaultMessages: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'model',
        text: activeHabit 
          ? `Hello! I'm your cognitive behavioral coach. I understand you're working on reducing/overcoming "${activeHabit.name}". I'm here to support you without judgment. How can I help you today? You can tell me about how you're feeling, log a struggle, or click one of the quick exercises below!`
          : `Hello! I'm your habit recovery coach. Select or create a habit on the dashboard, and we can generate personalized strategies, walk through CBT reframing, or handle tough cravings together. What is on your mind?`,
        timestamp: new Date().toISOString()
      }
    ];

    // Load chat history from localStorage if exists
    const key = activeHabit ? `habit_chat_${activeHabit.id}` : 'habit_chat_general';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        setMessages(defaultMessages);
      }
    } else {
      setMessages(defaultMessages);
    }
  }, [activeHabit]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveChatHistory = (msgs: ChatMessage[]) => {
    const key = activeHabit ? `habit_chat_${activeHabit.id}` : 'habit_chat_general';
    localStorage.setItem(key, JSON.stringify(msgs));
  };

  const handleSendMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      ...(selectedImage ? { image: selectedImage } : {})
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    const tempImg = selectedImage;
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const response = await fetch('/api/coaching/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.slice(-10), // Send last 10 messages for context
          habitContext: activeHabit ? {
            name: activeHabit.name,
            category: activeHabit.category,
            targetGoal: activeHabit.targetGoal,
          } : null,
          recentLogs: logs,
          image: tempImg
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to the therapist backend.');
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.text || "I'm sorry, I'm having trouble reflecting. Let's try again in a moment.",
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "⚠️ [Connection Error] I couldn't reach the AI Coach server. Please make sure your dev server is fully up and running.",
        timestamp: new Date().toISOString()
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear entire chat coaching history?')) {
      const key = activeHabit ? `habit_chat_${activeHabit.id}` : 'habit_chat_general';
      localStorage.removeItem(key);
      const defaultMsg: ChatMessage = {
        id: 'welcome_reset',
        role: 'model',
        text: `Chat cleared. Ready for a fresh coaching session targeting "${activeHabit?.name || 'your habit'}"! How are you doing?`,
        timestamp: new Date().toISOString()
      };
      setMessages([defaultMsg]);
    }
  };

  return (
    <div id="coaching-chat-root" className="bg-[#141518] border border-gray-800 rounded-[32px] flex flex-col h-[600px] shadow-xl overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-[#0A0B0E]/60 border-b border-gray-800 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-white text-sm md:text-base">AI Behavior Coach</h3>
            <p className="text-[10px] text-emerald-400 font-mono tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              CBT SPECIALIST ACTIVE
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs text-gray-500 hover:text-white font-bold px-3 py-1.5 rounded-xl bg-[#0A0B0E]/80 border border-gray-800 hover:border-gray-750 transition-colors cursor-pointer"
        >
          Reset Chat
        </button>
      </div>

      {/* MESSAGES VIEWPORT */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.role === 'user' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/10' : 'bg-purple-600/20 text-purple-400 border border-purple-500/10'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Text Bubble */}
              <div className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600/15 text-white border border-indigo-500/20 rounded-tr-none'
                  : 'bg-[#0A0B0E]/80 text-gray-200 border border-gray-800/60 rounded-tl-none whitespace-pre-wrap'
              }`}>
                {msg.image && (
                  <div className="mb-2 max-w-xs overflow-hidden rounded-lg border border-indigo-500/30">
                    <img 
                      src={`data:${msg.image.mimeType};base64,${msg.image.data}`} 
                      alt="Craving Trigger snapshot" 
                      className="max-h-40 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                {msg.text}
              </div>

            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 flex items-center justify-center flex-shrink-0 animate-spin">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="bg-[#0A0B0E]/60 border border-gray-800 text-gray-500 rounded-2xl rounded-tl-none px-4 py-3 text-xs italic flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                Coach is typing supportive feedback...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER INPUT & QUICK OPTIONS */}
      <div className="bg-[#0A0B0E]/40 border-t border-gray-800 p-5 space-y-4">
        
        {/* Image Preview Box */}
        {imagePreview && (
          <div className="relative inline-flex bg-[#0A0B0E] p-2.5 rounded-xl border border-indigo-500/30 items-center gap-3">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-12 h-12 rounded-lg object-cover border border-gray-800"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Snapshot Attachment Selected</p>
              <p className="text-[9px] text-gray-500">Coach will analyze this craving trigger</p>
            </div>
            <button 
              onClick={removeImage}
              className="w-6 h-6 bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg flex items-center justify-center cursor-pointer ml-4 hover:bg-red-900/20 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick chip options */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.text)}
              disabled={isLoading}
              className="text-[10px] md:text-xs bg-[#0A0B0E] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-full px-4 py-1.5 flex-shrink-0 transition-colors cursor-pointer font-medium"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex gap-2.5">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-12 bg-[#0A0B0E] hover:bg-gray-900 disabled:bg-gray-900 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors border border-gray-800 cursor-pointer"
            title="Upload/Snapshot Trigger Image"
          >
            <Camera className="w-5 h-5 text-indigo-400" />
          </button>

          <input
            type="text"
            placeholder={activeHabit ? `Talk to your CBT Coach about ${activeHabit.name}...` : "Talk to your coach..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
            disabled={isLoading}
            className="flex-1 bg-[#0A0B0E] border border-gray-800 rounded-xl px-4 py-3.5 text-white text-xs md:text-sm placeholder-gray-655 focus:outline-none focus:border-indigo-500 disabled:text-gray-600 transition-colors"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={(!inputValue.trim() && !selectedImage) || isLoading}
            className="w-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl flex items-center justify-center transition-colors border border-indigo-500/20 shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            <Send className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </div>

    </div>
  );
}
