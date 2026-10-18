import { useCallback, useEffect, useState } from 'react';
import { ArrowDownWideNarrow, CalendarCheck, Check, FileSpreadsheet, Flame, Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { leadApi } from '../../api/leadApi.js';
import StatusChip from '../../components/ui/StatusChip.jsx';

const TABS = [
  { id: 'all', label: 'Sab leads', description: 'Score 30 se upar', icon: Users, tone: 'neutral' },
  { id: 'hot', label: 'Hot leads', description: 'Score 60 se upar', icon: Flame, tone: 'hot' },
  { id: 'visit', label: 'Visit leads', description: 'WhatsApp par visit final', icon: CalendarCheck, tone: 'visit' },
];

const number = (value) => Number(value || 0).toLocaleString('en-IN');
const dateText = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

async function downloadWorkbook(response, filename) {
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ChannelCheck({ value }) {
  return value ? <span className="inline-flex items-center gap-1 font-extrabold text-primary"><Check size={15} /> <span className="sr-only">Hua</span></span> : <span className="text-text-muted">—</span>;
}

function LeadType({ lead }) {
  if (lead.tag === 'visit') return <StatusChip tone="visit">Visit lead</StatusChip>;
  if (lead.tag === 'hot') return <StatusChip tone="hot">Hot lead</StatusChip>;
  return <StatusChip tone="neutral">Lead</StatusChip>;
}

export default function QualifiedLeadsPage({ whatsappOnly = false }) {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [tabCounts, setTabCounts] = useState({ all: 0, hot: 0, visit: 0 });
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('leadScore');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await leadApi.list({
        page,
        limit: 50,
        qualifiedOnly: 1,
        tab,
        sortBy,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(whatsappOnly ? { replyChannel: 'whatsapp' } : {}),
      });
      setLeads(response.data?.leads || []);
      setPagination(response.data?.pagination || { page, limit: 50, total: 0, totalPages: 1 });
      setTabCounts(response.data?.tabCounts || response.data?.summary?.tabCounts || { all: 0, hot: 0, visit: 0 });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Qualified leads load nahi hue. Refresh karke dobara try karein.');
    } finally { setLoading(false); }
  }, [tab, sortBy, search, whatsappOnly]);

  useEffect(() => { fetchLeads(1); }, [fetchLeads]);

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      await downloadWorkbook(await leadApi.exportFile({ qualifiedOnly: 1, format: 'xlsx', tab, sortBy, ...(search.trim() ? { search: search.trim() } : {}), ...(whatsappOnly ? { replyChannel: 'whatsapp' } : {}) }), whatsappOnly ? 'whatsapp-qualified-leads.xlsx' : 'qualified-leads.xlsx');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Excel export nahi hua.');
    } finally { setExporting(false); }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1>{whatsappOnly ? 'WhatsApp leads' : 'Qualified Leads'}</h1>
          <p className="page-description">Jinka reply aaya aur baat-cheet ka score 30 se upar gaya, wo yahan apne-aap aa jaate hain.</p>
        </div>
        <button type="button" onClick={exportExcel} disabled={exporting} className="btn-primary self-start sm:self-auto"><FileSpreadsheet size={17} /> {exporting ? 'Excel taiyar ho rahi hai…' : 'Excel download'}</button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-chip-error-text/20 bg-chip-error-bg px-4 py-3 text-sm text-chip-error-text"><X size={18} /><span className="flex-1">{error}</span><button type="button" onClick={() => setError('')} aria-label="Error band karein"><X size={16} /></button></div>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={active} className={`rounded-card border p-5 text-left shadow-card transition ${active ? 'border-primary bg-primary-soft ring-2 ring-primary/10 dark:border-primary/50 dark:bg-primary/10' : 'border-surface-border bg-white hover:border-primary/40 dark:border-ink-800 dark:bg-ink-900'}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-base font-extrabold text-text dark:text-white">{item.label}</p><p className="mt-1 text-sm text-text-muted dark:text-ink-400">{item.description}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone === 'hot' ? 'bg-chip-hot-bg text-chip-hot-text' : item.tone === 'visit' ? 'bg-chip-visit-bg text-chip-visit-text' : 'bg-primary-soft text-primary'}`}><Icon size={19} /></span></div>
            <p className="mt-5 text-3xl font-extrabold tabular-nums text-text dark:text-white">{number(tabCounts[item.id])}</p>
            <div className={`mt-3 h-1 rounded-full ${active ? 'bg-primary' : 'bg-page dark:bg-ink-800'}`} />
          </button>;
        })}
      </div>

      <div className="card !p-3 sm:!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Naam ya number se dhoondhein</span><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Naam ya number se dhoondhein" className="input-field pl-10" /></label>
          <label className="flex w-full items-center gap-2 lg:w-auto"><ArrowDownWideNarrow size={17} className="shrink-0 text-text-muted" /><span className="sr-only">Sort order</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="input-field lg:min-w-[230px]"><option value="leadScore">Score: zyada se kam</option><option value="lastReplyAt">Last response: naya pehle</option></select></label>
          <button type="button" onClick={() => fetchLeads(pagination.page)} disabled={loading} aria-label="Qualified leads refresh karein" className="btn-secondary"><span className={loading ? 'animate-spin' : ''}>↻</span> Refresh</button>
        </div>
      </div>

      <div className="card !p-0">
        <div className="table-scroll rounded-card">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-page text-xs font-extrabold uppercase tracking-wide text-text-muted dark:bg-ink-800 dark:text-ink-300">
              <tr>{['Naam', 'Mobile / WhatsApp', 'Email', 'WA bheja', 'WA reply', 'Email bheja', 'Email reply', 'Last response', 'Score', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="px-4 py-16 text-center text-text-muted">Qualified leads load ho rahe hain…</td></tr> : leads.length === 0 ? <tr><td colSpan={10} className="px-4 py-16 text-center"><Users size={32} className="mx-auto mb-3 text-text-muted/60" /><p className="font-bold">Abhi koi qualified lead nahi hai</p><p className="mt-1 text-sm text-text-muted">Customer ka reply aaye aur AI score 30 se upar ho, to contact yahan dikhega.</p></td></tr> : leads.map((lead) => {
                const score = Math.min(100, Math.max(0, Number(lead.leadScore || 0)));
                const scoreTone = lead.tag === 'visit' ? 'bg-chip-visit-text' : lead.tag === 'hot' ? 'bg-chip-hot-text' : 'bg-primary';
                return <tr key={lead._id} className="border-t border-surface-border align-top dark:border-ink-800">
                  <td className="min-w-[155px] px-3 py-3"><p className="font-extrabold text-text dark:text-white">{lead.name || 'Naam nahi diya'}</p><div className="mt-1.5"><LeadType lead={lead} /></div></td>
                  <td className="whitespace-nowrap px-3 py-3 text-text dark:text-ink-200">{lead.phone || '—'}</td>
                  <td className="max-w-[200px] truncate px-3 py-3 text-text dark:text-ink-200" title={lead.email || ''}>{lead.email || '—'}</td>
                  <td className="px-3 py-3 text-center"><ChannelCheck value={Boolean(lead.whatsappSent)} /></td>
                  <td className="px-3 py-3 text-center"><ChannelCheck value={Boolean(lead.whatsappReplyAt || lead.hasWhatsAppReply)} /></td>
                  <td className="px-3 py-3 text-center"><ChannelCheck value={Boolean(lead.emailSent)} /></td>
                  <td className="px-3 py-3 text-center"><ChannelCheck value={Boolean(lead.emailReplyAt)} /></td>
                  <td className="max-w-[280px] px-3 py-3"><p className="max-w-[280px] truncate text-text dark:text-ink-200" title={lead.lastResponseText || ''}>{lead.lastResponseText || '—'}</p><p className="mt-1 text-xs text-text-muted">{dateText(lead.lastReplyAt)}</p></td>
                  <td className="min-w-[110px] px-3 py-3"><div className="font-extrabold tabular-nums text-text dark:text-white">{score}</div><div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-page dark:bg-ink-800"><div className={`h-full rounded-full ${scoreTone}`} style={{ width: `${score}%` }} /></div></td>
                  <td className="whitespace-nowrap px-3 py-3"><div className="flex flex-col items-start gap-1.5"><Link to={`/whatsapp/conversations?leadId=${encodeURIComponent(lead._id)}`} className="font-bold text-primary underline-offset-4 hover:underline">Chat dekhein</Link>{lead.phone && <a href={`tel:${lead.phone}`} className="font-bold text-text-muted underline-offset-4 hover:underline dark:text-ink-300">Call</a>}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-surface-border px-4 py-3 dark:border-ink-800 sm:flex-row sm:items-center"><p className="text-xs text-text-muted">✓ = hua · — = nahi hua</p><div className="flex items-center gap-2"><span className="text-xs text-text-muted">{number(pagination.total)} leads</span><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => fetchLeads(pagination.page - 1)} className="btn-secondary !min-h-9 !px-3 !py-1.5 disabled:opacity-40">Peeche</button><span className="min-w-20 text-center text-xs text-text-muted">{pagination.page} / {pagination.totalPages || 1}</span><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => fetchLeads(pagination.page + 1)} className="btn-secondary !min-h-9 !px-3 !py-1.5 disabled:opacity-40">Aage</button></div></div>
      </div>
      <p className="px-1 text-sm leading-6 text-text-muted dark:text-ink-400">Score AI deta hai — baat-cheet mein interest, budget aur jaldi ke hisaab se.</p>
    </div>
  );
}
