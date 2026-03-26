"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import './messages.css';

type Contact = {
  id: number;
  name: string;
  email?: string;
  role: string;
  unread: number;
  is_online?: boolean;
  last_seen?: string | null;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: number;
  created_at: string;
  sender_name?: string;
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function SchoolMessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUserId(u.id);
    }
  }, []);

  const getToken = () => localStorage.getItem('token') || '';

  // ---- Heartbeat: tell the server we are online ----
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/messages/heartbeat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    sendHeartbeat();
    const hb = setInterval(sendHeartbeat, 15000); // every 15s
    return () => clearInterval(hb);
  }, [sendHeartbeat]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/messages/contacts', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        console.warn(`fetchContacts: status ${res.status}`);
        return; // silent fail for polling
      }
      const data = await res.json();
      const list: Contact[] = data.contacts || [];
      setContacts(list);
      // Update selectedContact's online status if it changed
      setSelectedContact(prev => {
        if (!prev) return prev;
        const updated = list.find(c => c.id === prev.id);
        return updated ? { ...prev, is_online: updated.is_online, last_seen: updated.last_seen } : prev;
      });
    } catch (err: any) {
      console.error('fetchContacts error:', err);
    }
  };

  const fetchConversation = async (contactId: number) => {
    try {
      const res = await fetch(`/api/messages/conversation/${contactId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        console.warn(`fetchConversation: status ${res.status}`);
        return; // silent fail for polling
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('fetchConversation error:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ receiver_id: selectedContact.id, content: newMessage.trim() })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to send');
      }
      setNewMessage('');
      fetchConversation(selectedContact.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Poll contacts every 5s
  const contactsPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    fetchContacts();
    contactsPollRef.current = setInterval(fetchContacts, 5000);
    return () => { if (contactsPollRef.current) clearInterval(contactsPollRef.current); };
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedContact) {
      fetchConversation(selectedContact.id);
      pollRef.current = setInterval(() => fetchConversation(selectedContact.id), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredContacts(contacts.filter(c => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)));
    }
  }, [searchQuery, contacts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const avatarBg = (role: string) => `contact-avatar role-${role}`;
  const roleCls = (role: string) => `contact-role role-${role}`;
  const headerBg = (role: string) => {
    switch (role) {
      case 'SCHOOL_ADMIN': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'SECRETARY': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'TEACHER': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
      case 'ASSISTANT': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      default: return '#64748b';
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  let lastDate = '';
  for (const m of messages) {
    const d = m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Unknown';
    if (d !== lastDate) {
      groupedMessages.push({ date: d, msgs: [] });
      lastDate = d;
    }
    groupedMessages[groupedMessages.length - 1].msgs.push(m);
  }

  return (
    <div className="messages-container">
      {/* Sidebar */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>💬 Messages</h2>
          <input
            className="messages-search"
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="messages-contacts-list">
          {filteredContacts.length === 0 && (
            <div style={{ padding: 20, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
              {contacts.length === 0 ? 'No contacts available' : 'No results'}
            </div>
          )}
          {filteredContacts.map(c => (
            <div
              key={c.id}
              className={`messages-contact ${selectedContact?.id === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedContact(c); setError(null); }}
            >
              <div className="contact-avatar-wrapper">
                <div className={avatarBg(c.role)}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <span className={`online-dot ${c.is_online ? 'online' : 'offline'}`} />
              </div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className={roleCls(c.role)}>
                  {c.role.replace('_', ' ')}
                  {!c.is_online && c.last_seen && (
                    <span className="contact-last-seen"> · {timeAgo(c.last_seen)}</span>
                  )}
                </div>
              </div>
              {c.unread > 0 && <span className="contact-badge">{c.unread}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="messages-chat">
        {!selectedContact ? (
          <div className="messages-empty">
            <div className="messages-empty-icon">💬</div>
            <div className="messages-empty-text">Select a conversation</div>
            <div className="messages-empty-sub">Choose a contact from the list to start messaging</div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-avatar-wrapper">
                <div className="chat-header-avatar" style={{ background: headerBg(selectedContact.role) }}>
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <span className={`online-dot header-dot ${selectedContact.is_online ? 'online' : 'offline'}`} />
              </div>
              <div className="chat-header-info">
                <div className="chat-header-name">{selectedContact.name}</div>
                <div className="chat-header-status">
                  {selectedContact.is_online ? (
                    <span className="status-online">● Online</span>
                  ) : (
                    <span className="status-offline">
                      ○ Offline
                      {selectedContact.last_seen && (
                        <span className="last-seen-text"> · Last seen {timeAgo(selectedContact.last_seen)}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {error && <div style={{ color: '#ef4444', fontSize: 13, padding: '8px 0' }}>{error}</div>}
              {messages.length === 0 && (
                <div className="chat-no-messages">
                  <span style={{ fontSize: 40 }}>👋</span>
                  <span>No messages yet. Say hello!</span>
                </div>
              )}
              {groupedMessages.map((group, gi) => (
                <React.Fragment key={gi}>
                  <div className="chat-date-divider">{group.date}</div>
                  {group.msgs.map(m => {
                    const isMine = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          <div>{m.content}</div>
                          <div className="chat-bubble-time">
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                className="chat-input"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
              />
              <button
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                title="Send"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
