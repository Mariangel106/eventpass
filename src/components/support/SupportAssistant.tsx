import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Minimize2,
  Maximize2,
  HelpCircle,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { n8nApi } from '../../services/n8nClient';

interface SupportAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTelegram: () => void;
  onExploreCatalog: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome-01',
    sender: 'assistant',
    text: '¡Hola! Soy el Asistente Virtual de EventPass. Estoy aquí para resolver tus dudas sobre eventos disponibles, fechas, lugares, cómo funciona la lista de espera y cómo vincular tu cuenta con Telegram.',
    timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
];

const SUGGESTIONS = [
  '¿Cómo vinculo mi Telegram?',
  'Eventos con cupos disponibles',
  '¿Cómo funciona la lista de espera?',
  '¿Cómo cancelo una inscripción?',
  'Arquitectura n8n & Sheets'
];

export const SupportAssistant: React.FC<SupportAssistantProps> = ({
  isOpen,
  onClose,
  onOpenTelegram,
  onExploreCatalog
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // sessionId del Chat Trigger de n8n: en WF10 se convierte en el conversation_id
  const [sessionId, setSessionId] = useState(() => `chat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Send to centralized n8n client service
      const response = await n8nApi.sendChatMessage(text, sessionId);
      const replyText =
        response.data?.reply ||
        response.error ||
        'He recibido tu consulta. En modo demostración puedes consultar sobre eventos de Tecnología, Educación, Cultura, lista de espera o el comando /vincular de Telegram.';

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: 'Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente o consulta el catálogo directamente.',
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages(INITIAL_MESSAGES);
    setSessionId(() => `chat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl border border-indigo-500/30 bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Soporte EventPass</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/80 text-cyan-300 font-mono">
                IA
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Asistente conversacional de eventos</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            title="Reiniciar conversación"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar asistente"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[82%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-xs'
              }`}
            >
              <p>{msg.text}</p>
              <span
                className={`block text-[10px] mt-1.5 ${
                  msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 whitespace-nowrap transition-colors shrink-0"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta sobre eventos o Telegram..."
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          aria-label="Enviar mensaje"
          className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
