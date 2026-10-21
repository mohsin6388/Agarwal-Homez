// import { useEffect, useState, useCallback } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { Plus, Upload, Search, Trash2, Pencil, Mail, MessageCircle, CalendarCheck, Users, Send, CheckCircle2, AlertTriangle, RefreshCw, Download, Flame, UserPlus, MessageSquare } from 'lucide-react';
// import { leadApi } from '../../api/leadApi.js';
// import LeadFormModal from './LeadFormModal.jsx';
// import ImportLeadsModal from './ImportLeadsModal.jsx';
// import SaveAudienceModal from '../audiences/SaveAudienceModal.jsx';
// import { downloadSampleSheet } from '../../lib/sampleSheet.js';

// // Lead rules (same as backend config/leadRules.js)
// const LEAD_SCORE = 30;
// const HOT_SCORE = 60;

// const LEAD_TYPE = {
//   visit: { label: 'Visit lead', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', bar: 'bg-teal-500' },
//   hot: { label: 'Hot lead', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', bar: 'bg-red-500' },
//   lead: { label: 'Lead', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-500' },
//   contact: { label: 'Contact', className: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300', bar: 'bg-ink-400' },
// };

// const STAGES = [
//   { key: 'all', label: 'All leads', rule: `Reply + score ${LEAD_SCORE} se upar`, icon: Users, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300' },
//   { key: 'hot', label: 'Hot leads', rule: `Score ${HOT_SCORE} se upar`, icon: Flame, tone: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
//   { key: 'visit', label: 'Visit leads', rule: 'WhatsApp par site visit final', icon: CalendarCheck, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300' },
// ];

// function fmtDate(value) {
//   if (!value) return '—';
//   const date = new Date(value);
//   return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
// }

// function MessageState({ state, sentAt, replyAt }) {
//   const value = String(state || 'not_sent').replaceAll('_', ' ');
//   const tone = state === 'sent' || state === 'delivered' || state === 'read' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : state === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : state === 'pending' || state === 'processing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400';
//   return <div className="min-w-[125px]"><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${tone}`}>{value}</span><p className="mt-1 text-[11px] text-ink-400">{replyAt ? `Replied ${fmtDate(replyAt)}` : sentAt ? `Sent ${fmtDate(sentAt)}` : 'No activity yet'}</p></div>;
// }

// function ReplyState({ at, count }) {
//   return <div className="min-w-[115px]"><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${at ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>{at ? `Reply · ${count || 1}` : 'No reply'}</span><p className="mt-1 text-[11px] text-ink-400">{fmtDate(at)}</p></div>;
// }

// function Stat({ label, value, icon: Icon, tone }) {
//   return <div className="card !p-3"><div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={16} /></span><div className="min-w-0"><p className="truncate text-[11px] text-ink-500 dark:text-ink-400">{label}</p><p className="font-display text-lg font-bold text-ink-900 dark:text-white">{Number(value || 0).toLocaleString('en-IN')}</p></div></div></div>;
// }

// function ScoreCell({ lead }) {
//   const score = Number(lead.leadScore || 0);
//   const type = LEAD_TYPE[lead.leadType] || LEAD_TYPE.contact;
//   return <div className="flex min-w-[110px] items-center gap-2"><span className="w-7 font-display text-base font-bold text-ink-900 dark:text-white">{score}</span><span className="block h-2 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" aria-hidden="true"><span className={`block h-2 ${type.bar}`} style={{ width: `${Math.min(100, score)}%` }} /></span></div>;
// }

// const UPLOAD_HEADINGS = ['', 'Name', 'Mobile / WhatsApp', 'Email address', 'Address', 'Job title', 'Source', 'Added', 'Actions'];
// const QUALIFIED_HEADINGS = ['Name', 'Mobile / WhatsApp', 'Email address', 'WhatsApp send', 'WhatsApp reply', 'Email send', 'Email reply', 'Last response', 'Score', 'Actions'];

