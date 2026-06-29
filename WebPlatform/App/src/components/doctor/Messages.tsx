import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import "../../styles/messages.css";

const Messages = () => {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  // جلب قايمة المحادثات
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const res = await api.get("/doctor/chats");
        setChats(res.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Reset timer state on component mount
    setIsTimeExpired(false);
    setTimeRemaining(600);
    if (timerRef.current) clearInterval(timerRef.current);

    // Check if there's an active conversation session
    const sessionStartTime = localStorage.getItem('doctorSessionStart');
    if (sessionStartTime) {
      const elapsed = Math.floor((Date.now() - parseInt(sessionStartTime)) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      
      if (remaining === 0) {
        // Timer expired, clear it and allow new session
        localStorage.removeItem('doctorSessionStart');
        setIsTimeExpired(false);
      } else {
        setTimeRemaining(remaining);
        startTimer();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    // Reset timer when switching conversations
    setIsTimeExpired(false);
    setTimeRemaining(600);
    if (timerRef.current) clearInterval(timerRef.current);

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/doctor/chats/${selectedChat}`);
        setMessages(res.data || []);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        
        // Remove unread badge when chat is selected
        setChats(prev => 
          prev.map(chat => 
            chat.id === selectedChat ? { ...chat, unread: 0 } : chat
          )
        );
      } catch (err) {
        console.error("Messages fetch error:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); 

    return () => {
      clearInterval(interval);
    };
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !selectedAttachment) || !selectedChat) return;

    // Check if time has expired
    if (isTimeExpired) {
      alert('Conversation time has ended. No more messages can be sent.');
      return;
    }

    // Start timer if this is the first message
    const sessionStartTime = localStorage.getItem('doctorSessionStart');
    if (!sessionStartTime) {
      const now = Date.now();
      localStorage.setItem('doctorSessionStart', now.toString());
      setTimeRemaining(600);
      startTimer();
    }

    try {
      const formData = new FormData();
      if (messageInput.trim()) {
        formData.append("message_text", messageInput);
      }
      if (selectedAttachment) {
        formData.append("attachment", selectedAttachment);
      }

      await api.post(`/doctor/chats/${selectedChat}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessageInput("");
      setSelectedAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const res = await api.get(`/doctor/chats/${selectedChat}`);
      setMessages(res.data || []);
    } catch (err) {
      alert("Failed to send message");
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const sessionStartTime = parseInt(localStorage.getItem('doctorSessionStart') || '0');
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Timer expired - reset for next session
        alert('10-minute conversation time has ended. You can start a new conversation.');
        localStorage.removeItem('doctorSessionStart');
        setIsTimeExpired(false);
        setTimeRemaining(600);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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

  const selectedChatData = chats.find((chat) => chat.id === selectedChat);

  if (loading) return <div className="loading">Loading messages...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="messages-module">
      <div className="module-header">
        <h1>Messages</h1>
      </div>

      <div className="chat-container">
        <div className="chat-list">
          <div className="search-box">
            <input type="text" placeholder="Search conversations..." />
            <button className="search-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
          </div>

          <div className="chat-items">
            {chats.length === 0 ? (
              <div className="no-chats">No conversations yet</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChat === chat.id ? "active" : ""}`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  {chat.profilePicture ? (
                    <img
                      src={chat.profilePicture}
                      alt={chat.name}
                      className="chat-avatar"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div className="chat-avatar">{chat.avatar}</div>
                  )}
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="chat-name">{chat.name}</span>
                      <span className="chat-time">{chat.time}</span>
                    </div>
                    <div className="chat-preview">
                      <span className="last-message">{chat.lastMessage}</span>
                      {chat.unread > 0 && (
                        <span className="unread-badge">{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedChat ? (
          <div className="conversation">
            <div className="conversation-header">
              {selectedChatData?.profilePicture ? (
                <img
                  src={selectedChatData.profilePicture}
                  alt={selectedChatData.name}
                  className="chat-avatar"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="chat-avatar">{selectedChatData?.avatar}</div>
              )}
              <div className="chat-info">
                <h3>{selectedChatData?.name}</h3>
                <span className="online-status">Online</span>
              </div>
              <div className="conversation-actions">
                <div className="timer-display">
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.sender_id === user?.id ? "doctor" : "patient"}`}
                >
                  <div className="message-content">
                    {msg.message_text && <p>{msg.message_text}</p>}

                    {msg.file_path && (
                      <div className="message-attachment">
                        <a
                          href={msg.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={msg.file_name}
                        >
                          📎 {msg.file_name || "Attachment"}
                        </a>
                        {msg.file_type?.startsWith("image/") && (
                          <img
                            src={msg.file_path}
                            alt="attachment"
                            style={{
                              maxWidth: "200px",
                              marginTop: "8px",
                              borderRadius: "8px",
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className="message-time">
                      {new Date(msg.sent_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              {selectedAttachment && (
                <div
                  style={{
                    padding: "8px",
                    background: "#f0f0f0",
                    borderRadius: "4px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>
                    📎 {selectedAttachment.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "18px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                className="attach-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleAttachmentChange}
              />
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="message-input"
              />
              <button
                className="send-button"
                onClick={handleSendMessage}
                disabled={
                  ((!messageInput.trim() && !selectedAttachment) || !selectedChat) || isTimeExpired
                }
                style={{
                  opacity:
                    ((!messageInput.trim() && !selectedAttachment) ||
                    !selectedChat || isTimeExpired)
                      ? 0.5
                      : 1,
                  cursor:
                    ((!messageInput.trim() && !selectedAttachment) ||
                    !selectedChat || isTimeExpired)
                      ? "not-allowed"
                      : "pointer",
                }}
                title={isTimeExpired ? "Conversation time has ended" : "Send message"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="no-chat-selected">
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
