import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Send, Bot, UserCog, CheckCheck, X, Users, MessageCircleMore } from 'lucide-react';
import { conversationApi } from '../../api/conversationApi.js';
import { getSocket } from '../../lib/socket.js';
import { useSearchParams } from 'react-router-dom';

const FILTERS = ['hot', 'needs_reply'];
const FILTER_LABELS = { hot: 'Hot', needs_reply: 'Aapka reply chahiye' };
const initials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'C';
const messageTime = (value) => value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''; 

// A lead's `source` tells us whether it entered the CRM through the Leads
// section (manually added / CSV-imported) or messaged the connected
// WhatsApp number first and was auto-created by the webhook handler.
// Everything that isn't 'whatsapp_inbound' is treated as a CRM lead.
function sourceTag(source) {
  if (source === 'whatsapp_inbound') {
    return {
      label: 'Direct WhatsApp',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      Icon: MessageCircleMore,
    };
  }
  return {
    label: 'Lead',
    className: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200',
    Icon: Users,
  };
}

export default function ConversationsPage() {
  const [searchParams] = useSearchParams();
  const requestedLeadId = searchParams.get('leadId');
  const [conversations, setConversations] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null); // { conversation, messages }
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchList = useCallback(async () => {
    const res = await conversationApi.list({
      ...(filter ? { filter } : {}),
      ...(search ? { search } : {}),
      ...(!filter && !search.trim() && requestedLeadId ? { leadId: requestedLeadId } : {}),
      limit: 50,
    });
    setConversations(res.data.conversations);
  }, [filter, search, requestedLeadId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    const res = await conversationApi.get(id);
    setActive(res.data);
    if (res.data.conversation.unreadCount > 0) {
      await conversationApi.markRead(id);
      fetchList();
    }
  }, [fetchList]);

  // Qualified Leads deep-links to the matching customer conversation.
  useEffect(() => {
    if (!requestedLeadId || !conversations.length) return;
    const target = conversations.find((conversation) =>
      String(conversation.leadId?._id || conversation.leadId) === String(requestedLeadId)
    );
    if (!target || target._id === activeId) return;
    openConversation(target._id).catch((error) => {
      console.error('[conversations] Failed to open requested lead conversation', error);
    });
  }, [requestedLeadId, conversations, activeId, openConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  // Real-time: new messages push into the open thread + refresh the list order/unread badges
  useEffect(() => {
    const socket = getSocket();
    const onNewMessage = ({ conversationId, message }) => {
      fetchList();
      if (conversationId === activeId) {
        setActive((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      }
    };
    socket.on('conversation:newMessage', onNewMessage);
    return () => socket.off('conversation:newMessage', onNewMessage);
  }, [activeId, fetchList]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      if (active?.conversation?.status !== 'manual') {
        const takeover = await conversationApi.takeover(activeId);
        setActive((prev) => prev ? { ...prev, conversation: takeover.data.conversation } : prev);
      }
      await conversationApi.sendMessage(activeId, text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const toggleAI = async () => {
    if (active.conversation.status === 'manual') {
      const res = await conversationApi.resumeAI(activeId);
      setActive((p) => ({ ...p, conversation: res.data.conversation }));
    } else {
      const res = await conversationApi.takeover(activeId);
      setActive((p) => ({ ...p, conversation: res.data.conversation }));
    }
    fetchList();
  };

  const handleClose = async () => {
    if (!confirm('Close this conversation?')) return;
    const res = await conversationApi.close(activeId);
    setActive((p) => ({ ...p, conversation: res.data.conversation }));
    fetchList();
  };

  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">WhatsApp Conversations</h1><p className="mt-1 text-sm text-ink-500">Customer ke reply aur AI ne jo baat ki — sab ek jagah, upar short summary ke saath.</p></header>
    <div className="flex min-h-[calc(100vh-12rem)] gap-3">
      {/* Left: conversation list */}
      <div className="flex w-full max-w-xs flex-shrink-0 flex-col rounded-xl border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-3 dark:border-ink-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-ink-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam ya number"
              className="w-full rounded-lg border border-ink-200 py-2 pl-8 pr-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button onClick={() => setFilter('')} className={`rounded-full px-2 py-1 text-xs ${!filter ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>Sab</button>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2 py-1 text-xs capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
                {FILTER_LABELS[f] || f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const tag = sourceTag(c.leadId?.source);
            return (
              <button
                key={c._id}
                onClick={() => openConversation(c._id)}
                className={`flex w-full flex-col gap-1 border-b border-ink-50 px-3 py-3 text-left dark:border-ink-800 ${activeId === c._id ? 'bg-brand-50 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-800">{initials(c.leadId?.name)}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-ink-900 dark:text-white">{c.leadId?.name || 'Unknown'}</span><span className="text-[10px] text-ink-400">{messageTime(c.lastMessageAt)}</span></div><p className="truncate text-xs text-ink-500 dark:text-ink-400">{c.lastMessagePreview || c.leadId?.phone || 'Message preview unavailable'}</p></div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-10">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{c.tag||'lead'} · {c.currentLeadScore??c.leadId?.leadScore??0}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tag.className}`}><tag.Icon size={10} /> {tag.label}</span>
                  {c.unreadCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                </div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <p className="p-4 text-center text-sm text-ink-400">Koi conversation nahi mili</p>
          )}
        </div>
      </div>

      {/* Right: thread */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-400">
            Ek conversation select karo
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-ink-100 p-3 dark:border-ink-800">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-900 dark:text-white">{active.conversation.leadId?.name}</p>
                  {(() => {
                    const tag = sourceTag(active.conversation.leadId?.source);
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tag.className}`}>
                        <tag.Icon size={10} /> {tag.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-ink-500 dark:text-ink-400">{active.conversation.leadId?.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAI}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                  title={active.conversation.status === 'manual' ? 'Resume AI' : 'Take over chat'}
                >
                  {active.conversation.status === 'manual' ? <Bot size={14} /> : <UserCog size={14} />}
                  {active.conversation.status === 'manual' ? 'AI dobara chalu karein' : 'AI jawab de raha hai'}
                </button>
                <button onClick={handleClose} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Close conversation">
                  <X size={16} />
                </button>
              </div>
            </div>

            {active.conversation.aiSummary && (
              <div className="border-b border-ink-100 bg-ink-50 p-2.5 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-300">
                <span className="font-semibold">AI Summary: </span>{active.conversation.aiSummary}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m) => (
                <div key={m._id} className={`flex ${m.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender === 'customer'
                      ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white'
                      : m.sender === 'ai'
                      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100'
                      : 'bg-brand-600 text-white'
                  }`}>
                    <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider opacity-60">{m.sender === 'customer' ? 'CUSTOMER' : m.sender === 'ai' ? 'PROPAI AI' : 'AAP'}</p><p>{m.text}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                      {m.sender !== 'customer' && <CheckCheck size={11} />}
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.sender === 'ai' && <span className="ml-1">· AI</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-ink-100 p-3 dark:border-ink-800">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Khud reply likhein (AI ruk jayega)"
                className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
              <button type="submit" disabled={sending} className="btn-primary flex items-center gap-1.5">
                <Send size={16} /><span className="hidden sm:inline">Bhejein</span>
              </button>
            </form>
          </>
        )}
      </div>
      <aside className="hidden w-64 flex-shrink-0 space-y-3 xl:block">
        <section className="card"><h3 className="font-bold">Short summary</h3><p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{active?.conversation?.aiSummary || 'Conversation summary abhi available nahi hai.'}</p><div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20"><p className="text-xs text-ink-500">Score</p><p className="text-2xl font-extrabold text-emerald-800">{active?.conversation?.currentLeadScore ?? active?.conversation?.leadId?.leadScore ?? 0}/100</p></div></section>
        <section className="card"><h3 className="font-bold">Customer facts</h3><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-ink-500">Requirement</dt><dd>{active?.conversation?.collectedRequirements?.propertyType || active?.conversation?.leadId?.requirements || '—'}</dd></div><div><dt className="text-xs text-ink-500">Budget</dt><dd>{active?.conversation?.leadId?.budgetMin || active?.conversation?.leadId?.budgetMax ? `₹${active.conversation.leadId.budgetMin||0} – ₹${active.conversation.leadId.budgetMax||0}` : '—'}</dd></div><div><dt className="text-xs text-ink-500">Location</dt><dd>{active?.conversation?.leadId?.city || active?.conversation?.leadId?.location || '—'}</dd></div><div><dt className="text-xs text-ink-500">Site visit</dt><dd>{active?.conversation?.meetingStatus || 'Not booked'}</dd></div></dl></section>
        <section className="card"><h3 className="font-bold">Agla kadam:</h3><p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{active?.conversation?.nextStep || 'Customer ki requirement confirm karein aur site visit offer karein.'}</p><a href="/site-visits" className="mt-3 inline-block text-sm font-bold text-emerald-700">Site visit dekhein →</a></section>
      </aside>
    </div>
    </div>
  );
}