// export default function LeadsPage({ qualifiedOnly = false, replyChannel = '' }) {
//   const navigate = useNavigate();
//   const [searchParams, setSearchParams] = useSearchParams();
//   const stage = qualifiedOnly && ['hot', 'visit'].includes(searchParams.get('stage')) ? searchParams.get('stage') : 'all';
//   const [leads, setLeads] = useState([]);
//   const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
//   const [summary, setSummary] = useState({});
//   const [search, setSearch] = useState('');
//   const [selected, setSelected] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [notice, setNotice] = useState('');
//   const [showForm, setShowForm] = useState(false);
//   const [showImport, setShowImport] = useState(false);
//   const [showAudience, setShowAudience] = useState(false);
//   const [editingLead, setEditingLead] = useState(null);

//   const fetchLeads = useCallback(async (page = 1) => {
//     setLoading(true);
//     setError('');
//     try {
//       const res = await leadApi.list({
//         page,
//         limit: 50,
//         ...(search.trim() ? { search: search.trim() } : {}),
//         ...(qualifiedOnly ? { qualifiedOnly: 1, stage, sortBy: 'leadScore', sortOrder: 'desc' } : {}),
//         ...(qualifiedOnly && replyChannel ? { replyChannel } : {}),
//       });
//       setLeads(res.data.leads || []);
//       setPagination(res.data.pagination || { page, limit: 50, total: 0, totalPages: 1 });
//       setSummary(res.data.summary || {});
//       setSelected([]);
//     } catch (err) {
//       setError(err?.response?.data?.message || 'Data load nahi hua. Connection check karke refresh karein.');
//     } finally { setLoading(false); }
//   }, [search, qualifiedOnly, stage, replyChannel]);

//   useEffect(() => { fetchLeads(1); }, [fetchLeads]);

//   const toggleSelect = (id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
//   const pageIds = leads.map((lead) => lead._id);
//   const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
//   const togglePage = () => setSelected((items) => allOnPage ? items.filter((id) => !pageIds.includes(id)) : [...new Set([...items, ...pageIds])]);

//   const handleDelete = async (id) => {
//     if (!window.confirm('Is contact ko delete karna hai? Is action ko undo nahi kiya ja sakta.')) return;
//     try { await leadApi.remove(id); await fetchLeads(Math.min(pagination.page, pagination.totalPages || 1)); }
//     catch (err) { setError(err?.response?.data?.message || 'Contact delete nahi hua.'); }
//   };
//   const handleBulkDelete = async () => {
//     if (!selected.length || !window.confirm(`${selected.length} selected contacts delete karne hain?`)) return;
//     try { await leadApi.bulkDelete(selected); setSelected([]); await fetchLeads(1); }
//     catch (err) { setError(err?.response?.data?.message || 'Selected contacts delete nahi hue.'); }
//   };

//   const setStage = (key) => {
//     const next = new URLSearchParams(searchParams);
//     if (key === 'all') next.delete('stage'); else next.set('stage', key);
//     setSearchParams(next, { replace: true });
//   };

//   const channelTitle = replyChannel === 'whatsapp' ? 'WhatsApp Leads' : replyChannel === 'email' ? 'Email Leads' : 'Qualified Leads';
//   const headings = qualifiedOnly ? QUALIFIED_HEADINGS : UPLOAD_HEADINGS;
//   const qualified = summary.qualified || {};

//   return <div className="mx-auto max-w-[1800px] space-y-5">
//     <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{qualifiedOnly ? channelTitle : 'Upload Data'}</h1><p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{qualifiedOnly ? `Reply aane ke baad baat-cheet ka score ${LEAD_SCORE} se upar gaya to lead, ${HOT_SCORE} se upar hot lead, visit final hote hi visit lead.` : 'Jinko bulk WhatsApp ya Email bhejna hai — naam, mobile, email, address aur job title.'}</p></div>
//       <div className="flex flex-wrap gap-2">{!qualifiedOnly && <><button onClick={downloadSampleSheet} className="btn-secondary flex items-center gap-2"><Download size={16} /> Sample sheet</button><button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2"><Upload size={16} /> CSV / Excel upload</button><button onClick={() => { setEditingLead(null); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add contact</button></>}<button onClick={() => fetchLeads(pagination.page)} disabled={loading} className="btn-secondary flex items-center gap-2"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
//     </div>

