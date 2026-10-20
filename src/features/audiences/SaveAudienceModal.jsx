import { useState } from 'react';
import { CheckCircle2, Loader2, Users, X } from 'lucide-react';
import { audienceApi } from '../../api/audienceApi.js';

/**
 * Saves a set of contacts as a reusable audience (used from Upload Data
 * selection, and from Bulk message after selecting rows or uploading a sheet).
 */
export default function SaveAudienceModal({ leadIds, source = 'selection', defaultName = '', onClose, onSaved }) {
  const [name, setName] = useState(defaultName || `Audience ${new Date().toLocaleDateString('en-IN')}`);
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) { setError('Audience ka naam likhein.'); return; }
    setSaving(true); setError('');
    try {
      const response = await audienceApi.create({
        name: name.trim(),
        source,
        leadIds,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      onSaved?.(response.data.audience);
    } catch (err) {
      setError(err?.response?.data?.message || 'Audience save nahi hua.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}>
    <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-ink-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Users size={19} /></span><div><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Save as audience</h2><p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{leadIds.length.toLocaleString('en-IN')} contacts · baad mein WhatsApp ya Email bulk mein seedha chunein.</p></div></div>
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close"><X size={18} /></button>
      </div>
      {error && <div role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
      <label htmlFor="audience-name" className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">Audience name</label>
      <input id="audience-name" className="input-field" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kanpur site visit leads" autoFocus />
      <label htmlFor="audience-tags" className="mb-1.5 mt-3 block text-xs font-semibold text-ink-600 dark:text-ink-300">Tags (optional, comma separated)</label>
      <input id="audience-tags" className="input-field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Kanpur, Site visit" />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving || !leadIds.length} className="btn-primary flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? 'Saving…' : 'Save audience'}</button>
      </div>
    </form>
  </div>;
}
