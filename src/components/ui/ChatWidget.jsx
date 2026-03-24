import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { marked } from 'marked';
import './ChatWidget.css';

marked.setOptions({ breaks: true });

const BOT_NAME = 'Elusive Racing AI';
const API_URL = '/api/chat';

const INITIAL_MESSAGE = {
  from: 'bot',
  text: "G'day! I'm the Elusive Racing AI assistant. Ask me about products, brands, fitment, shipping or anything else — I'm here to help.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const windowRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, messages, loading]);

  // Push page content left when chat panel is expanded
  useEffect(() => {
    if (open && expanded) {
      document.body.classList.add('chat-panel-open');
    } else {
      document.body.classList.remove('chat-panel-open');
    }
    return () => document.body.classList.remove('chat-panel-open');
  }, [open, expanded]);

  // Keep chat window within the visible viewport when the mobile keyboard appears
  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const update = () => {
      if (windowRef.current) {
        windowRef.current.style.height = `${window.visualViewport.height}px`;
        windowRef.current.style.top = `${window.visualViewport.offsetTop}px`;
      }
    };
    update();
    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
    return () => {
      window.visualViewport.removeEventListener('resize', update);
      window.visualViewport.removeEventListener('scroll', update);
    };
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { from: 'user', text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setExpanded(true);
    setInput('');
    setLoading(true);

    // Build message history in Claude's format (skip the initial bot greeting)
    const history = updatedMessages
      .filter((_, i) => i > 0) // skip initial bot message
      .map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, something went wrong. Please call us on 03 9574 1710.";
      setMessages((prev) => [...prev, { from: 'bot', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: "Sorry, I'm having trouble connecting. Please call us on 03 9574 1710 or email sales@elusiveracing.com.au." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setExpanded(false);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={`chat-widget${open ? ' chat-widget--open' : ''}${expanded ? ' chat-widget--expanded' : ''}`}>
      {open && (
        <div className="chat-window" ref={windowRef}>
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">ER</div>
              <div>
                <div className="chat-header-name">{BOT_NAME}</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  Powered by AI
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              {expanded && (
                <button className="chat-clear" onClick={clearChat} aria-label="New chat">
                  New chat
                </button>
              )}
              <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.from}`}>
                {msg.from === 'bot'
                  ? <div className="chat-bubble chat-bubble--md" dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                  : <div className="chat-bubble">{msg.text}</div>
                }
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg--bot">
                <div className="chat-bubble chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="chat-send"
              onClick={send}
              aria-label="Send"
              disabled={!input.trim() || loading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Open chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