//     {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><span className="flex items-center gap-2"><AlertTriangle size={17} />{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
//     {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

//     {qualifiedOnly ? <div role="tablist" aria-label="Lead type" className="grid gap-3 sm:grid-cols-3">
//       {STAGES.map((item) => { const Icon = item.icon; const active = stage === item.key; return <button key={item.key} type="button" role="tab" aria-selected={active} onClick={() => setStage(item.key)} className={`card !p-3 text-left transition ${active ? 'ring-2 ring-brand-500 dark:ring-brand-400' : 'hover:border-brand-300'}`}><div className="flex items-center gap-2.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink-700 dark:text-ink-200">{item.label}</p><p className="truncate text-[11px] text-ink-400">{item.rule}</p></div><p className="font-display text-xl font-bold text-ink-900 dark:text-white">{Number(qualified[item.key] || 0).toLocaleString('en-IN')}</p></div></button>; })}
//     </div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
//       <Stat label="Total contacts" value={summary.total} icon={Users} tone="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300" />
//       <Stat label="WhatsApp ready" value={summary.whatsappAvailable} icon={MessageCircle} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
//       <Stat label="Email ready" value={summary.emailAvailable} icon={Mail} tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" />
//       <Stat label="Both channels" value={summary.bothAvailable} icon={Send} tone="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300" />
//       <Stat label="Customer replied" value={summary.repliedContacts} icon={CheckCircle2} tone="bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300" />
//       <Stat label="Site visit records" value={summary.siteVisits} icon={CalendarCheck} tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" />
//     </div>}

//     <div className="card flex flex-wrap items-center gap-3 !p-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={qualifiedOnly ? 'Search name, email, mobile…' : 'Search name, mobile, email, address, job title…'} className="input-field pl-9" aria-label="Search contacts" /></div>{!qualifiedOnly && selected.length > 0 && <><button onClick={() => setShowAudience(true)} className="btn-primary flex items-center gap-2"><UserPlus size={15} /> {selected.length} select · Audience banao</button><button onClick={handleBulkDelete} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700"><Trash2 size={15} /> Delete {selected.length}</button></>}</div>

