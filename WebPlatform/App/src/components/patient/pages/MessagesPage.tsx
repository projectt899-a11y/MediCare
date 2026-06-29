import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from '../sub-components/ChatWindow';
import '../../../styles/messages.css';
import api from '../../../lib/api';

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  profilePicture: string | null;
  lastMessage: string;
  time: string;
  unread: number;
}

interface DoctorSearchResult {
  id: string;
  name: string;
  specialty: string;
  profilePicture: string | null;
}

const MessagesPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<DoctorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await api.get('/patient/chats');
        setConversations(res.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced doctor search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/doctor/search?name=${encodeURIComponent(value.trim())}`);
        const doctors: DoctorSearchResult[] = (res.data || []).map((d: any) => ({
          id: d.id || d.user_id,
          name: d.name || d.full_name,
          specialty: d.specialty || d.specialization || '—',
          profilePicture: d.profilePicture || d.profile_picture || null,
        }));
        setSearchResults(doctors);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectDoctor = (doctor: DoctorSearchResult) => {
    // Start or open conversation with this doctor
    setSelectedConversation(doctor.id);
    setSearchTerm('');
    setShowDropdown(false);
    setSearchResults([]);

    // Add to conversations list if not already there
    setConversations(prev => {
      if (prev.find(c => c.id === doctor.id)) return prev;
      return [
        {
          id: doctor.id,
          name: doctor.name,
          avatar: doctor.name.charAt(0).toUpperCase(),
          profilePicture: doctor.profilePicture,
          lastMessage: '',
          time: '',
          unread: 0,
        },
        ...prev,
      ];
    });
  };

  const selectedChatData = conversations.find(conv => conv.id === selectedConversation);

  if (loading) return <div className="loading">Loading messages...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="messages-module">
      <div className="module-header">
        <h1>Messages</h1>
      </div>

      <div className="chat-container">
        <div className="chat-list">
          {/* Search box with doctor search */}
          <div className="msg-doctor-search" ref={searchRef} style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            />
            <button className="msg-search-btn" aria-label="Search">
              {searching ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              )}
            </button>

            {/* Search results dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto',
              }}>
                {searchResults.map(doctor => (
                  <div
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f7ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {doctor.profilePicture ? (
                      <img src={doctor.profilePicture} alt={doctor.name}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#3b82f6',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {doctor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e' }}>{doctor.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#888' }}>{doctor.specialty}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showDropdown && searchTerm && !searching && searchResults.length === 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '12px 14px',
                color: '#888', fontSize: '0.875rem',
              }}>
                No doctors found for "{searchTerm}"
              </div>
            )}
          </div>

          {/* Conversations list */}
          <div className="chat-items">
            {conversations.length === 0 ? (
              <div className="no-chats">No conversations yet. Search for a doctor to start chatting.</div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`chat-item ${selectedConversation === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  {conv.profilePicture ? (
                    <img
                      src={conv.profilePicture}
                      alt={conv.name}
                      className="chat-avatar"
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="chat-avatar">{conv.avatar}</div>
                  )}
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="chat-name">{conv.name}</span>
                      <span className="chat-time">{conv.time}</span>
                    </div>
                    <div className="chat-preview">
                      <span className="last-message">{conv.lastMessage}</span>
                      {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ChatWindow
          conversationId={selectedConversation}
          conversationData={selectedChatData}
        />
      </div>
    </div>
  );
};

export default MessagesPage;
