import React, { useState, useRef, useEffect } from 'react';
import { Send, X, ExternalLink } from 'lucide-react';
import TinyFishBadge from './tinyfish/TinyFishBadge';

export default function GeminiChatWidget({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste. I am your FoodLoop AI Assistant. You can ask about surplus food guidelines, NGO Darpan claim requirements, 80G tax certificates, or our zero-waste animal feed loop.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: historyPayload
        })
      });

      const data = await res.json();
      const reply = data.reply || data.response || 'FoodLoop AI assistance is active. Please ask your food rescue query.';
      setMessages(prev => [...prev, { sender: 'bot', text: reply, sources: data.sources }]);
    } catch (_err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Temporary connection issue with the assistant. You can check the guidelines or reach out via the Contact page.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="assistant-slideover-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="AI Assistant Slide-over">
      <div 
        className="assistant-slideover" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slideover-header">
          <div className="slideover-title-wrap">
            <h3>Assistant</h3>
            <p>FoodLoop verified protocol &amp; rescue queries.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TinyFishBadge />
            <button 
              type="button" 
              className="slideover-close-btn" 
              onClick={onClose}
              aria-label="Close Assistant"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="slideover-body">
          {messages.map((msg, idx) => (
            <div key={idx} className="chat-message-row">
              <div className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                <div>{msg.text}</div>

                {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                  <div className="chat-sources-block">
                    <div className="chat-sources-title">Sources Retrieved:</div>
                    {msg.sources.map((src, sIdx) => (
                      <a 
                        key={sIdx} 
                        href={src.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="chat-source-item"
                      >
                        {src.title || src.url}
                        <ExternalLink size={10} strokeWidth={1.5} style={{ display: 'inline', marginLeft: 4 }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message-row">
              <div className="chat-bubble-bot">
                <span>Checking FoodLoop knowledge base...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="slideover-footer">
          <div className="chat-suggestions-wrap">
            <button 
              type="button" 
              className="chat-suggestion-chip"
              onClick={() => sendMessage('How does the animal & gaushala loop work?')}
            >
              Animal feed rules
            </button>
            <button 
              type="button" 
              className="chat-suggestion-chip"
              onClick={() => sendMessage('What are the pickup and QR handover requirements?')}
            >
              QR handover rules
            </button>
            <button 
              type="button" 
              className="chat-suggestion-chip"
              onClick={() => sendMessage('How is surplus food verified before posting?')}
            >
              Verification protocol
            </button>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }} 
            style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
          >
            <input
              type="text"
              placeholder="Ask FoodLoop Assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              style={{ flex: 1 }}
            />
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={15} strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
