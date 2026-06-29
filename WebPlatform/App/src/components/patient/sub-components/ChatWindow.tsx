import React, { useState, useEffect, useRef } from 'react';
import '../../../styles/messages.css';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

interface ChatWindowProps {
  conversationId?: string | null;
  conversationData?: any;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, conversationData }) => {
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isCleared, setIsCleared] = useState(false);
  const isClearedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  useEffect(() => {
    // Reset timer state when conversation changes
    setIsTimeExpired(false);
    setTimeRemaining(600);
    if (timerRef.current) clearInterval(timerRef.current);

    // Check if there's an active conversation session
    const sessionStartTime = localStorage.getItem('patientSessionStart');
    if (sessionStartTime) {
      const elapsed = Math.floor((Date.now() - parseInt(sessionStartTime)) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      
      if (remaining === 0) {
        // Timer expired, clear it and allow new session
        localStorage.removeItem('patientSessionStart');
        setIsTimeExpired(false);
      } else {
        setTimeRemaining(remaining);
        startTimer();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    // Reset cleared state when switching conversations
    setIsCleared(false);
    isClearedRef.current = false;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/patient/chats/${conversationId}`);
        setMessages(res.data || []);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Messages fetch error:', err);
      }
    };

    fetchMessages();
    const interval = setInterval(() => {
      // Use ref to avoid stale closure — stops polling after clear
      if (!isClearedRef.current) fetchMessages();
    }, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSendMessage = async () => {
    if ((!message.trim() && !selectedAttachment) || !conversationId) return;

    // Check if time has expired
    if (isTimeExpired) {
      alert('Conversation time has ended. No more messages can be sent.');
      return;
    }

    // Start timer if this is the first message
    const sessionStartTime = localStorage.getItem('patientSessionStart');
    if (!sessionStartTime) {
      const now = Date.now();
      localStorage.setItem('patientSessionStart', now.toString());
      setTimeRemaining(600);
      startTimer();
    }

    try {
      const formData = new FormData();
      if (message.trim()) {
        formData.append('message_text', message);
      }
      if (selectedAttachment) {
        formData.append('attachment', selectedAttachment);
      }

      await api.post(`/patient/chats/${conversationId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessage('');
      setSelectedAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      const res = await api.get(`/patient/chats/${conversationId}`);
      setMessages(res.data || []);
    } catch (err){
      alert('Failed to send message');
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const sessionStartTime = parseInt(localStorage.getItem('patientSessionStart') || '0');
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Timer expired - reset for next session
        alert('10-minute conversation time has ended. You can start a new conversation.');
        localStorage.removeItem('patientSessionStart');
        setIsTimeExpired(false);
        setTimeRemaining(600);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedAttachment(file);
    }
  };

  if (!conversationId) {
    return (
      <div className="no-chat-selected">
        <h3>Select a conversation</h3>
        <p>Choose a conversation from the list to start messaging</p>
      </div>
    );
  }

  return (
    <div className="conversation">
      <div className="conversation-header">
        {conversationData?.profilePicture ? (
          <img 
            src={conversationData.profilePicture} 
            alt={conversationData.name} 
            className="chat-avatar"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div className="chat-avatar">{conversationData?.avatar}</div>
        )}
        <div className="chat-info">
          <h3>{conversationData?.name || 'Doctor'}</h3>
          <span className="online-status">Online</span>
        </div>
        <div className="conversation-actions">
          <div className="timer-display">
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </div>
          <button
            onClick={() => { setMessages([]); setIsCleared(true); isClearedRef.current = true; }}
            title="Clear messages (local only)"
            style={{
              background: 'none',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              color: '#888',
              fontSize: '0.78rem',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path><path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
            Clear
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={`message ${msg.sender_id === user?.id ? 'patient' : 'doctor'}`}
          >
            <div className="message-content">
              {msg.message_text && <p>{msg.message_text}</p>}
              
              {msg.file_path && (
                <div className='message-attachment'>
                  <a href={msg.file_path}
                    target='_blank'
                    rel='noopener noreferrer'
                    download={msg.file_name}
                  >
                    📎 {msg.file_name || 'Attachment'}
                  </a>
                  {msg.file_type?.startsWith('image/') && (
                    <img src={msg.file_path} alt='attachment' style={{maxWidth: '200px', marginTop: '8px', borderRadius: '8px'}} />
                  )}
                </div>
              )}
              
              <span className="message-time">
                {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        {selectedAttachment && (
          <div style={{ padding: '8px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>📎 {selectedAttachment.name}</span>
            <button 
              onClick={() => {
                setSelectedAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>
        )}
        <button className="attach-button" onClick={() => fileInputRef.current?.click()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,.pdf,.doc,.docx,.txt" 
          onChange={handleAttachmentChange}
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-input"
        />
        <button 
          className="send-button" 
          onClick={handleSendMessage}
          disabled={((!message.trim() && !selectedAttachment) || !conversationId) || isTimeExpired}
          style={{ 
            opacity: (((!message.trim() && !selectedAttachment) || !conversationId) || isTimeExpired) ? 0.5 : 1,
            cursor: (((!message.trim() && !selectedAttachment) || !conversationId) || isTimeExpired) ? 'not-allowed' : 'pointer'
          }}
          title={isTimeExpired ? "Conversation time has ended" : "Send message"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;