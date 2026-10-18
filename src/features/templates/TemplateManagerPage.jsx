import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, FileText, ImagePlus, Loader2, Mail, MessageCircle, Plus, RefreshCw, Save, Send, Trash2, UploadCloud, X } from 'lucide-react';
import { whatsappApi } from '../../api/whatsappApi.js';
import { emailApi } from '../../api/emailApi.js';
import { uploadApi } from '../../api/uploadApi.js';

const EMAIL_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' }, { value: 'follow_up', label: 'Follow-up' },
  { value: 'property_update', label: 'Property update' }, { value: 'general', label: 'General' },
];

function StatusBadge({ status }) {
  const value = String(status || 'unknown').toUpperCase();
  const styles = value === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : value === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : ['PENDING', 'IN_APPEAL'].includes(value) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles}`}>{value.replaceAll('_', ' ')}</span>;
}

function FieldLabel({ children }) { return <label className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">{children}</label>; }

export default function TemplateManagerPage({ channel = 'email' }) {
  const isWhatsApp = channel === 'whatsapp';
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailCategory, setEmailCategory] = useState('marketing');
  const [waCategory, setWaCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [sampleValues, setSampleValues] = useState('Mohsin, Noida');
  const [imageUrl, setImageUrl] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const resetForm = () => {
    setEditingId(''); setName(''); setSubject(''); setBody(''); setEmailCategory('marketing'); setWaCategory('MARKETING');
    setLanguage('en_US'); setHeaderText(''); setFooterText(''); setSampleValues('Mohsin, Noida'); setImageUrl(''); setBrochureUrl(''); setCtaText(''); setCtaUrl('');
  };

  const loadItems = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = isWhatsApp ? await whatsappApi.allTemplates() : await emailApi.templates();
      setItems(response.data?.templates || []);
    } catch (err) {
      setError(err?.response?.data?.message || (isWhatsApp ? 'Meta templates load nahi hue. Access token, WABA ID aur WhatsApp permissions check karein.' : 'Email templates load nahi hue. Backend connection check karein.'));
      setItems([]);
    } finally { setLoading(false); }
  }, [isWhatsApp]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => { resetForm(); setError(''); setNotice(''); setFormOpen(true); };
  const openEdit = (template) => {
    setError(''); setNotice(''); setEditingId(template._id); setName(template.name || ''); setSubject(template.subject || '');
    setBody(template.body || ''); setEmailCategory(template.category || 'marketing'); setImageUrl(template.imageUrl || ''); setBrochureUrl(template.brochureUrl || ''); setCtaText(template.ctaText || ''); setCtaUrl(template.ctaUrl || ''); setFormOpen(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose a valid image file.'); return; }
    const sizeLimit = isWhatsApp ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > sizeLimit) { setError(isWhatsApp ? 'Meta WhatsApp template sample image 5 MB se chhoti honi chahiye.' : 'Email image 25 MB se chhoti honi chahiye.'); return; }
    setUploading(true); setError(''); setNotice('');
    try {
      const result = await uploadApi.image(file, isWhatsApp ? 'templates/whatsapp' : 'templates/email');
      const url = result.data?.url;
      if (!url) throw new Error('Cloudinary returned no image URL.');
      setImageUrl(url); setNotice('Image Cloudinary par upload ho gayi. Preview right side mein check karein.');
    } catch (err) { setError(err?.response?.data?.message || err.message || 'Image upload nahi hui. Cloudinary settings check karein.'); }
    finally { setUploading(false); }
  };

  const saveEmail = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!name.trim() || !subject.trim() || !body.trim()) { setError('Template name, subject aur message tino required hain.'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), subject: subject.trim(), body: body.trim(), category: emailCategory, imageUrl, brochureUrl, ctaText, ctaUrl };
      if (editingId) await emailApi.updateTemplate(editingId, payload); else await emailApi.createTemplate(payload);
      setNotice(editingId ? 'Email template update ho gaya.' : 'Email template save ho gaya. Ab Bulk Email mein select kar sakte ho.');
      setFormOpen(false); resetForm(); await loadItems();
    } catch (err) { setError(err?.response?.data?.message || 'Email template save nahi hua.'); }
    finally { setSaving(false); }
  };

  const submitWhatsApp = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!name.trim() || !body.trim()) { setError('Template name aur message body required hain.'); return; }
    const vars = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    const max = vars.length ? Math.max(...vars) : 0;
    const samples = sampleValues.split(',').map((v) => v.trim()).filter(Boolean);
    if (max && samples.length < max) { setError(`Body mein {{1}} se {{${max}}} variables hain. ${max} sample values comma se separate karke do.`); return; }
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) { setError('Header image must be a public HTTPS URL.'); return; }
    setSaving(true);
    try {
      const response = await whatsappApi.createTemplate({ name: name.trim().toLowerCase(), category: waCategory, language, bodyText: body.trim(), headerText: imageUrl ? '' : headerText.trim(), headerImageUrl: imageUrl, footerText: footerText.trim(), sampleValues: samples });
      setNotice(response.message || 'Template Meta ko review ke liye submit ho gaya. Approval ke baad refresh karein.');
      setFormOpen(false); resetForm(); await loadItems();
    } catch (err) { setError(err?.response?.data?.message || 'Template Meta ko submit nahi ho paya. Name, sample values aur permissions check karein.'); }
    finally { setSaving(false); }
  };

  const deleteEmail = async (template) => {
    if (!window.confirm(`Delete email template "${template.name}"? Existing campaigns ka saved content safe rahega.`)) return;
    setDeletingId(template._id); setError(''); setNotice('');
    try { await emailApi.deleteTemplate(template._id); setNotice('Email template delete ho gaya.'); await loadItems(); }
    catch (err) { setError(err?.response?.data?.message || 'Template delete nahi hua.'); }
    finally { setDeletingId(''); }
  };

  const deleteWhatsApp = async (template) => {
    if (!window.confirm(`Meta se WhatsApp template "${template.name}" delete karna hai? Ye action undo nahi ho sakta.`)) return;
    setDeletingId(template.name); setError(''); setNotice('');
    try { const result = await whatsappApi.deleteTemplate(template.name); setNotice(result.message || 'WhatsApp template Meta se delete ho gaya.'); await loadItems(); }
    catch (err) { setError(err?.response?.data?.message || 'Meta template delete nahi hua. Permissions ya template status check karein.'); }
    finally { setDeletingId(''); }
  };

  const Icon = isWhatsApp ? MessageCircle : Mail;
  const previewBody = useMemo(() => {
    const values = sampleValues.split(',').map((v) => v.trim());
    return body.replace(/\{\{(\d+)\}\}/g, (whole, index) => values[Number(index) - 1] || whole).replace(/\{\{name\}\}/gi, 'Mohsin').replace(/\{\{email\}\}/gi, 'mohsin@example.com').replace(/\{\{phone\}\}/gi, '+91 98765 43210');
  }, [body, sampleValues]);

  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isWhatsApp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'}`}><Icon size={22}/></span><div><h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{isWhatsApp ? 'WhatsApp Templates' : 'Email Templates'}</h1><p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{isWhatsApp ? 'Build, preview and manage Meta message templates.' : 'Create reusable emails with image previews.'}</p></div></div>
      <div className="flex gap-2"><button type="button" onClick={loadItems} disabled={loading} className="btn-secondary inline-flex items-center gap-2"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>Refresh</button><button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2"><Plus size={16}/>Create template</button></div>
    </div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><AlertCircle size={17} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/><span>{notice}</span></div>}
    {isWhatsApp && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">Meta reviews each template. Only <b>APPROVED</b> templates can be sent in campaigns. Image-header sample upload also needs <code>META_APP_ID</code> in backend env.</div>}

    {formOpen && <section className="card !p-4 sm:!p-5">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">{isWhatsApp ? 'Submit WhatsApp template' : editingId ? 'Edit email template' : 'Create email template'}</h2><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Write on the left; live preview updates on the right.</p></div><button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="Close template form"><X size={18}/></button></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
        <form onSubmit={isWhatsApp ? submitWhatsApp : saveEmail} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel>Template name</FieldLabel><input className="input-field" value={name} onChange={(e) => setName(e.target.value)} maxLength={isWhatsApp ? 120 : 100} placeholder={isWhatsApp ? 'property_offer_2026' : 'New property offer'} required/><p className="mt-1 text-[11px] text-ink-400">{isWhatsApp ? 'Lowercase letters, numbers and underscores.' : 'Name shown in your CRM.'}</p></div>
            {isWhatsApp ? <div><FieldLabel>Meta category</FieldLabel><select className="input-field" value={waCategory} onChange={(e) => setWaCategory(e.target.value)}><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option></select></div> : <div><FieldLabel>Email category</FieldLabel><select className="input-field" value={emailCategory} onChange={(e) => setEmailCategory(e.target.value)}>{EMAIL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>}
          </div>
          {isWhatsApp ? <>
            <div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel>Language</FieldLabel><select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en_US">English (US) — en_US</option><option value="hi">Hindi — hi</option><option value="hi_IN">Hindi (India) — hi_IN</option></select></div><div><FieldLabel>Optional text header (ignored when image is selected)</FieldLabel><input className="input-field" value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={60} placeholder="Agarwaal Homes — Property Update"/></div></div>
            <div><FieldLabel>Message body</FieldLabel><textarea className="input-field resize-y" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1024} placeholder={'Hi {{1}}, we have properties in {{2}}. Book a site visit?'} required/><p className="mt-1 text-[11px] text-ink-400">Use {'{{1}}'}, {'{{2}}'}. Sample values below are submitted to Meta.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><FieldLabel>Sample values (comma separated)</FieldLabel><input className="input-field" value={sampleValues} onChange={(e) => setSampleValues(e.target.value)} placeholder="Mohsin, Noida"/></div><div><FieldLabel>Footer (optional)</FieldLabel><input className="input-field" value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={60} placeholder="Agarwaal Homez"/></div></div>
          </> : <>
            <div><FieldLabel>Email subject</FieldLabel><input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="New properties you may like" required/></div>
            <div><FieldLabel>Email message</FieldLabel><textarea className="input-field resize-y" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={5000} placeholder={'Hi {{name}},\n\nWe have some new properties that may fit your needs…'} required/><p className="mt-1 text-[11px] text-ink-400">Personalize with {'{{name}}'}, {'{{email}}'} or {'{{phone}}'}.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><FieldLabel>Brochure PDF URL (optional)</FieldLabel><input className="input-field" value={brochureUrl} onChange={e=>setBrochureUrl(e.target.value)} placeholder="https://...pdf"/></div><div><FieldLabel>CTA button text</FieldLabel><input className="input-field" value={ctaText} onChange={e=>setCtaText(e.target.value)} maxLength={40} placeholder="Site visit book karein"/></div><div className="sm:col-span-2"><FieldLabel>CTA button URL</FieldLabel><input className="input-field" value={ctaUrl} onChange={e=>setCtaUrl(e.target.value)} placeholder="https://..."/></div></div>
          </>}
          <div><FieldLabel><span className="inline-flex items-center gap-2"><ImagePlus size={15}/>{isWhatsApp ? 'Header image (optional)' : 'Email image (optional)'}</span></FieldLabel><div className="flex flex-wrap items-center gap-3"><label className="btn-secondary inline-flex cursor-pointer items-center gap-2"><UploadCloud size={15}/>{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload}/></label><span className="text-xs text-ink-500 dark:text-ink-400">JPG, PNG or WebP · up to {isWhatsApp ? '5 MB (Meta limit)' : '25 MB'}</span></div>{imageUrl && <div className="mt-2 flex items-center gap-2"><span className="min-w-0 truncate text-xs text-emerald-700 dark:text-emerald-300">Uploaded to Cloudinary</span><button type="button" onClick={() => setImageUrl('')} className="text-xs font-semibold text-red-600 hover:underline">Remove image</button></div>}</div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800"><button type="button" onClick={() => { setFormOpen(false); resetForm(); }} disabled={saving || uploading} className="btn-secondary">Cancel</button><button type="submit" disabled={saving || uploading} className="btn-primary inline-flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : isWhatsApp ? <Send size={16}/> : <Save size={16}/>} {saving ? 'Saving…' : isWhatsApp ? 'Submit for approval' : editingId ? 'Update template' : 'Save template'}</button></div>
        </form>
        <aside className="rounded-2xl border border-ink-100 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-950/50"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-ink-800 dark:text-white">Live preview</h3><span className="text-[10px] uppercase tracking-wider text-ink-400">{isWhatsApp ? 'WhatsApp' : 'Gmail style'}</span></div>
          {isWhatsApp ? <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border border-emerald-100 bg-primary-soft shadow-sm"><div className="bg-emerald-800 px-3 py-2 text-xs font-semibold text-white">Agarwaal Homez · Business</div><div className="min-h-56 p-3"><div className="max-w-[95%] overflow-hidden rounded-xl rounded-tl-sm bg-white shadow-sm">{imageUrl && <img src={imageUrl} alt="WhatsApp template header" className="max-h-52 w-full object-cover"/>}{headerText && !imageUrl && <div className="px-3 pt-3 text-sm font-bold text-slate-800">{headerText}</div>}<div className="whitespace-pre-wrap px-3 py-3 text-sm leading-5 text-slate-700">{previewBody || 'Your WhatsApp message appears here.'}</div>{footerText && <div className="px-3 pb-3 text-xs text-slate-500">{footerText}</div>}<div className="px-3 pb-2 text-right text-[10px] text-slate-400">9:41 AM ✓✓</div></div></div></div>
          : <div className="mx-auto max-w-[430px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-4 py-3"><div className="text-sm font-semibold text-slate-800">Agarwaal Homez</div><div className="mt-1 text-xs text-slate-500">to me</div><div className="mt-2 text-base font-semibold text-slate-900">{subject || 'Your email subject will appear here'}</div></div><div className="min-h-56 p-4">{imageUrl && <img src={imageUrl} alt="Email header" className="mb-4 max-h-56 w-full rounded-lg object-cover"/>}<p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{previewBody || 'Your email content will appear here.'}</p><div className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-400">Agarwaal Homez · Property updates</div></div></div>}
          <p className="mt-3 text-[11px] leading-5 text-ink-500 dark:text-ink-400">Preview sample hai. Gmail/WhatsApp final appearance device, client, Meta template rules and image processing ke hisaab se thodi vary kar sakti hai.</p>
        </aside>
      </div>
    </section>}

    {loading ? <div className="card flex items-center justify-center gap-2 py-14 text-sm text-ink-500"><Loader2 size={18} className="animate-spin"/> Loading templates…</div>
      : items.length === 0 ? <div className="card flex flex-col items-center justify-center py-14 text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800"><FileText size={22}/></span><h2 className="font-display text-base font-bold text-ink-900 dark:text-white">No templates yet</h2><p className="mt-1 max-w-md text-sm text-ink-500 dark:text-ink-400">{isWhatsApp ? 'Create a template and wait for Meta approval before sending.' : 'Create a reusable email, then select it in Bulk Email.'}</p><button type="button" onClick={openCreate} className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={15}/> Create first template</button></div>
      : <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <article key={item.id || item._id} className="card !p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isWhatsApp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'}`}><Icon size={17}/></span><div className="min-w-0"><h3 className="break-words font-semibold text-ink-900 dark:text-white">{item.name}</h3><p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{isWhatsApp ? `${item.category || 'Template'} · ${item.language || 'Language not set'}` : `${EMAIL_CATEGORIES.find((c) => c.value === item.category)?.label || 'General'} · Updated ${new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN')}`}</p></div></div>{isWhatsApp ? <StatusBadge status={item.status}/> : <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Saved</span>}</div>
        {item.imageUrl && <img src={item.imageUrl} alt={`${item.name} image`} className="mt-3 max-h-52 w-full rounded-xl border border-ink-100 object-contain dark:border-ink-800"/>}
        <div className="mt-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/70">{!isWhatsApp && <p className="mb-1 text-xs font-semibold text-ink-700 dark:text-ink-100">Subject: {item.subject}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-600 dark:text-ink-300">{isWhatsApp ? (item.bodyText || (item.components || []).find((c) => String(c.type).toUpperCase() === 'BODY')?.text || 'Template content is available from Meta.') : item.body}</p></div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">{isWhatsApp ? <><button type="button" onClick={() => deleteWhatsApp(item)} disabled={deletingId === item.name} className="btn-secondary !px-3 !py-2 text-xs text-red-600 dark:text-red-300">{deletingId === item.name ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>} Delete from Meta</button><button type="button" onClick={() => navigate('/outreach/whatsapp')} className="btn-primary !px-3 !py-2 text-xs inline-flex items-center gap-1.5">Use in bulk <ArrowRight size={13}/></button></> : <><button type="button" onClick={() => openEdit(item)} className="btn-secondary !px-3 !py-2 text-xs">Edit</button><button type="button" onClick={() => deleteEmail(item)} disabled={deletingId === item._id} className="btn-secondary !px-3 !py-2 text-xs text-red-600 dark:text-red-300">{deletingId === item._id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>} Delete</button><button type="button" onClick={() => navigate('/outreach/email')} className="btn-primary !px-3 !py-2 text-xs inline-flex items-center gap-1.5">Use in bulk <ArrowRight size={13}/></button></>}</div>
      </article>)}</div>}
    {isWhatsApp && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3 dark:border-ink-800"><p className="text-xs text-ink-500 dark:text-ink-400">Only approved templates can be sent. Meta controls approval, not this dashboard.</p><button type="button" onClick={() => navigate('/outreach/whatsapp')} className="btn-primary inline-flex items-center gap-2">Open WhatsApp bulk <ArrowRight size={15}/></button></div>}
  </div>;
}