//     <div className="card overflow-hidden !p-0"><div className="overflow-x-auto"><table className={`w-full text-sm ${qualifiedOnly ? 'min-w-[1350px]' : 'min-w-[1150px]'}`}><thead className="sticky top-0 bg-ink-50 dark:bg-ink-800"><tr>{headings.map((heading, index) => <th key={`${heading}-${index}`} className={`whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300 ${!qualifiedOnly && index === 0 ? 'w-10' : ''}`}>{!qualifiedOnly && index === 0 ? <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all contacts on this page" /> : heading}</th>)}</tr></thead>
//       <tbody>{loading ? <tr><td colSpan={headings.length} className="px-4 py-16 text-center text-ink-400">Loading…</td></tr> : leads.length === 0 ? <tr><td colSpan={headings.length} className="px-4 py-16 text-center"><Users size={30} className="mx-auto mb-2 text-ink-300" /><p className="font-semibold text-ink-600 dark:text-ink-300">{qualifiedOnly ? 'Abhi is list mein koi lead nahi hai' : 'No contacts yet'}</p><p className="mt-1 text-sm text-ink-400">{qualifiedOnly ? `Jab reply ke baad score ${LEAD_SCORE} se upar jayega, ya visit book hogi, lead yahan apne-aap aayegi.` : 'Sample sheet bharke upload karein, ya contact manually add karein.'}</p></td></tr>
//         : qualifiedOnly ? leads.map((lead) => { const type = LEAD_TYPE[lead.leadType] || LEAD_TYPE.contact; return <tr key={lead._id} className="border-t border-ink-100 align-top hover:bg-ink-50/60 dark:border-ink-800 dark:hover:bg-ink-800/40">
//           <td className="min-w-[180px] max-w-[240px] px-3 py-3"><p className="font-semibold text-ink-900 dark:text-white">{lead.name || 'Unnamed lead'}</p><span className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${type.className}`}>{type.label}</span>{lead.latestSiteVisit && <p className="mt-1 whitespace-nowrap text-[11px] text-ink-400">Visit · {lead.latestSiteVisit.preferredDate} {lead.latestSiteVisit.preferredTime}</p>}</td>
//           <td className="whitespace-nowrap px-3 py-3 text-ink-600 dark:text-ink-300">{lead.phone || '—'}</td>
//           <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{lead.email || '—'}</td>
//           <td className="px-3 py-3"><MessageState state={lead.whatsappMessageStatus} sentAt={lead.whatsappSentAt} /></td>
//           <td className="px-3 py-3"><ReplyState at={lead.whatsappReplyAt} count={lead.whatsappReplyCount} /></td>
//           <td className="px-3 py-3"><MessageState state={lead.emailMessageStatus} sentAt={lead.emailSentAt} /></td>
//           <td className="px-3 py-3"><ReplyState at={lead.emailReplyAt} count={lead.emailReplyCount} /></td>
//           <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500 dark:text-ink-400">{fmtDate(lead.lastReplyAt)}</td>
//           <td className="px-3 py-3"><ScoreCell lead={lead} /></td>
//           <td className="px-3 py-3"><div className="flex gap-1.5">{lead.whatsappReplyAt && <button onClick={() => navigate(`/whatsapp/conversations?lead=${lead._id}`)} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-200"><MessageSquare size={13} /> Chat</button>}{lead.emailReplyAt && <button onClick={() => navigate('/email/conversations')} className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-200"><Mail size={13} /> Email</button>}<button aria-label={`Edit ${lead.name}`} onClick={() => { setEditingLead(lead); setShowForm(true); }} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"><Pencil size={15} /></button></div></td>
//         </tr>; })
//         : leads.map((lead) => <tr key={lead._id} className="border-t border-ink-100 align-top hover:bg-ink-50/60 dark:border-ink-800 dark:hover:bg-ink-800/40">
//           <td className="px-3 py-3"><input aria-label={`Select ${lead.name}`} type="checkbox" checked={selected.includes(lead._id)} onChange={() => toggleSelect(lead._id)} /></td>
//           <td className="max-w-[220px] px-3 py-3"><p className="font-semibold text-ink-900 dark:text-white">{lead.name || 'Unnamed contact'}</p>{lead.replyReceived && <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">Replied</span>}</td>
//           <td className="whitespace-nowrap px-3 py-3 text-ink-600 dark:text-ink-300">{lead.phone || '—'}</td>
//           <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{lead.email || '—'}</td>
//           <td className="max-w-[240px] px-3 py-3 text-ink-600 dark:text-ink-300"><span className="line-clamp-2" title={lead.address || ''}>{lead.address || [lead.location, lead.city].filter(Boolean).join(', ') || '—'}</span></td>
//           <td className="px-3 py-3 text-ink-600 dark:text-ink-300">{lead.jobTitle || lead.occupation || '—'}</td>
//           <td className="px-3 py-3"><span className="rounded-full bg-ink-100 px-2 py-1 text-[11px] font-semibold capitalize text-ink-600 dark:bg-ink-800 dark:text-ink-300">{String(lead.source || 'manual').replace(/^file_import.*/, 'file upload').replaceAll('_', ' ')}</span></td>
//           <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500 dark:text-ink-400">{fmtDate(lead.createdAt)}</td>
//           <td className="px-3 py-3"><div className="flex gap-2"><button aria-label={`Edit ${lead.name}`} onClick={() => { setEditingLead(lead); setShowForm(true); }} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"><Pencil size={15} /></button><button aria-label={`Delete ${lead.name}`} onClick={() => handleDelete(lead._id)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 size={15} /></button></div></td>
//         </tr>)}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 dark:border-ink-800"><p className="text-xs text-ink-500 dark:text-ink-400">Showing {leads.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{selected.length ? ` · ${selected.length} selected` : ''}</p><div className="flex items-center gap-2"><button disabled={pagination.page <= 1 || loading} onClick={() => fetchLeads(pagination.page - 1)} className="btn-secondary !px-3 !py-1.5 disabled:opacity-40">Previous</button><span className="text-xs text-ink-500 dark:text-ink-400">Page {pagination.page} / {pagination.totalPages || 1}</span><button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchLeads(pagination.page + 1)} className="btn-secondary !px-3 !py-1.5 disabled:opacity-40">Next</button></div></div></div>

