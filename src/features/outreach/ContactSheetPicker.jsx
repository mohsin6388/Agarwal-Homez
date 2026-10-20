import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search, UserPlus, X } from 'lucide-react';
import { leadApi } from '../../api/leadApi.js';

const PAGE_SIZE = 50;

/**
 * Bulk message → Step 1 "Contacts sheet".
 * Every uploaded / added contact in one spreadsheet-style list with a fixed
 * Sr. no., so the client can pick by ticking rows, Shift-click a run, or type
 * "Sr. no. 1 se 200 tak". A sheet filter shows just one uploaded file.
 */
export default function ContactSheetPicker({ channel, selected, setSelected, fileFilter, setFileFilter, onSaveAudience, refreshKey = 0 }) {
  const isWhatsApp = channel === 'whatsapp';
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState('50');
  const [rangeBusy, setRangeBusy] = useState(false);
  const lastClicked = useRef(null);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Same filters for the visible page and for range selection, so Sr. no. always match.
  const filters = useMemo(() => ({
    channel,
    sortBy: 'createdAt',
    sortOrder: 'asc',
    ...(query ? { search: query } : {}),
    ...(fileFilter ? { file: fileFilter } : {}),
    ...(onlyUnsent ? { delivery: 'unsent' } : {}),
  }), [channel, query, fileFilter, onlyUnsent]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setPage(1); }, [filters]);

  useEffect(() => {
    let active = true;
    leadApi.importFiles().then((res) => { if (active) setFiles(res.data.files || []); }).catch(() => {});
    return () => { active = false; };
  }, [refreshKey]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await leadApi.list({ ...filters, page, limit: PAGE_SIZE });
      setRows(res.data.leads || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || 'Contacts load nahi hue. Refresh karke dobara try karein.');
      setRows([]); setTotal(0);
    } finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const srOf = (index) => (page - 1) * PAGE_SIZE + index + 1;
  const pageIds = rows.map((row) => row._id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected[id]);

  const toggleRow = (index, event) => {
    const id = rows[index]._id;
    const turnOn = !selected[id];
    setSelected((prev) => {
      const next = { ...prev };
      // Shift-click selects every row between the last click and this one.
      if (event?.shiftKey && lastClicked.current !== null) {
        const [a, b] = [lastClicked.current, index].sort((x, y) => x - y);
        rows.slice(a, b + 1).forEach((row) => { if (turnOn) next[row._id] = true; else delete next[row._id]; });
      } else if (turnOn) next[id] = true; else delete next[id];
      return next;
    });
    lastClicked.current = index;
  };

  const togglePage = () => setSelected((prev) => {
    const next = { ...prev };
    if (allOnPage) pageIds.forEach((id) => { delete next[id]; }); else pageIds.forEach((id) => { next[id] = true; });
    return next;
  });

  const selectRange = async (from, to) => {
    const start = Math.max(1, Math.floor(Number(from) || 1));
    const end = Math.min(total, Math.floor(Number(to) || total));
    if (!total || end < start) { setError(`Sr. no. 1 se ${total || 0} ke beech likhein.`); return; }
    setRangeBusy(true); setError('');
    try {
      const res = await leadApi.orderedIds(filters);
      const ids = (res.data.ids || []).slice(start - 1, end);
      setSelected((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Range select nahi hui.');
    } finally { setRangeBusy(false); }
  };

  const activeFile = files.find((item) => item.file === fileFilter);

  return <div className="space-y-3">
    <div className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="sheet-file" className="sr-only">Kaunsi sheet</label>
      <select id="sheet-file" value={fileFilter} onChange={(e) => setFileFilter(e.target.value)} className="input-field sm:max-w-[260px]">
        <option value="">Sab contacts</option>
        {files.map((item) => <option key={item.file} value={item.file}>{item.label} · {Number(isWhatsApp ? item.whatsapp : item.email).toLocaleString('en-IN')}</option>)}
      </select>
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input id="sheet-search" className="input-field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, mobile, email, address ya job title" aria-label="Search contacts" /></div>
    </div>

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-ink-50 px-3 py-2.5 text-xs dark:bg-ink-800/60">
      <span className="font-semibold text-ink-700 dark:text-ink-200">Sr. no.</span>
      <span className="flex items-center gap-1.5"><input id="range-from" type="number" min="1" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="input-field !h-8 !w-20 !px-2 !py-1 text-center text-xs" aria-label="Sr. no. se" /><span className="text-ink-500">se</span><input id="range-to" type="number" min="1" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="input-field !h-8 !w-20 !px-2 !py-1 text-center text-xs" aria-label="Sr. no. tak" /><span className="text-ink-500">tak</span></span>
      <button type="button" onClick={() => selectRange(rangeFrom, rangeTo)} disabled={rangeBusy || loading} className="btn-primary !px-3 !py-1.5 text-xs">{rangeBusy ? <Loader2 size={13} className="animate-spin" /> : 'Select karein'}</button>
      <span className="hidden h-5 w-px bg-ink-200 sm:block dark:bg-ink-700" aria-hidden="true" />
      <button type="button" onClick={() => selectRange(1, total)} disabled={rangeBusy || loading || !total} className="font-semibold text-brand-700 hover:underline disabled:opacity-40 dark:text-brand-300">Sab {Number(total).toLocaleString('en-IN')} select</button>
      {selectedCount > 0 && <button type="button" onClick={() => setSelected({})} className="inline-flex items-center gap-1 font-semibold text-ink-500 hover:text-red-600"><X size={13} /> Clear</button>}
      <label className="ml-auto flex items-center gap-2 text-ink-600 dark:text-ink-300"><input id="only-unsent" type="checkbox" checked={onlyUnsent} onChange={(e) => setOnlyUnsent(e.target.checked)} />Sirf jinhe abhi tak nahi bheja</label>
    </div>

    {activeFile && <p className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400"><FileSpreadsheet size={13} /> Sheet: <b className="text-ink-700 dark:text-ink-200">{activeFile.label}</b> · {activeFile.count} contacts upload hue the</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

    <div className="max-h-[420px] overflow-auto rounded-xl border border-ink-200 dark:border-ink-700">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-ink-100 text-left text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          <tr>
            <th className="w-10 border-b border-ink-200 px-3 py-2.5 dark:border-ink-700"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Is page ke sab contacts select karein" /></th>
            <th className="w-14 border-b border-ink-200 px-2 py-2.5 dark:border-ink-700">Sr.</th>
            <th className="border-b border-ink-200 px-3 py-2.5 dark:border-ink-700">Naam</th>
            <th className="border-b border-ink-200 px-3 py-2.5 dark:border-ink-700">{isWhatsApp ? 'Mobile / WhatsApp' : 'Email'}</th>
            <th className="border-b border-ink-200 px-3 py-2.5 dark:border-ink-700">Address · Job title</th>
            <th className="border-b border-ink-200 px-3 py-2.5 dark:border-ink-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-ink-400"><Loader2 size={22} className="mx-auto animate-spin" /></td></tr>
            : rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-ink-500">Is filter mein koi contact nahi. Upload Data mein sheet daalein ya "Nayi sheet upload" chunein.</td></tr>
            : rows.map((row, index) => {
              const on = Boolean(selected[row._id]);
              const sent = isWhatsApp ? ['sent', 'delivered', 'read'].includes(row.whatsappMessageStatus) : ['sent', 'delivered'].includes(row.emailMessageStatus);
              return <tr key={row._id} onClick={(e) => { if (e.target.tagName !== 'INPUT') toggleRow(index, e); }} className={`cursor-pointer border-b border-ink-100 last:border-0 dark:border-ink-800 ${on ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-ink-50 dark:hover:bg-ink-800/40'}`}>
                <td className="px-3 py-2.5"><input type="checkbox" checked={on} onChange={(e) => toggleRow(index, e.nativeEvent)} aria-label={`Select ${row.name}`} /></td>
                <td className="px-2 py-2.5 font-mono text-xs tabular-nums text-ink-500">{srOf(index)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-ink-900 dark:text-white">{row.name || 'Contact'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-ink-700 dark:text-ink-200">{isWhatsApp ? row.phone : row.email}</td>
                <td className="max-w-[240px] truncate px-3 py-2.5 text-xs text-ink-500 dark:text-ink-400" title={[row.address, row.jobTitle].filter(Boolean).join(' · ')}>{[row.address, row.jobTitle].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${sent ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>{sent ? 'Bheja ja chuka' : 'Nahi bheja'}</span></td>
              </tr>;
            })}
        </tbody>
      </table>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500 dark:text-ink-400">
      <span><b className="text-ink-800 dark:text-ink-100">{selectedCount.toLocaleString('en-IN')}</b> selected · Sr. {total ? srOf(0) : 0}–{Math.min(page * PAGE_SIZE, total)} of {Number(total).toLocaleString('en-IN')} · Shift dabakar click = beech ke sab</span>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 && <button type="button" onClick={onSaveAudience} className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs"><UserPlus size={14} /> Save as audience</button>}
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="btn-secondary !px-2 !py-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span>Page {page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="btn-secondary !px-2 !py-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  </div>;
}
