import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, MessageCircle, Plus, Save, Send, Trash2, UploadCloud, X } from 'lucide-react';
import { whatsappApi } from '../../api/whatsappApi.js';
import WhatsAppPhonePreview from '../../components/ui/WhatsAppPhonePreview.jsx';

const DEFAULTS = ['Ayush', 'Kanpur', '₹80 lakh – ₹85 lakh', '2 BHK', 'Agarwal Homez', 'next week'];
const NAME_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function getComponent(template, type) {
  return (template?.components || []).find((part) => String(part.type || '').toUpperCase() === type) || null;
}

function getTemplateBody(template) {
  return template?.bodyText || getComponent(template, 'BODY')?.text || '';
}

function getTemplateButtons(template) {
  return template?.buttons || getComponent(template, 'BUTTONS')?.buttons || [];
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+/, '');
}

function headerInfo(template) {
  const header = getComponent(template, 'HEADER');
  const raw = String(template?.headerType || '').toLowerCase();
  if (['none', 'text', 'image', 'document'].includes(raw)) return raw;
  if (template?.headerDocumentUrl || template?.documentUrl || String(header?.format).toUpperCase() === 'DOCUMENT') return 'document';
  if (template?.headerImageUrl || template?.imageUrl || String(header?.format).toUpperCase() === 'IMAGE') return 'image';
  if (template?.headerText || String(header?.format).toUpperCase() === 'TEXT') return 'text';
  return 'none';
}