//     {showForm && <LeadFormModal lead={editingLead} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchLeads(pagination.page); }} />}
//     {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} onImported={() => fetchLeads(1)} />}
//     {showAudience && <SaveAudienceModal leadIds={selected} source="selection" onClose={() => setShowAudience(false)} onSaved={(audience) => { setShowAudience(false); setSelected([]); setNotice(`Audience "${audience.name}" save ho gaya (${audience.counts?.total || 0} contacts). WhatsApp ya Email bulk mein ise chunein.`); }} />}
//   </div>;
// }

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Upload,
  Search,
  Trash2,
  Pencil,
  Mail,
  MessageCircle,
  CalendarCheck,
  Users,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Flame,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import { leadApi } from "../../api/leadApi.js";
import LeadFormModal from "./LeadFormModal.jsx";
import ImportLeadsModal from "./ImportLeadsModal.jsx";
import SaveAudienceModal from "../audiences/SaveAudienceModal.jsx";
import { downloadSampleSheet } from "../../lib/sampleSheet.js";

// Lead rules (same as backend config/leadRules.js)
const LEAD_SCORE = 30;
const HOT_SCORE = 60;

const LEAD_TYPE = {
  visit: {
    label: "Visit lead",
    className:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    bar: "bg-teal-500",
  },
  hot: {
    label: "Hot lead",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    bar: "bg-red-500",
  },
  lead: {
    label: "Lead",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  contact: {
    label: "Contact",
    className: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
    bar: "bg-ink-400",
  },
};

const STAGES = [
  {
    key: "all",
    label: "All replied leads",
    rule: "Customer reply · any score",
    icon: Users,
    tone: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
  },
  {
    key: "hot",
    label: "Hot leads",
    rule: `Score ${HOT_SCORE} se upar`,
    icon: Flame,
    tone: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  },
  {
    key: "visit",
    label: "Visit leads",
    rule: "WhatsApp par site visit final",
    icon: CalendarCheck,
    tone: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300",
  },
];

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function MessageState({ state, sentAt, replyAt }) {
  const value = String(state || "not_sent").replaceAll("_", " ");
  const tone =
    state === "sent" || state === "delivered" || state === "read"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : state === "failed"
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        : state === "pending" || state === "processing"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400";
  return (
    <div className="min-w-[125px]">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ${tone}`}
      >
        {value}
      </span>
      <p className="mt-1 text-[11px] text-ink-400">
        {replyAt
          ? `Replied ${fmtDate(replyAt)}`
          : sentAt
            ? `Sent ${fmtDate(sentAt)}`
            : "No activity yet"}
      </p>
    </div>
  );
}

function ReplyState({ at, count }) {
  return (
    <div className="min-w-[115px]">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${at ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"}`}
      >
        {at ? `Reply · ${count || 1}` : "No reply"}
      </span>
      <p className="mt-1 text-[11px] text-ink-400">{fmtDate(at)}</p>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="card !p-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-ink-500 dark:text-ink-400">
            {label}
          </p>
          <p className="font-display text-lg font-bold text-ink-900 dark:text-white">
            {Number(value || 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCell({ lead }) {
  const score = Number(lead.leadScore || 0);
  const type = LEAD_TYPE[lead.leadType] || LEAD_TYPE.contact;
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <span className="w-7 font-display text-base font-bold text-ink-900 dark:text-white">
        {score}
      </span>
      <span
        className="block h-2 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
        aria-hidden="true"
      >
        <span
          className={`block h-2 ${type.bar}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </span>
    </div>
  );
}

const UPLOAD_HEADINGS = [
  "",
  "Name",
  "Mobile / WhatsApp",
  "Email address",
  "Address",
  "Job title",
  "Source",
  "Added",
  "Actions",
];
const QUALIFIED_HEADINGS = [
  "Name",
  "Mobile / WhatsApp",
  "Email address",
  "WhatsApp send",
  "WhatsApp reply",
  "Email send",
  // "Email reply",
  "Last response",
  "Score",
  "Actions",
];

export default function LeadsPage({
  qualifiedOnly = false,
  replyChannel = "",
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stage =
    qualifiedOnly && ["hot", "visit"].includes(searchParams.get("stage"))
      ? searchParams.get("stage")
      : "all";
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const fetchLeads = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");
      try {
        const res = await leadApi.list({
          page,
          limit: 50,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(qualifiedOnly
            ? {
                qualifiedOnly: 1,
                stage,
                sortBy: "leadScore",
                sortOrder: "desc",
              }
            : {}),
          ...(qualifiedOnly && replyChannel ? { replyChannel } : {}),
        });
        setLeads(res.data.leads || []);
        setPagination(
          res.data.pagination || { page, limit: 50, total: 0, totalPages: 1 },
        );
        setSummary(res.data.summary || {});
        setSelected([]);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Data load nahi hua. Connection check karke refresh karein.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, qualifiedOnly, stage, replyChannel],
  );

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const toggleSelect = (id) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  const pageIds = leads.map((lead) => lead._id);
  const allOnPage =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const togglePage = () =>
    setSelected((items) =>
      allOnPage
        ? items.filter((id) => !pageIds.includes(id))
        : [...new Set([...items, ...pageIds])],
    );

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Is contact ko delete karna hai? Is action ko undo nahi kiya ja sakta.",
      )
    )
      return;
    try {
      await leadApi.remove(id);
      await fetchLeads(Math.min(pagination.page, pagination.totalPages || 1));
    } catch (err) {
      setError(err?.response?.data?.message || "Contact delete nahi hua.");
    }
  };
  const handleBulkDelete = async () => {
    if (
      !selected.length ||
      !window.confirm(`${selected.length} selected contacts delete karne hain?`)
    )
      return;
    try {
      await leadApi.bulkDelete(selected);
      setSelected([]);
      await fetchLeads(1);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Selected contacts delete nahi hue.",
      );
    }
  };

  const setStage = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("stage");
    else next.set("stage", key);
    setSearchParams(next, { replace: true });
  };

  const channelTitle =
    replyChannel === "whatsapp"
      ? "WhatsApp Leads"
      : replyChannel === "email"
        ? "Email Leads"
        : "Qualified Leads";
  const headings = qualifiedOnly ? QUALIFIED_HEADINGS : UPLOAD_HEADINGS;
  const qualified = summary.qualified || {};

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            {qualifiedOnly ? channelTitle : "Upload Data"}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {qualifiedOnly
              ? `Customer ka genuine reply aate hi yahan dikhega. Score ${LEAD_SCORE} se upar par Lead, ${HOT_SCORE} se upar Hot Lead, aur site visit book hone par Visit Lead.`
              : "Jinko bulk WhatsApp ya Email bhejna hai — naam, mobile, email, address aur job title."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!qualifiedOnly && (
            <>
              <button
                onClick={downloadSampleSheet}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={16} /> Sample sheet
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload size={16} /> CSV / Excel upload
              </button>
              <button
                onClick={() => {
                  setEditingLead(null);
                  setShowForm(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} /> Add contact
              </button>
            </>
          )}
          <button
            onClick={() => fetchLeads(pagination.page)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={17} />
            {error}
          </span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={17} />
            {notice}
          </span>
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {qualifiedOnly ? (
        <div
          role="tablist"
          aria-label="Lead type"
          className="grid gap-3 sm:grid-cols-3"
        >
          {STAGES.map((item) => {
            const Icon = item.icon;
            const active = stage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStage(item.key)}
                className={`card !p-3 text-left transition ${active ? "ring-2 ring-brand-500 dark:ring-brand-400" : "hover:border-brand-300"}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-700 dark:text-ink-200">
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-ink-400">
                      {item.rule}
                    </p>
                  </div>
                  <p className="font-display text-xl font-bold text-ink-900 dark:text-white">
                    {Number(qualified[item.key] || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="Total contacts"
            value={summary.total}
            icon={Users}
            tone="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
          />
          <Stat
            label="WhatsApp ready"
            value={summary.whatsappAvailable}
            icon={MessageCircle}
            tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
          />
          <Stat
            label="Email ready"
            value={summary.emailAvailable}
            icon={Mail}
            tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
          />
          <Stat
            label="Both channels"
            value={summary.bothAvailable}
            icon={Send}
            tone="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
          />
          <Stat
            label="Customer replied"
            value={summary.repliedContacts}
            icon={CheckCircle2}
            tone="bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300"
          />
          <Stat
            label="Site visit records"
            value={summary.siteVisits}
            icon={CalendarCheck}
            tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
          />
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3 !p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              qualifiedOnly
                ? "Search name, email, mobile…"
                : "Search name, mobile, email, address, job title…"
            }
            className="input-field pl-9"
            aria-label="Search contacts"
          />
        </div>
        {!qualifiedOnly && selected.length > 0 && (
          <>
            <button
              onClick={() => setShowAudience(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus size={15} /> {selected.length} select · Audience banao
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Trash2 size={15} /> Delete {selected.length}
            </button>
          </>
        )}
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table
            className={`w-full text-sm ${qualifiedOnly ? "min-w-[1350px]" : "min-w-[1150px]"}`}
          >
            <thead className="sticky top-0 bg-ink-50 dark:bg-ink-800">
              <tr>
                {headings.map((heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className={`whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-300 ${!qualifiedOnly && index === 0 ? "w-10" : ""}`}
                  >
                    {!qualifiedOnly && index === 0 ? (
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        onChange={togglePage}
                        aria-label="Select all contacts on this page"
                      />
                    ) : (
                      heading
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="px-4 py-16 text-center text-ink-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={headings.length}
                    className="px-4 py-16 text-center"
                  >
                    <Users size={30} className="mx-auto mb-2 text-ink-300" />
                    <p className="font-semibold text-ink-600 dark:text-ink-300">
                      {qualifiedOnly
                        ? "Abhi is list mein koi lead nahi hai"
                        : "No contacts yet"}
                    </p>
                    <p className="mt-1 text-sm text-ink-400">
                      {qualifiedOnly
                        ? "Customer ka genuine WhatsApp ya email reply aate hi contact yahan aayega; score ke hisaab se uski category update hogi."
                        : "Sample sheet bharke upload karein, ya contact manually add karein."}
                    </p>
                  </td>
                </tr>
              ) : qualifiedOnly ? (
                leads.map((lead) => {
                  const type = LEAD_TYPE[lead.leadType] || LEAD_TYPE.contact;
                  return (
                    <tr
                      key={lead._id}
                      className="border-t border-ink-100 align-top hover:bg-ink-50/60 dark:border-ink-800 dark:hover:bg-ink-800/40"
                    >
                      <td className="min-w-[180px] max-w-[240px] px-3 py-3">
                        <p className="font-semibold text-ink-900 dark:text-white">
                          {lead.name || "Unnamed lead"}
                        </p>
                        <span
                          className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${type.className}`}
                        >
                          {type.label}
                        </span>
                        {lead.latestSiteVisit && (
                          <p className="mt-1 whitespace-nowrap text-[11px] text-ink-400">
                            Visit · {lead.latestSiteVisit.preferredDate}{" "}
                            {lead.latestSiteVisit.preferredTime}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-600 dark:text-ink-300">
                        {lead.phone || "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-600 dark:text-ink-300">
                        {lead.email || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <MessageState
                          state={lead.whatsappMessageStatus}
                          sentAt={lead.whatsappSentAt}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ReplyState
                          at={lead.whatsappReplyAt}
                          count={lead.whatsappReplyCount}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <MessageState
                          state={lead.emailMessageStatus}
                          sentAt={lead.emailSentAt}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ReplyState
                          at={lead.emailReplyAt}
                          count={lead.emailReplyCount}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500 dark:text-ink-400">
                        {fmtDate(lead.lastReplyAt)}
                      </td>
                      <td className="px-3 py-3">
                        <ScoreCell lead={lead} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          {lead.whatsappReplyAt && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/whatsapp/conversations?lead=${lead._id}`,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-200"
                            >
                              <MessageSquare size={13} /> Chat
                            </button>
                          )}
                          {lead.emailReplyAt && (
                            <button
                              onClick={() => navigate("/email/conversations")}
                              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-200"
                            >
                              <Mail size={13} /> Email
                            </button>
                          )}
                          <button
                            aria-label={`Edit ${lead.name}`}
                            onClick={() => {
                              setEditingLead(lead);
                              setShowForm(true);
                            }}
                            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead._id}
                    className="border-t border-ink-100 align-top hover:bg-ink-50/60 dark:border-ink-800 dark:hover:bg-ink-800/40"
                  >
                    <td className="px-3 py-3">
                      <input
                        aria-label={`Select ${lead.name}`}
                        type="checkbox"
                        checked={selected.includes(lead._id)}
                        onChange={() => toggleSelect(lead._id)}
                      />
                    </td>
                    <td className="max-w-[220px] px-3 py-3">
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {lead.name || "Unnamed contact"}
                      </p>
                      {lead.replyReceived && (
                        <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Replied
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-600 dark:text-ink-300">
                      {lead.phone || "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">
                      {lead.email || "—"}
                    </td>
                    <td className="max-w-[240px] px-3 py-3 text-ink-600 dark:text-ink-300">
                      <span className="line-clamp-2" title={lead.address || ""}>
                        {lead.address ||
                          [lead.location, lead.city]
                            .filter(Boolean)
                            .join(", ") ||
                          "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-600 dark:text-ink-300">
                      {lead.jobTitle || lead.occupation || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-ink-100 px-2 py-1 text-[11px] font-semibold capitalize text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                        {String(lead.source || "manual")
                          .replace(/^file_import.*/, "file upload")
                          .replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-500 dark:text-ink-400">
                      {fmtDate(lead.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          aria-label={`Edit ${lead.name}`}
                          onClick={() => {
                            setEditingLead(lead);
                            setShowForm(true);
                          }}
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Delete ${lead.name}`}
                          onClick={() => handleDelete(lead._id)}
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Showing{" "}
            {leads.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
            {selected.length ? ` · ${selected.length} selected` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchLeads(pagination.page - 1)}
              className="btn-secondary !px-3 !py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ink-500 dark:text-ink-400">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchLeads(pagination.page + 1)}
              className="btn-secondary !px-3 !py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <LeadFormModal
          lead={editingLead}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchLeads(pagination.page);
          }}
        />
      )}
      {showImport && (
        <ImportLeadsModal
          onClose={() => setShowImport(false)}
          onImported={() => fetchLeads(1)}
        />
      )}
      {showAudience && (
        <SaveAudienceModal
          leadIds={selected}
          source="selection"
          onClose={() => setShowAudience(false)}
          onSaved={(audience) => {
            setShowAudience(false);
            setSelected([]);
            setNotice(
              `Audience "${audience.name}" save ho gaya (${audience.counts?.total || 0} contacts). WhatsApp ya Email bulk mein ise chunein.`,
            );
          }}
        />
      )}
    </div>
  );
}
