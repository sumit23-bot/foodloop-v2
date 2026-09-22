import React, { useState, useRef, useEffect } from 'react';

export default function GeminiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! 🙏 I am your FoodLoop Gemini AI Assistant. How can I help you today?'
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
      const reply = data.reply || data.response || 'Namaste! FoodLoop AI system is active.';
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: '⚠️ Temporary connection issue with Gemini AI. You can reach emergency support at +91 8800 247 247.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-support-widget" style={{ position: 'fixed', bottom: '85px', right: '24px', zIndex: 9999999, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Floating Launcher Toggle Button */}
      <button 
        type="button" 
        id="ai-chat-launcher" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#10b981',
          border: '3px solid #ffffff',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          transition: 'transform 0.2s',
          pointerEvents: 'auto'
        }}
        title="Open Gemini AI Assistant"
      >
        🤖
      </button>

      {/* Chat Window Container */}
      {isOpen && (
        <div 
          id="ai-chat-window" 
          style={{
            display: 'flex',
            width: '360px',
            height: '490px',
            background: '#1e293b',
            border: '1.5px solid #334155',
            borderRadius: '16px',
            boxShadow: '0 24px 50px rgba(0,0,0,0.95)',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'absolute',
            bottom: '75px',
            right: 0,
            zIndex: 10000000
          }}
        >
          {/* Chat Header */}
          <div style={{ background: '#111827', padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#10b981', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                🤖
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>FoodLoop Gemini AI</h4>
                <small style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', background: '#34d399', borderRadius: '50%' }}></span> Live Online 24/7
                </small>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Messages Body */}
          <div id="ai-chat-messages" style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#0b0f19' }}>
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#10b981' : '#1e293b',
                  color: m.sender === 'user' ? '#000' : '#f8fafc',
                  border: m.sender === 'user' ? 'none' : '1px solid #334155',
                  padding: '10px 12px',
                  borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}
              >
                {m.text}
              </div>
            ))}

            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#1e293b', border: '1px solid #334155', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', color: '#38bdf8' }}>
                🤖 Gemini is thinking...
              </div>
            )}

            {/* Quick Suggestions Chips */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                <button 
                  type="button" 
                  onClick={() => sendMessage('How to post food with live camera or gallery?')}
                  style={{ background: '#334155', border: '1px solid #475569', color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🍲 Post Food
                </button>
                <button 
                  type="button" 
                  onClick={() => sendMessage('How to claim food with NGO Darpan ID?')}
                  style={{ background: '#334155', border: '1px solid #475569', color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🏛️ NGO Claim
                </button>
                <button 
                  type="button" 
                  onClick={() => sendMessage('How does 80G tax certificate work?')}
                  style={{ background: '#334155', border: '1px solid #475569', color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  📜 80G Tax
                </button>
                <button 
                  type="button" 
                  onClick={() => sendMessage('What is Animal Feed and Biogas Loop?')}
                  style={{ background: '#334155', border: '1px solid #475569', color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🐾 Animal Feed
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            style={{ padding: '10px 12px', background: '#111827', borderTop: '1px solid #334155', display: 'flex', gap: '8px' }}
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about FoodLoop..." 
              autoComplete="off" 
              style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px', outline: 'none' }} 
            />
            <button 
              type="submit" 
              style={{ background: '#10b981', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#000', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