export default function WhatsAppTemplateBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [draftId, setDraftId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('hi');
  const [headerType, setHeaderType] = useState('none');
  const [headerText, setHeaderText] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [headerDocumentUrl, setHeaderDocumentUrl] = useState('');
  const [headerFileName, setHeaderFileName] = useState('');
  const [bodyText, setBodyText] = useState('Namaste {{1}} ji, Agarwal Homez par aapke liye kuch property options hain. Kya aap details dekhna chahenge?');
  const [footerText, setFooterText] = useState('Agarwal Homez');
  const [buttons, setButtons] = useState([{ type: 'QUICK_REPLY', text: 'Site visit book karein' }]);
  const [sampleValuesText, setSampleValuesText] = useState('');
  const [showSampleOverrides, setShowSampleOverrides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const variableIndexes = useMemo(() => [...new Set([...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1])))].sort((a, b) => a - b), [bodyText]);
  const nameValid = NAME_RE.test(name) && name.length <= 512;
  const sampleValues = sampleValuesText.split(',').map((item) => item.trim());
  const previewBody = useMemo(() => {
    const values = sampleValuesText.split(',').map((item) => item.trim());
    return bodyText.replace(/\{\{(\d+)\}\}/g, (token, index) => values[Number(index) - 1] || DEFAULTS[Number(index) - 1] || 'Sample');
  }, [bodyText, sampleValuesText]);

  const applyTemplate = (template, { asCopy = false } = {}) => {
    if (!template) return;
    const nextName = String(template.name || '').trim();
    setDraftId(asCopy ? '' : String(template.draftId || template._id || (template.isDraft ? template.id : '') || ''));
    setName(asCopy ? `${nextName.replace(/_v\d+$/, '')}_v2` : nextName);
    setCategory(String(template.category || 'MARKETING').toUpperCase() === 'UTILITY' ? 'UTILITY' : 'MARKETING');
    setLanguage(template.language || 'hi');
    const type = headerInfo(template);
    setHeaderType(type);
    setHeaderText(template.headerText || getComponent(template, 'HEADER')?.text || '');
    setHeaderImageUrl(template.headerImageUrl || template.imageUrl || '');
    setHeaderDocumentUrl(template.headerDocumentUrl || template.documentUrl || '');
    setHeaderFileName(template.headerFileName || '');
    setBodyText(getTemplateBody(template));
    setFooterText(template.footerText || getComponent(template, 'FOOTER')?.text || '');
    const nextButtons = getTemplateButtons(template).map((button) => ({ type: 'QUICK_REPLY', text: button.text || '' })).slice(0, 3);
    setButtons(nextButtons);
    setSampleValuesText(Array.isArray(template.sampleValues) ? template.sampleValues.join(', ') : '');
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setError('');
      const copyTemplate = location.state?.copyTemplate;
      if (copyTemplate) {
        if (active) applyTemplate(copyTemplate, { asCopy: true });
        return;
      }
      const requestedDraftId = searchParams.get('draftId');
      if (!requestedDraftId) {
        setDraftId(''); setName(''); setCategory('MARKETING'); setLanguage('hi');
        setHeaderType('none'); setHeaderText(''); setHeaderImageUrl(''); setHeaderDocumentUrl(''); setHeaderFileName('');
        setBodyText('Namaste {{1}} ji, Agarwal Homez par aapke liye kuch property options hain. Kya aap details dekhna chahenge?');
        setFooterText('Agarwal Homez'); setButtons([{ type: 'QUICK_REPLY', text: 'Site visit book karein' }]);
        setSampleValuesText(''); setShowSampleOverrides(false); setNotice('');
        return;
      }
      try {
        const result = await whatsappApi.templateDrafts();
        const drafts = result.data?.drafts || [];
        const draft = drafts.find((item) => String(item._id || item.id) === requestedDraftId);
        if (!draft) throw new Error('Draft nahi mila. Templates list refresh karke dobara kholein.');
        if (active) applyTemplate(draft);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || err.message || 'Draft load nahi hua.');
      }
    };
    initialize();
    return () => { active = false; };
    // location.key changes only on navigation, including opening a draft/copy action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, searchParams]);

  const isDocumentHeader = headerType === 'document' || headerType === 'brochure' || headerType === 'pdf';

  const payload = () => ({
    ...(draftId ? { draftId } : {}),
    name: name.trim(),
    category,
    language,
    headerType: isDocumentHeader ? 'document' : headerType,
    headerText: headerType === 'text' ? headerText.trim() : '',
    headerImageUrl: headerType === 'image' ? headerImageUrl : '',
    headerDocumentUrl: isDocumentHeader ? headerDocumentUrl : '',
    headerFileName: isDocumentHeader ? headerFileName : '',
    bodyText: bodyText.trim(),
    footerText: footerText.trim(),
    buttons: buttons.filter((button) => button.text.trim()).map((button) => ({ type: 'QUICK_REPLY', text: button.text.trim() })),
    sampleValues: sampleValues,
  });

  const saveDraft = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await whatsappApi.saveTemplateDraft(payload());
      const draft = result.data?.draft;
      setDraftId(String(draft?._id || draft?.id || draftId || ''));
      setNotice(result.message || 'Draft save ho gaya. Aap baad mein yahin se continue kar sakte hain.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Draft save nahi hua.');
    } finally { setSaving(false); }
  };

  const submitForApproval = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    if (!nameValid) { setSaving(false); setError('Naam lowercase letters/numbers aur single underscore mein rakhein, jaise property_offer.'); return; }
    if (!bodyText.trim()) { setSaving(false); setError('Message likhna zaroori hai.'); return; }
    if (maxVariable && variableIndexes.some((value, index) => value !== index + 1)) { setSaving(false); setError('Variables ka order {{1}}, {{2}}, {{3}} hona chahiye—beech mein gap nahi.'); return; }
    if (headerType === 'text' && !headerText.trim()) { setSaving(false); setError('Header text likhein ya header type badlein.'); return; }
    if (headerType === 'image' && !headerImageUrl) { setSaving(false); setError('Photo header submit karne se pehle image upload karein.'); return; }
    if (isDocumentHeader && !headerDocumentUrl) { setSaving(false); setError('PDF/Brochure header submit karne se pehle file upload karein.'); return; }
    if (buttons.some((button) => button.text.trim().length > 25)) { setSaving(false); setError('Har button ka text 25 characters ya usse kam hona chahiye.'); return; }
    try {
      const result = await whatsappApi.createTemplate(payload());
      navigate('/whatsapp/templates', { state: { notice: result.message || 'Template Meta ko approval ke liye submit ho gaya.' } });
    } catch (err) {
      setError(err?.response?.data?.message || 'Template submit nahi hua. Meta credentials, header file aur template fields check karein.');
    } finally { setSaving(false); }
  };

  const handleHeaderUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (headerType === 'image' && (isPdf || !file.type.startsWith('image/'))) { setError('Photo ke liye JPG, PNG ya WebP chunein.'); return; }
    if (isDocumentHeader && !isPdf) { setError('PDF/Brochure header ke liye PDF file chunein.'); return; }
    const max = isPdf ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) { setError(isPdf ? 'PDF 30 MB se chhoti honi chahiye.' : 'Image 5 MB se chhoti honi chahiye.'); return; }
    setUploading(true); setError(''); setNotice('');
    try {
      const result = await whatsappApi.uploadTemplateHeader(file);
      const uploaded = result.data || {};
      if (!uploaded.url) throw new Error('Upload response mein file URL nahi mila.');
      if (isPdf) { setHeaderDocumentUrl(uploaded.url); setHeaderFileName(uploaded.fileName || file.name); }
      else setHeaderImageUrl(uploaded.url);
      setNotice(isPdf ? 'PDF/Brochure upload ho gayi.' : 'Header photo upload ho gayi.');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Header upload nahi hui. Cloudinary configuration check karein.');
    } finally { setUploading(false); }
  };

  const insertNameVariable = () => {
    const next = Math.max(0, ...[...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]))) + 1;
    setBodyText((value) => `${value}${value.trim() ? '\n' : ''}{{${next}}}`);
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons((current) => [...current, { type: 'QUICK_REPLY', text: '' }]);
  };

  return <div className="mx-auto max-w-7xl space-y-5 pb-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link to="/whatsapp/templates" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary"><ArrowLeft size={14}/> Templates</Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 dark:text-white">Naya WhatsApp template</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">Likhiye, preview dekhiye aur Meta ko approval ke liye bhejiye. Approve hone ke baad bulk message mein dikhega.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"><MessageCircle size={16}/> WhatsApp Cloud API</span>
    </div>

    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><X size={17} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0"/><span>{notice}</span></div>}

    <form onSubmit={submitForApproval} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <section className="card space-y-4 !p-5">
          <div><h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">Template ki details</h2><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Naam unique rakhein. Meta final approval decide karta hai.</p></div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Template ka naam</label>
            <input className="input-field" value={name} onChange={(event) => setName(normalizeName(event.target.value))} placeholder="property_offer_2026" maxLength={512} autoComplete="off" aria-invalid={Boolean(name) && !nameValid} required />
            <p className={`mt-1.5 text-xs ${name && !nameValid ? 'text-red-600' : name ? 'text-emerald-700 dark:text-emerald-300' : 'text-ink-400'}`}>{name && !nameValid ? 'Lowercase letters/numbers aur single underscore use karein.' : name ? 'Naam ka format sahi hai.' : 'Example: property_offer_2026'}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Kis kaam ka</label><select className="input-field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="MARKETING">Marketing (offer, launch)</option><option value="UTILITY">Utility (reminder, update)</option></select></div>
            <div><label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Bhasha</label><select className="input-field" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="hi">Hindi</option><option value="en_US">English</option></select></div>
          </div>
        </section>

        <section className="card space-y-4 !p-5">
          <div><h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">Upar kya dikhe (header)</h2><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Header optional hai. Photo/PDF ko pehle upload kiya jayega, phir Meta ko sample handle bheja jayega.</p></div>
          <div><label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Header type</label><select className="input-field" value={headerType} onChange={(event) => setHeaderType(event.target.value)}><option value="none">Kuch nahi</option><option value="text">Text</option><option value="image">Photo</option><option value="document">PDF</option><option value="brochure">Brochure</option></select></div>
          {headerType === 'text' && <div><label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Header text</label><input className="input-field" maxLength={60} value={headerText} onChange={(event) => setHeaderText(event.target.value)} placeholder="Agarwal Homez — Property Update" required/></div>}
          {(headerType === 'image' || isDocumentHeader) && <div className="rounded-xl border border-dashed border-ink-200 p-4 dark:border-ink-700">
            <label className="btn-secondary inline-flex cursor-pointer items-center gap-2"><UploadCloud size={16}/>{uploading ? 'Upload ho raha hai…' : headerType === 'image' ? 'Photo upload karein' : headerType === 'brochure' ? 'Brochure upload karein' : 'PDF upload karein'}<input type="file" accept={headerType === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,.pdf'} className="hidden" disabled={uploading} onChange={handleHeaderUpload}/></label>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">{headerType === 'image' ? 'JPG, PNG ya WebP · maximum 5 MB' : 'PDF · maximum 30 MB'}</p>
            {(headerType === 'image' && headerImageUrl) && <div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Photo upload ho gayi</span><button type="button" onClick={() => setHeaderImageUrl('')} className="text-xs font-bold text-red-600">Remove</button></div>}
            {(isDocumentHeader && headerDocumentUrl) && <div className="mt-3 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><FileText size={15}/><span className="truncate">{headerFileName || 'Brochure PDF'}</span></span><button type="button" onClick={() => { setHeaderDocumentUrl(''); setHeaderFileName(''); }} className="text-xs font-bold text-red-600">Remove</button></div>}
          </div>}
        </section>

        <section className="card space-y-4 !p-5">
          <div><h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">Message</h2><p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Naam ki jagah {'{{1}}'} likha hai — har customer ko apna naam dikhega. Tip: naam jodne se reply zyada aate hain.</p></div>
          <textarea className="input-field min-h-36 resize-y" value={bodyText} onChange={(event) => setBodyText(event.target.value)} rows={6} maxLength={1024} placeholder="Namaste {{1}} ji..." required/>
          <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={insertNameVariable} className="btn-secondary inline-flex items-center gap-2"><Plus size={15}/> Customer ka naam jodein</button><span className="text-xs text-ink-400">{bodyText.length}/1,024 characters</span></div>
          <details open={showSampleOverrides} onToggle={(event) => setShowSampleOverrides(event.currentTarget.open)} className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50"><summary className="cursor-pointer text-xs font-bold text-ink-700 dark:text-ink-200">Sample values ka optional override</summary><p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Default sample values automatically generate honge (Ayush, Kanpur, etc.). Zaroorat ho to comma-separated values dein.</p><input className="input-field mt-2" value={sampleValuesText} onChange={(event) => setSampleValuesText(event.target.value)} placeholder="Ayush, Kanpur" /></details>
          <div><label className="mb-1.5 block text-sm font-bold text-ink-700 dark:text-ink-200">Footer (optional)</label><input className="input-field" value={footerText} onChange={(event) => setFooterText(event.target.value)} maxLength={60} placeholder="Agarwal Homez"/></div>
        </section>

        <section className="card space-y-4 !p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">Buttons (zyada se zyada 3)</h2><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Quick-reply button ka text 25 characters tak.</p></div><button type="button" onClick={addButton} disabled={buttons.length >= 3} className="btn-secondary inline-flex items-center gap-2"><Plus size={15}/> Button</button></div>
          {buttons.length === 0 && <p className="rounded-lg bg-ink-50 p-3 text-sm text-ink-500 dark:bg-ink-800 dark:text-ink-400">Abhi koi button nahi. Customer sirf message ka reply kar sakta hai.</p>}
          {buttons.map((button, index) => <div key={index} className="flex items-center gap-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-extrabold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{index + 1}</div><input className="input-field" value={button.text} onChange={(event) => setButtons((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} maxLength={25} placeholder={index === 0 ? 'Site visit book karein' : 'Button text'} aria-label={`Quick reply button ${index + 1}`}/><span className="w-8 shrink-0 text-right text-[10px] text-ink-400">{button.text.length}/25</span><button type="button" onClick={() => setButtons((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Button ${index + 1} remove karein`} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></div>)}
        </section>

        <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={saveDraft} disabled={saving || uploading} className="btn-secondary inline-flex items-center gap-2"><Save size={16}/>{saving ? 'Save ho raha hai…' : 'Draft save karein'}</button><button type="submit" disabled={saving || uploading || !nameValid} className="btn-primary inline-flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} {saving ? 'Submit ho raha hai…' : 'Approval ke liye bhejein'}</button></div>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-5">
        <div className="card !p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-ink-900 dark:text-white">Live preview</h2><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Preview mein naam ki jagah: <strong>Ayush</strong></p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{category}</span></div>
          <WhatsAppPhonePreview accountLabel="Business account" customerName="Ayush" greeting="" title={headerType === 'text' ? headerText : ''} body={previewBody} footer={footerText} buttons={buttons.filter((button) => button.text.trim())} headerImage={headerType === 'image' ? headerImageUrl : ''} headerDocumentName={isDocumentHeader ? (headerFileName || 'Brochure.pdf') : ''}/>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"><h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Meta approval yaad rakhein</h3><p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">Sirf Approved status wale templates bulk campaigns mein send kiye ja sakte hain. Button labels, language aur category Meta ki policy ke mutabik honi chahiye.</p></div>
      </aside>
    </form>
  </div>;
}

