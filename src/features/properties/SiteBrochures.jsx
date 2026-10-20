import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, ExternalLink, FileText, ImagePlus, Loader2, MapPin, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { siteApi, siteKey } from '../../api/siteApi.js';

/**
 * Properties → "Sites & brochures": one card per site / project, each with
 * its own brochures and photos. Sites come from the Project column of the
 * Excel sheet, so a new project appears here as soon as its row is added.
 * The AI sends the newest brochure of the site the customer asks about.
 */
export default function SiteBrochures({ focusSite = '', onFocusHandled, refreshKey = 0, onChanged }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', city: '', location: '' });
  const [labels, setLabels] = useState({});
  const cardRefs = useRef({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await siteApi.list();
      setSites(res.data.sites || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Sites load nahi hui.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Excel mode → "Add brochure" jumps straight to that site's card.
  useEffect(() => {
    if (!focusSite || loading) return;
    const key = siteKey(focusSite);
    const card = cardRefs.current[key];
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('ring-2', 'ring-brand-500'); setTimeout(() => card.classList.remove('ring-2', 'ring-brand-500'), 2000); }
    else { setNewSite({ name: focusSite, city: '', location: '' }); setAddOpen(true); }
    onFocusHandled?.();
  }, [focusSite, loading, onFocusHandled]);

  const upload = async (site, { brochure, images = [] }) => {
    const key = siteKey(site.name);
    if (brochure && !/\.pdf$/i.test(brochure.name)) { setError('Brochure PDF file honi chahiye.'); return; }
    if (brochure && brochure.size > 30 * 1024 * 1024) { setError('Brochure 30 MB se chhota hona chahiye.'); return; }
    setBusyKey(key); setError(''); setNotice('');
    try {
      const res = await siteApi.uploadBrochure({ siteName: site.name, city: site.city, location: site.location, label: labels[key] || '', brochure, images });
      setNotice(res.message || `${site.name} ke liye save ho gaya.`);
      setLabels((prev) => ({ ...prev, [key]: '' }));
      await load();
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload nahi hua. File aur internet check karein.');
    } finally { setBusyKey(''); }
  };

  const removeBrochure = async (site, brochure) => {
    setBusyKey(siteKey(site.name)); setError('');
    try { await siteApi.removeBrochure(site._id, brochure._id); await load(); onChanged?.(); }
    catch (err) { setError(err?.response?.data?.message || 'Brochure hataya nahi ja saka.'); }
    finally { setBusyKey(''); }
  };

  const removeImage = async (site, url) => {
    setBusyKey(siteKey(site.name)); setError('');
    try { await siteApi.removeImage(site._id, url); await load(); }
    catch (err) { setError(err?.response?.data?.message || 'Photo hatayi nahi ja saki.'); }
    finally { setBusyKey(''); }
  };

  const createSite = async (event) => {
    event.preventDefault();
    if (!newSite.name.trim()) { setError('Site / project ka naam likhein.'); return; }
    const input = event.currentTarget.querySelector('input[type=file]');
    const file = input?.files?.[0];
    if (!file) { setError('Is site ka brochure PDF chunein.'); return; }
    await upload({ name: newSite.name.trim(), city: newSite.city.trim(), location: newSite.location.trim() }, { brochure: file });
    setAddOpen(false); setNewSite({ name: '', city: '', location: '' });
  };

  const withBrochure = sites.filter((s) => s.brochures?.length || s.legacyBrochure).length;

  return <div className="mt-4 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm text-ink-500 dark:text-ink-400">Har site / project ka brochure alag save hota hai. Customer jis project ka brochure maangega, AI usi site ka <b>sabse naya</b> brochure WhatsApp par bhejega. <span className="whitespace-nowrap">{withBrochure} / {sites.length} sites ke brochure taiyaar.</span></p>
      <button type="button" onClick={() => setAddOpen(true)} className="btn-primary inline-flex items-center gap-2 !py-2"><Plus size={15} /> Nayi site + brochure</button>
    </div>
    {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"><span className="flex items-center gap-2"><AlertTriangle size={15} />{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><span className="flex items-center gap-2"><CheckCircle2 size={15} />{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

    {addOpen && <form onSubmit={createSite} className="card !p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-base font-bold text-ink-900 dark:text-white">Nayi site ka brochure</h3><button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close"><X size={16} /></button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor="site-name" className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Site / project ka naam</label><input id="site-name" className="input-field" value={newSite.name} onChange={(e) => setNewSite((s) => ({ ...s, name: e.target.value }))} placeholder="Homez Heights" /></div>
        <div><label htmlFor="site-location" className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Location</label><input id="site-location" className="input-field" value={newSite.location} onChange={(e) => setNewSite((s) => ({ ...s, location: e.target.value }))} placeholder="Gomti Nagar" /></div>
        <div><label htmlFor="site-city" className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">City</label><input id="site-city" className="input-field" value={newSite.city} onChange={(e) => setNewSite((s) => ({ ...s, city: e.target.value }))} placeholder="Lucknow" /></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><input id="site-brochure" type="file" accept="application/pdf,.pdf" className="text-sm" aria-label="Brochure PDF" /><button type="submit" disabled={Boolean(busyKey)} className="btn-primary inline-flex items-center gap-2">{busyKey ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} Save brochure</button></div>
      <p className="mt-2 text-[11px] text-ink-400">Naam wahi rakhein jo Excel mode ke "Project" column mein hai, taaki us project ki saari rows isi brochure se judein.</p>
    </form>}

    {loading ? <div className="card flex items-center justify-center gap-2 py-12 text-sm text-ink-500"><Loader2 size={18} className="animate-spin" /> Loading sites…</div>
      : sites.length === 0 ? <div className="card py-12 text-center text-sm text-ink-500">Abhi koi site nahi. Excel mode mein property add karein ya "Nayi site + brochure" dabayein.</div>
      : <div className="grid gap-4 lg:grid-cols-2">{sites.map((site) => {
        const key = siteKey(site.name);
        const busy = busyKey === key;
        const brochures = [...(site.brochures || [])].reverse();
        return <article key={key} ref={(el) => { cardRefs.current[key] = el; }} className="card !p-4 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Building2 size={19} /></span><div className="min-w-0"><h3 className="truncate font-display text-base font-bold text-ink-900 dark:text-white">{site.name}</h3><p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400"><MapPin size={12} />{[site.location, site.city].filter(Boolean).join(', ') || 'Location nahi di'}</p></div></div>
            <span className="shrink-0 text-right text-xs text-ink-500 dark:text-ink-400"><b className="block font-display text-lg text-ink-900 dark:text-white">{site.units}</b>units · {site.available} available</span>
          </div>

          <div className="mt-3 space-y-2">
            {brochures.length === 0 && !site.legacyBrochure && <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Is site ka brochure nahi hai — customer maangega to AI bhej nahi payega.</p>}
            {brochures.map((brochure, i) => <div key={brochure._id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/60">
              <FileText size={16} className="shrink-0 text-red-600" />
              <a href={brochure.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800 hover:underline dark:text-ink-100">{brochure.label || brochure.name}</a>
              {i === 0 && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">AI yahi bhejega</span>}
              <span className="hidden shrink-0 text-[11px] text-ink-400 sm:inline">{new Date(brochure.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              <a href={brochure.url} target="_blank" rel="noreferrer" className="rounded p-1 text-ink-400 hover:text-brand-600" aria-label={`Open ${brochure.name}`}><ExternalLink size={14} /></a>
              {site._id && <button type="button" disabled={busy} onClick={() => removeBrochure(site, brochure)} className="rounded p-1 text-ink-400 hover:text-red-600" aria-label={`Remove ${brochure.name}`}><Trash2 size={14} /></button>}
            </div>)}
            {!brochures.length && site.legacyBrochure && <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/60"><FileText size={16} className="shrink-0 text-red-600" /><a href={site.legacyBrochure.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-ink-800 hover:underline dark:text-ink-100">{site.legacyBrochure.name}</a><span className="shrink-0 text-[10px] text-ink-400">purana (unit row par)</span></div>}
          </div>

          {site.images?.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{site.images.map((url) => <div key={url} className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-100"><img src={url} alt={`${site.name} photo`} className="h-full w-full object-cover" />{site._id && <button type="button" onClick={() => removeImage(site, url)} className="absolute right-1 top-1 hidden rounded bg-black/60 p-0.5 text-white group-hover:block" aria-label="Remove photo"><X size={12} /></button>}</div>)}</div>}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
            <label htmlFor={`label-${key}`} className="sr-only">Brochure ka naam</label>
            <input id={`label-${key}`} value={labels[key] || ''} onChange={(e) => setLabels((prev) => ({ ...prev, [key]: e.target.value }))} placeholder="Brochure ka naam (optional), jaise Tower B" className="input-field !h-9 min-w-0 flex-1 !py-1.5 text-xs" />
            <label className={`btn-primary inline-flex cursor-pointer items-center gap-1.5 !px-3 !py-2 text-xs ${busy ? 'pointer-events-none opacity-60' : ''}`}>{busy ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}{brochures.length || site.legacyBrochure ? 'Naya brochure' : 'Brochure upload'}<input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(site, { brochure: file }); }} /></label>
            <label className={`btn-secondary inline-flex cursor-pointer items-center gap-1.5 !px-3 !py-2 text-xs ${busy ? 'pointer-events-none opacity-60' : ''}`}><ImagePlus size={13} /> Photos<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = [...(e.target.files || [])].slice(0, 10); e.target.value = ''; if (files.length) upload(site, { images: files }); }} /></label>
          </div>
        </article>;
      })}</div>}
  </div>;
}
