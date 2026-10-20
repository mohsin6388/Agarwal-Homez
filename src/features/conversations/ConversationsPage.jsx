import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Send, Bot, UserCog, CheckCheck, X, Users, MessageCircleMore, Sparkles, CalendarCheck, Clock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { conversationApi } from '../../api/conversationApi.js';
import { getSocket } from '../../lib/socket.js';
import { Formatted } from '../../components/WhatsAppPreview.jsx';

const FILTERS = ['unread', 'hot', 'warm', 'cold', 'site_visit', 'closed', 'lost'];

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

const LEAD_SCORE = 30;
const HOT_SCORE = 60;

function leadTypeOf(conversation, meetings = []) {
  const lead = conversation?.leadId || {};
  if (lead.status === 'site_visit' || meetings.length) return { label: 'Visit lead', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' };
  const score = Number(lead.leadScore ?? conversation?.currentLeadScore ?? 0);
  if (score > HOT_SCORE) return { label: 'Hot lead', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
  if (score > LEAD_SCORE) return { label: 'Lead', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  return { label: 'Contact', className: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300' };
}

function money(value) {
  if (value == null) return null;
  const n = Number(value);
  if (!n) return null;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 ? 2 : 0)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Right-hand panel: short summary of what the customer and the AI talked about. */
function SummaryPanel({ active }) {
  const conversation = active.conversation;
  const lead = conversation.leadId || {};
  const insights = active.insights || {};
  const meetings = insights.meetings || [];
  const req = conversation.collectedRequirements || {};
  const type = leadTypeOf(conversation, meetings);
  const score = Number(lead.leadScore ?? conversation.currentLeadScore ?? 0);
  const budget = [money(req.budgetMin), money(req.budgetMax)].filter(Boolean);
  const facts = [
    ['Requirement', [req.bhk && `${req.bhk} BHK`, req.propertyType].filter(Boolean).join(' · ')],
    ['Budget', budget.length === 2 && budget[0] !== budget[1] ? `${budget[0]} – ${budget[1]}` : budget[0]],
    ['City', req.city || lead.city],
    ['Mobile', lead.phone],
    ['Email', lead.email],
  ].filter(([, value]) => value);
  return <aside className="hidden w-80 flex-shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
    <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300"><Sparkles size={13} /> Short summary</p>
      <p className="text-sm leading-6 text-ink-700 dark:text-ink-200">{conversation.aiSummary || 'Customer ke reply aane par AI yahan short summary likhega.'}</p>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/60"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${type.className}`}>{type.label}</span><span className="font-display text-2xl font-bold text-ink-900 dark:text-white">{score}<span className="text-xs font-medium text-ink-400">/100</span></span></div>
      {insights.latestScore?.reason && <p className="mt-2 text-xs leading-5 text-ink-500 dark:text-ink-400">{insights.latestScore.reason}</p>}
      {facts.length > 0 && <dl className="mt-3 space-y-1.5 text-sm">{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-ink-500 dark:text-ink-400">{label}</dt><dd className="truncate text-right font-medium text-ink-800 dark:text-ink-100">{value}</dd></div>)}</dl>}
    </div>
    <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500"><CalendarCheck size={13} /> Site visit</p>
      {meetings.length ? meetings.map((m) => <div key={m._id} className="mb-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900 last:mb-0 dark:bg-teal-900/20 dark:text-teal-100"><p className="font-semibold">{m.preferredDate} · {m.preferredTime}</p><p className="text-xs capitalize">{m.propertyId?.projectName || 'Property not set'} · {String(m.status).replaceAll('_', ' ')}</p></div>) : <p className="text-sm text-ink-400">Abhi koi visit book nahi hui.</p>}
    </div>
    <div className="rounded-xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500"><Clock size={13} /> Next follow-up</p>
      {insights.followUp ? <><p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{new Date(insights.followUp.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p><p className="mt-1 text-sm leading-5 text-ink-600 dark:text-ink-300">{insights.followUp.nextFollowUpMessage}</p></> : <p className="text-sm text-ink-400">Koi follow-up pending nahi.</p>}
    </div>
  </aside>;
}

export default function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      limit: 50,
    });
    setConversations(res.data.conversations);
  }, [filter, search]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // On wide screens open the latest chat straight away so its summary is visible.
  useEffect(() => {
    if (activeId || !conversations.length || searchParams.get('id') || searchParams.get('lead')) return;
    if (window.matchMedia('(min-width: 1280px)').matches) openConversation(conversations[0]._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const openConversation = async (id) => {
    setActiveId(id);
    const res = await conversationApi.get(id);
    setActive(res.data);
    if (res.data.conversation.unreadCount > 0) {
      await conversationApi.markRead(id);
      fetchList();
    }
  };

  // Deep links: ?id=<conversationId> or ?lead=<leadId> (from Leads, Follow Ups, Site Visits)
  useEffect(() => {
    const id = searchParams.get('id');
    const leadId = searchParams.get('lead');
    if (!id && !leadId) return;
    (async () => {
      try {
        if (id) await openConversation(id);
        else {
          const res = await conversationApi.list({ leadId, limit: 1 });
          const match = res.data.conversations?.[0];
          if (match) await openConversation(match._id);
        }
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left: conversation list */}
      <div className="flex w-full max-w-xs flex-shrink-0 flex-col rounded-xl border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-100 p-3 dark:border-ink-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-ink-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="w-full rounded-lg border border-ink-200 py-2 pl-8 pr-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button onClick={() => setFilter('')} className={`rounded-full px-2 py-1 text-xs ${!filter ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>All</button>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2 py-1 text-xs capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const tag = sourceTag(c.leadId?.source);
            const type = leadTypeOf(c);
            return (
              <button
                key={c._id}
                onClick={() => openConversation(c._id)}
                className={`flex w-full flex-col gap-1 border-b border-ink-50 px-3 py-3 text-left dark:border-ink-800 ${activeId === c._id ? 'bg-brand-50 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900 dark:text-white">{c.leadId?.name || 'Unknown'}</span>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unreadCount}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-500 dark:text-ink-400">{c.leadId?.phone}</span>
                  <span className="flex items-center gap-1">
                    {tag.label !== 'Lead' && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tag.className}`}><tag.Icon size={10} /> {tag.label}</span>}
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${type.className}`}>{type.label} · {Number(c.leadId?.leadScore ?? c.currentLeadScore ?? 0)}</span>
                  </span>
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
      <div className="flex flex-1 flex-col rounded-xl border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
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
                    if (tag.label === 'Lead') return null; // lead type is shown in the summary panel
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
                  {active.conversation.status === 'manual' ? 'Resume AI' : 'Take Over'}
                </button>
                <button onClick={handleClose} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" title="Close conversation">
                  <X size={16} />
                </button>
              </div>
            </div>

            {active.conversation.aiSummary && (
              <div className="border-b border-ink-100 bg-ink-50 p-2.5 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-300 xl:hidden">
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
                    <p className="whitespace-pre-wrap break-words"><Formatted text={m.text} /></p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                      {m.sender !== 'customer' && <CheckCheck size={11} />}
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {m.sender === 'ai' && <span className="ml-1">· AI bot</span>}
                      {m.sender === 'broker' && <span className="ml-1">· Aap</span>}
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
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
              />
              <button type="submit" disabled={sending} className="btn-primary flex items-center gap-1.5">
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>

      {active && <SummaryPanel active={active} />}
    </div>
  );
}
