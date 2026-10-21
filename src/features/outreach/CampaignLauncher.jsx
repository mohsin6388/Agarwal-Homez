// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, MessageCircle, Mail, Plus, Send, Users, X } from 'lucide-react';
// import { leadApi } from '../../api/leadApi.js';
// import { audienceApi } from '../../api/audienceApi.js';
// import SaveAudienceModal from '../audiences/SaveAudienceModal.jsx';
// import ContactSheetPicker from './ContactSheetPicker.jsx';
// import WhatsAppPreview, { partsFromTemplate } from '../../components/WhatsAppPreview.jsx';
// import { downloadSampleSheet } from '../../lib/sampleSheet.js';
// import { campaignApi } from '../../api/outreachApi.js';
// import { whatsappApi } from '../../api/whatsappApi.js';
// import { emailApi } from '../../api/emailApi.js';
// import { Link } from 'react-router-dom';

// function getTemplateVars(template) {
//   const body = (template?.components || []).find((item) => String(item.type).toUpperCase() === 'BODY');
//   const text = String(body?.text || '');
//   const indexes = [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) => Number(match[1]));
//   return [...new Set(indexes)].sort((a, b) => a - b);
// }

// function templateHasImageHeader(template) {
//   const header = (template?.components || []).find((item) => String(item.type).toUpperCase() === 'HEADER');
//   return String(header?.format || '').toUpperCase() === 'IMAGE';
// }

// const SOURCES = [
//   { key: 'sheet', label: 'Contacts sheet' },
//   { key: 'audience', label: 'Saved audience' },
//   { key: 'upload', label: 'Nayi sheet upload' },
// ];

// export default function CampaignLauncher({ channel, onClose, onLaunched, initialTemplate = '' }) {
//   const isWhatsApp = channel === 'whatsapp';
//   const [source, setSource] = useState('sheet');
//   const [fileFilter, setFileFilter] = useState('');
//   const [sheetRefresh, setSheetRefresh] = useState(0);
//   const [audiences, setAudiences] = useState([]);
//   const [audiencesLoading, setAudiencesLoading] = useState(false);
//   const [audienceId, setAudienceId] = useState('');
//   const [audienceInfo, setAudienceInfo] = useState(null); // { ready, total, skippedSent }
//   const [skipAlreadySent, setSkipAlreadySent] = useState(true);
//   const [uploadState, setUploadState] = useState({ loading: false, fileName: '', result: null, error: '' });
//   const [saveUploadAsAudience, setSaveUploadAsAudience] = useState(true);
//   const [showSaveAudience, setShowSaveAudience] = useState(false);
//   const [campaignName, setCampaignName] = useState(`${isWhatsApp ? 'WhatsApp' : 'Email'} campaign ${new Date().toLocaleDateString('en-IN')}`);
//   const [selected, setSelected] = useState({});
//   const [rowsError, setRowsError] = useState('');
//   const [templates, setTemplates] = useState([]);
//   const [templatesLoading, setTemplatesLoading] = useState(false);
//   const [templatesError, setTemplatesError] = useState('');
//   const [emailTemplates, setEmailTemplates] = useState([]);
//   const [emailTemplateId, setEmailTemplateId] = useState('');
//   const [templateName, setTemplateName] = useState('');
//   const [templateVariables, setTemplateVariables] = useState({});
//   const [headerImageUrl, setHeaderImageUrl] = useState('');
//   const [emailSubject, setEmailSubject] = useState('');
//   const [emailBody, setEmailBody] = useState('');
//   const [launching, setLaunching] = useState(false);
//   const [launchError, setLaunchError] = useState('');
//   const [launchMessage, setLaunchMessage] = useState('');
//   const [previewLead, setPreviewLead] = useState(null);

//   const selectedTemplate = useMemo(() => templates.find((item) => `${item.name}::${item.language}` === templateName) || null, [templates, templateName]);
//   const selectedEmailTemplate = useMemo(() => emailTemplates.find((item) => String(item._id) === emailTemplateId) || null, [emailTemplates, emailTemplateId]);
//   const variableIndexes = useMemo(() => getTemplateVars(selectedTemplate), [selectedTemplate]);
//   const previewValues = useMemo(() => {
//     const max = Math.max(0, ...variableIndexes);
//     return Array.from({ length: max }, (_, i) => {
//       const config = templateVariables[i + 1] || { source: 'name', value: '' };
//       if (config.source === 'static') return config.value || '';
//       const lead = previewLead || { name: 'Ayush', phone: '919876543210', email: 'ayush@example.com' };
//       return lead[config.source] || (config.source === 'name' ? 'Sir/Ma\'am' : '');
//     });
//   }, [variableIndexes, templateVariables, previewLead]);
//   const selectedIds = Object.keys(selected).filter((id) => selected[id]);

//   // Preview the message the way the first selected contact will see it.
//   const firstSelectedId = selectedIds[0] || '';
//   useEffect(() => {
//     if (!firstSelectedId) { setPreviewLead(null); return; }
//     let active = true;
//     leadApi.get(firstSelectedId).then((res) => { if (active) setPreviewLead(res.data.lead || null); }).catch(() => { if (active) setPreviewLead(null); });
//     return () => { active = false; };
//   }, [firstSelectedId]);

//   useEffect(() => {
//     if (isWhatsApp) return;
//     let active = true;
//     setTemplatesLoading(true);
//     setTemplatesError('');
//     emailApi.templates().then((response) => {
//       if (!active) return;
//       const items = response.data.templates || [];
//       setEmailTemplates(items);
//       if (!items.length) setTemplatesError('Abhi email template save nahi hai. Email dropdown ke Templates section mein pehle ek template bana lein.');
//     }).catch((err) => {
//       if (active) setTemplatesError(err?.response?.data?.message || 'Email templates load nahi hue. Backend connection check karein.');
//     }).finally(() => { if (active) setTemplatesLoading(false); });
//     return () => { active = false; };
//   }, [isWhatsApp]);

//   useEffect(() => {
//     if (!selectedEmailTemplate) return;
//     setEmailSubject(selectedEmailTemplate.subject || '');
//     setEmailBody(selectedEmailTemplate.body || '');
//   }, [selectedEmailTemplate]);

//   useEffect(() => {
//     if (!isWhatsApp) return;
//     let active = true;
//     setTemplatesLoading(true);
//     setTemplatesError('');
//     whatsappApi.templates().then((response) => {
//       if (!active) return;
//       const items = response.data.templates || [];
//       setTemplates(items);
//       const wanted = items.find((item) => `${item.name}::${item.language}` === initialTemplate || item.name === initialTemplate);
//       if (wanted) setTemplateName(`${wanted.name}::${wanted.language}`);
//       else if (items.length) setTemplateName(`${items[0].name}::${items[0].language}`);
//       else setTemplatesError('Koi approved template nahi mila. Meta WhatsApp Manager mein template approve karein aur Business Account permissions check karein.');
//     }).catch((err) => {
//       if (active) setTemplatesError(err?.response?.data?.message || 'Approved templates load nahi hue. Meta API credentials check karein.');
//     }).finally(() => { if (active) setTemplatesLoading(false); });
//     return () => { active = false; };
//   }, [isWhatsApp, initialTemplate]);

//   // Saved audiences for this channel
//   const loadAudiences = useCallback(async () => {
//     setAudiencesLoading(true);
//     try {
//       const response = await audienceApi.list();
//       setAudiences(response.data.audiences || []);
//     } catch (err) {
//       setRowsError(err?.response?.data?.message || 'Saved audiences load nahi hue.');
//     } finally { setAudiencesLoading(false); }
//   }, []);
//   useEffect(() => { loadAudiences(); }, [loadAudiences]);

//   // Picking an audience fills the selection with its contacts that are ready for this channel.
//   useEffect(() => {
//     if (source !== 'audience' || !audienceId) return;
//     let active = true;
//     setAudienceInfo(null);
//     audienceApi.leads(audienceId, { channel, excludeSent: skipAlreadySent ? 1 : 0 }).then((response) => {
//       if (!active) return;
//       const ids = response.data.leadIds || [];
//       setSelected(Object.fromEntries(ids.map((id) => [id, true])));
//       setAudienceInfo({ ready: response.data.ready, total: response.data.total, skippedSent: response.data.skippedSent });
//     }).catch((err) => { if (active) setLaunchError(err?.response?.data?.message || 'Audience ke contacts load nahi hue.'); });
//     return () => { active = false; };
//   }, [source, audienceId, skipAlreadySent, channel]);

//   const switchSource = (key) => {
//     setSource(key);
//     if (key !== 'sheet') setFileFilter('');
//     setSelected({});
//     setAudienceId('');
//     setAudienceInfo(null);
//     setLaunchError('');
//   };

//   // Upload a new sheet: save contacts (new + already existing) and select them.
//   const handleSheet = async (file) => {
//     if (!file) return;
//     const lower = file.name.toLowerCase();
//     if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) { setUploadState({ loading: false, fileName: '', result: null, error: 'CSV ya Excel (.xlsx) file chunein.' }); return; }
//     setUploadState({ loading: true, fileName: file.name, result: null, error: '' });
//     try {
//       const preview = await leadApi.importPreview(file);
//       const usable = (preview.data.rows || []).filter((row) => row.status !== 'invalid' && (isWhatsApp ? row.phone : row.email));
//       if (!usable.length) throw new Error(`Is sheet mein ${isWhatsApp ? 'WhatsApp number' : 'email'} wala koi sahi contact nahi mila.`);
//       const confirm = await leadApi.importConfirm(usable.map(({ status, errors, isDuplicate, duplicateReason, rowNumber, ...row }) => ({ ...row, source: 'bulk_sheet_upload', importFile: file.name })));
//       const ids = [...new Set([...(confirm.data.leadIds || []), ...(confirm.data.existingLeadIds || [])].map(String))];
//       setSelected(Object.fromEntries(ids.map((id) => [id, true])));
//       let savedAudience = null;
//       if (saveUploadAsAudience && ids.length) {
//         try {
//           const name = `${file.name.replace(/\.(csv|xlsx)$/i, '')} · ${new Date().toLocaleDateString('en-IN')}`.slice(0, 120);
//           savedAudience = (await audienceApi.create({ name, source: 'upload', leadIds: ids })).data.audience;
//           loadAudiences();
//         } catch { /* audience name clash etc. — contacts are still selected */ }
//       }
//       // Show the uploaded sheet in the Contacts sheet with its rows already ticked.
//       setFileFilter(confirm.data.insertedCount ? file.name : '');
//       setSheetRefresh((n) => n + 1);
//       setSource('sheet');
//       setUploadState({
//         loading: false,
//         fileName: file.name,
//         error: '',
//         result: { rows: preview.data.summary?.total || usable.length, ready: ids.length, inserted: confirm.data.insertedCount || 0, invalid: preview.data.summary?.invalid || 0, audienceName: savedAudience?.name || '' },
//       });
//     } catch (err) {
//       setSelected({});
//       setUploadState({ loading: false, fileName: file.name, result: null, error: err?.response?.data?.message || err.message || 'Sheet upload nahi hui.' });
//     }
//   };
//   useEffect(() => { setTemplateVariables({}); setHeaderImageUrl(selectedTemplate?.imageUrl || ''); }, [templateName, selectedTemplate?.imageUrl]);

//   const validate = () => {
//     if (!campaignName.trim()) return 'Campaign name likhna zaroori hai.';
//     if (!selectedIds.length) return 'Kam se kam ek lead select karein.';
//     if (selectedIds.length > 5000) return 'Ek campaign mein maximum 5,000 leads select karein.';
//     if (isWhatsApp) {
//       if (!selectedTemplate) return 'Ek approved Meta template select karein.';
//       if (templateHasImageHeader(selectedTemplate) && !headerImageUrl.trim()) return 'Is template ke image header ke liye public image URL required hai.';
//       for (const index of variableIndexes) {
//         const config = templateVariables[index] || { source: 'name', value: '' };
//         if (config.source === 'static' && !String(config.value || '').trim()) return `Template variable {{${index}}} ki value fill karein.`;
//       }
//     } else {
//       if (!selectedEmailTemplate) return 'Saved email template select karein.';
//       if (!emailSubject.trim()) return 'Selected template ka subject missing hai.';
//       if (!emailBody.trim()) return 'Selected template ka message missing hai.';
//     }
//     return '';
//   };

//   const launch = async (event) => {
//     event.preventDefault();
//     setLaunchError('');
//     setLaunchMessage('');
//     const validation = validate();
//     if (validation) { setLaunchError(validation); return; }
//     setLaunching(true);
//     try {
//       const payload = {
//         name: campaignName.trim(),
//         leadIds: selectedIds,
//         ...(source === 'audience' && audienceId ? { audienceId } : {}),
//         channels: { whatsapp: isWhatsApp, email: !isWhatsApp },
//         dailyLimit: 5000,
//         sendTime: (() => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; })(),
//         startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
//       };
//       if (isWhatsApp) {
//         payload.whatsappTemplateName = selectedTemplate.name;
//         payload.whatsappTemplateLanguage = selectedTemplate.language || 'en_US';
//         payload.whatsappTemplateCategory = selectedTemplate.category || '';
//         payload.whatsappTemplateHeaderImageUrl = headerImageUrl.trim();
//         payload.whatsappTemplateBody = (selectedTemplate.components || []).find((item) => String(item.type).toUpperCase() === 'BODY')?.text || selectedTemplate.bodyText || '';
//         const parts = partsFromTemplate(selectedTemplate);
//         payload.whatsappTemplateHeader = parts.headerText || '';
//         payload.whatsappTemplateFooter = parts.footer || '';
//         payload.whatsappTemplateButtons = parts.buttons.map((button) => button.text).filter(Boolean);
//         payload.whatsappTemplateVariables = variableIndexes.map((index) => ({
//           index,
//           source: templateVariables[index]?.source || 'name',
//           value: templateVariables[index]?.value || '',
//         }));
//       } else {
//         payload.emailTemplateId = selectedEmailTemplate._id;
//         payload.emailSubject = emailSubject.trim();
//         payload.emailBody = emailBody.trim();
//       }
//       const response = await campaignApi.launch(payload);
//       const queued = response.data?.queued || {};
//       const count = isWhatsApp ? queued.whatsapp : queued.email;
//       setLaunchMessage(`${count || 0} ${isWhatsApp ? 'WhatsApp' : 'email'} messages queue mein add hue. Sending progress page par live update hogi.`);
//       onLaunched?.();
//       setTimeout(() => onClose?.(), 1000);
//     } catch (err) {
//       setLaunchError(err?.response?.data?.message || 'Campaign start nahi hui. Settings aur selected contacts check karein.');
//     } finally {
//       setLaunching(false);
//     }
//   };

//   return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !launching) onClose?.(); }}>
//     <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-ink-900">
//       <div className="flex items-start justify-between gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:p-5">
//         <div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isWhatsApp ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>{isWhatsApp ? <MessageCircle size={21} /> : <Mail size={21} />}</span><div><h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">Create {isWhatsApp ? 'WhatsApp' : 'Email'} campaign</h2><p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Audience chunein, template ka preview dekhein, aur bhejein.</p></div></div>
//         <button disabled={launching} onClick={onClose} aria-label="Close campaign launcher" className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={20} /></button>
//       </div>

//       <form onSubmit={launch} className="flex min-h-0 flex-1 flex-col">
//         <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
//           {(launchError || rowsError || templatesError) && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div>{launchError || rowsError || templatesError}</div></div>}
//           {launchMessage && <div className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{launchMessage}</div>}

//           <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
//             <section className="min-w-0 space-y-3">
//               <div><label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-100">Campaign name</label><input className="input-field" maxLength={120} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. Diwali property offer" /></div>
//               <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
//                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                   <div><p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Step 1 · Kisko bhejna hai?</p><p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{selectedIds.length.toLocaleString('en-IN')} contacts selected</p></div>
//                   <div role="tablist" aria-label="Contacts source" className="inline-flex shrink-0 flex-wrap rounded-lg bg-ink-100 p-1 dark:bg-ink-800">{SOURCES.map((item) => <button key={item.key} type="button" role="tab" aria-selected={source === item.key} onClick={() => switchSource(item.key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${source === item.key ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-500 dark:text-ink-300'}`}>{item.label}</button>)}</div>
//                 </div>
//               </div>

//               {source === 'audience' && <div className="space-y-2">
//                 {audiencesLoading ? <div className="flex items-center gap-2 rounded-xl border border-ink-100 p-4 text-sm text-ink-500 dark:border-ink-800"><Loader2 size={16} className="animate-spin" /> Loading audiences…</div>
//                   : audiences.length === 0 ? <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400"><Users size={24} className="mx-auto mb-2 text-ink-300" />Abhi koi saved audience nahi hai. <button type="button" onClick={() => switchSource('sheet')} className="font-semibold text-brand-600 hover:underline">Contacts sheet se chunein</button> ya <button type="button" onClick={() => switchSource('upload')} className="font-semibold text-brand-600 hover:underline">nayi sheet upload karein</button>.</div>
//                   : <div role="radiogroup" aria-label="Saved audiences" className="max-h-[320px] space-y-2 overflow-y-auto pr-1">{audiences.map((item) => { const ready = isWhatsApp ? item.counts?.whatsapp : item.counts?.email; const active = audienceId === item._id; return <button key={item._id} type="button" role="radio" aria-checked={active} onClick={() => setAudienceId(item._id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15 dark:bg-brand-900/20' : 'border-ink-200 hover:border-brand-300 dark:border-ink-700'}`}>{active ? <CheckCircle2 size={18} className="shrink-0 text-brand-600" /> : <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-ink-300" />}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{item.name}</span><span className="block truncate text-xs text-ink-500 dark:text-ink-400">{item.source === 'upload' ? 'Sheet upload' : item.source === 'filter' ? 'Filter' : 'Selected contacts'}{item.tags?.length ? ` · ${item.tags.join(', ')}` : ''}{item.lastUsedAt ? ` · last used ${new Date(item.lastUsedAt).toLocaleDateString('en-IN')}` : ''}</span></span><span className="text-right"><span className="block font-display text-base font-bold text-ink-900 dark:text-white">{Number(ready || 0).toLocaleString('en-IN')}</span><span className="block text-[10px] text-ink-400">{isWhatsApp ? 'WhatsApp' : 'Email'} ready</span></span></button>; })}</div>}
//                 {audienceId && <label className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-ink-800/60 dark:text-ink-300"><input type="checkbox" checked={skipAlreadySent} onChange={(e) => setSkipAlreadySent(e.target.checked)} />Jinhe {isWhatsApp ? 'WhatsApp' : 'email'} pehle ja chuka hai, unhe skip karein{audienceInfo ? ` · ${audienceInfo.ready} ready${audienceInfo.skippedSent ? `, ${audienceInfo.skippedSent} skip` : ''}` : ''}</label>}
//               </div>}

//               {source === 'sheet' && <>
//                 {uploadState.result && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200"><p className="font-semibold">{uploadState.fileName}: {uploadState.result.ready} contacts select ho gaye</p><p className="mt-0.5 text-xs">{uploadState.result.inserted} naye contacts jode gaye{uploadState.result.ready - uploadState.result.inserted > 0 ? `, ${uploadState.result.ready - uploadState.result.inserted} pehle se the` : ''}.{uploadState.result.audienceName ? ` Audience "${uploadState.result.audienceName}" bhi save hua.` : ''} Neeche dekh kar kam-zyada kar sakte hain.</p></div>}
//                 <ContactSheetPicker channel={channel} selected={selected} setSelected={setSelected} fileFilter={fileFilter} setFileFilter={setFileFilter} refreshKey={sheetRefresh} onSaveAudience={() => setShowSaveAudience(true)} />
//               </>}

//               {source === 'upload' && <div className="space-y-3">
//                 <label className={`flex min-h-[170px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/60 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-ink-700 dark:bg-ink-800/40 ${uploadState.loading ? 'pointer-events-none opacity-60' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleSheet(event.dataTransfer.files?.[0]); }}>
//                   {uploadState.loading ? <Loader2 size={30} className="animate-spin text-brand-600" /> : <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"><FileSpreadsheet size={24} /></span>}
//                   <span className="font-semibold text-ink-900 dark:text-white">{uploadState.loading ? 'Sheet padh rahe hain…' : 'CSV ya Excel sheet chunein'}</span>
//                   <span className="mt-1 text-xs text-ink-500 dark:text-ink-400">Name, Mobile / WhatsApp, Email address, Address, Job title</span>
//                   <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => { handleSheet(event.target.files?.[0]); event.target.value = ''; }} />
//                 </label>
//                 <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><label className="flex items-center gap-2 text-ink-600 dark:text-ink-300"><input type="checkbox" checked={saveUploadAsAudience} onChange={(e) => setSaveUploadAsAudience(e.target.checked)} />Is sheet ko audience bhi bana dein</label><button type="button" onClick={downloadSampleSheet} className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline"><Download size={13} /> Sample sheet</button></div>
//                 {uploadState.error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{uploadState.error}</div>}
//                 {uploadState.result && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> {uploadState.fileName}: {uploadState.result.ready} contacts selected</p><p className="mt-1 text-xs">{uploadState.result.inserted} naye contacts Upload Data mein jode gaye{uploadState.result.invalid ? `, ${uploadState.result.invalid} galat rows chhodi gayi` : ''}.{uploadState.result.audienceName ? ` Audience "${uploadState.result.audienceName}" bhi save hua.` : ''}</p></div>}
//               </div>}
//             </section>

//             <section className="space-y-4">
//               {isWhatsApp ? <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
//                 <div className="mb-3 flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-ink-900 dark:text-white">Step 2 · Approved Meta template</h3><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Template first message ke liye required hai.</p></div>{templatesLoading ? <Loader2 size={17} className="animate-spin text-brand-600" /> : <Link to="/whatsapp/templates?new=1" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><Plus size={13} /> New template · approval</Link>}</div>
//                 <label className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">Choose template</label><select value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input-field" disabled={templatesLoading || !templates.length}><option value="">Select an approved template</option>{templates.map((item) => <option key={`${item.name}::${item.language}`} value={`${item.name}::${item.language}`}>{item.name} · {item.language} · {item.category || 'Template'}</option>)}</select>
//                 {selectedTemplate && <div className="mt-3"><div className="mb-2 flex flex-wrap gap-2"><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Approved</span><span className="rounded-full bg-ink-200 px-2 py-1 text-[10px] font-semibold text-ink-600 dark:bg-ink-700 dark:text-ink-300">{selectedTemplate.language}</span></div><WhatsAppPreview {...partsFromTemplate(selectedTemplate)} imageUrl={headerImageUrl || selectedTemplate.imageUrl || ''} values={previewValues} caption={previewLead ? `${previewLead.name || 'Pehla contact'} ko aisa dikhega` : 'Contact chunte hi unke naam ke saath preview dikhega'} /></div>}
//                 {variableIndexes.length > 0 && <div className="mt-4 space-y-3"><p className="text-xs font-semibold text-ink-700 dark:text-ink-200">Template variables</p>{variableIndexes.map((index) => <div key={index} className="grid grid-cols-[100px_minmax(0,1fr)] gap-2"><div className="flex items-center text-xs font-semibold text-ink-500">{'{{'}{index}{'}}'}</div><div className="flex flex-col gap-2 sm:flex-row"><select className="input-field" value={templateVariables[index]?.source || 'name'} onChange={(e) => setTemplateVariables((previous) => ({ ...previous, [index]: { ...previous[index], source: e.target.value } }))}><option value="name">Lead name</option><option value="phone">Mobile number</option><option value="email">Email address</option><option value="static">Custom text</option></select>{templateVariables[index]?.source === 'static' && <input className="input-field" maxLength={1000} value={templateVariables[index]?.value || ''} onChange={(e) => setTemplateVariables((previous) => ({ ...previous, [index]: { ...previous[index], source: 'static', value: e.target.value } }))} placeholder="Variable value" />}</div></div>)}</div>}
//                 {selectedTemplate && templateHasImageHeader(selectedTemplate) && <div className="mt-3"><label className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">Image header URL</label><input type="url" className="input-field" value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} placeholder="https://.../property-offer.jpg" /><p className="mt-1 text-[11px] text-ink-400">Template image is prefilled. A public HTTPS image URL is required by Meta Cloud API.</p></div>}
//               </div> : <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-ink-900 dark:text-white">Step 2 · Choose email template</h3><p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Saved template ka content per-contact personalize hoga.</p></div><Link to="/email/templates" className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">Manage templates</Link></div><label className="mb-1.5 mt-4 block text-xs font-semibold text-ink-600 dark:text-ink-300">Template</label><select className="input-field" value={emailTemplateId} onChange={(e) => setEmailTemplateId(e.target.value)} disabled={templatesLoading || !emailTemplates.length}><option value="">Select a saved email template</option>{emailTemplates.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.category || 'General'}</option>)}</select>{selectedEmailTemplate ? <div className="mt-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/70"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Subject preview</p><p className="mt-1 text-sm font-semibold text-ink-800 dark:text-ink-100">{selectedEmailTemplate.subject}</p>{selectedEmailTemplate.imageUrl && <img src={selectedEmailTemplate.imageUrl} alt="Email template" className="mt-3 max-h-52 w-full rounded-lg object-contain bg-white"/>}<p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-ink-400">Message preview</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink-700 dark:text-ink-200">{selectedEmailTemplate.body}</p><p className="mt-2 text-[11px] text-ink-400">Variables such as {'{{name}}'} are filled per recipient.</p></div> : <div className="mt-3 rounded-lg border border-dashed border-ink-200 p-4 text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">{templatesLoading ? 'Loading saved email templates…' : 'Pehle Email → Templates mein reusable email template create karein.'}</div>}</div>}

//               <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800"><h3 className="text-sm font-bold text-ink-900 dark:text-white">Send now</h3><p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-400">Campaign jobs start as soon as you launch. Messages are still sent one by one with provider-safe pacing; there is no daily schedule or start-time setting.</p></div>
//             </section>
//           </div>
//         </div>
//         <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/70 px-4 py-3 dark:border-ink-800 dark:bg-ink-900 sm:px-5"><p className="text-xs text-ink-500 dark:text-ink-400"><b className="text-ink-800 dark:text-ink-100">{selectedIds.length.toLocaleString('en-IN')}</b> contacts · message tabhi jayega jab aap Start campaign dabayenge.</p><div className="flex gap-2"><button type="button" onClick={onClose} disabled={launching} className="btn-secondary">Cancel</button><button type="submit" disabled={launching || templatesLoading || !selectedIds.length} className="btn-primary flex items-center gap-2 disabled:opacity-50">{launching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{launching ? 'Adding to queue…' : 'Start campaign'}</button></div></div>
//       </form>
//     </div>
//     {showSaveAudience && <SaveAudienceModal leadIds={selectedIds} source="selection" onClose={() => setShowSaveAudience(false)} onSaved={(audience) => { setShowSaveAudience(false); setLaunchMessage(`Audience "${audience.name}" save ho gaya.`); loadAudiences(); }} />}
//   </div>;
// }

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Mail,
  Plus,
  Send,
  Users,
  X,
  Trash2,
} from "lucide-react";
import { leadApi } from "../../api/leadApi.js";
import { audienceApi } from "../../api/audienceApi.js";
import SaveAudienceModal from "../audiences/SaveAudienceModal.jsx";
import ContactSheetPicker from "./ContactSheetPicker.jsx";
import WhatsAppPreview, {
  partsFromTemplate,
} from "../../components/WhatsAppPreview.jsx";
import { downloadSampleSheet } from "../../lib/sampleSheet.js";
import { campaignApi } from "../../api/outreachApi.js";
import { whatsappApi } from "../../api/whatsappApi.js";
import { emailApi } from "../../api/emailApi.js";
import { Link } from "react-router-dom";

function getTemplateVars(template) {
  const body = (template?.components || []).find(
    (item) => String(item.type).toUpperCase() === "BODY",
  );
  const text = String(body?.text || "");
  const indexes = [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((match) =>
    Number(match[1]),
  );
  return [...new Set(indexes)].sort((a, b) => a - b);
}

function templateHasImageHeader(template) {
  const header = (template?.components || []).find(
    (item) => String(item.type).toUpperCase() === "HEADER",
  );
  return String(header?.format || "").toUpperCase() === "IMAGE";
}

const SOURCES = [
  { key: "sheet", label: "Contacts sheet" },
  { key: "audience", label: "Saved audience" },
  { key: "upload", label: "Nayi sheet upload" },
];

export default function CampaignLauncher({
  channel,
  onClose,
  onLaunched,
  initialTemplate = "",
}) {
  const isWhatsApp = channel === "whatsapp";
  const [source, setSource] = useState("sheet");
  const [fileFilter, setFileFilter] = useState("");
  const [sheetRefresh, setSheetRefresh] = useState(0);
  const [audiences, setAudiences] = useState([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [audienceId, setAudienceId] = useState("");
  const [audienceInfo, setAudienceInfo] = useState(null); // { ready, total, skippedSent }
  const [audienceContacts, setAudienceContacts] = useState([]);
  const [audienceContactsLoading, setAudienceContactsLoading] = useState(false);
  const [deletingAudienceId, setDeletingAudienceId] = useState("");
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [uploadState, setUploadState] = useState({
    loading: false,
    fileName: "",
    result: null,
    error: "",
  });
  const [saveUploadAsAudience, setSaveUploadAsAudience] = useState(true);
  const [showSaveAudience, setShowSaveAudience] = useState(false);
  const [campaignName, setCampaignName] = useState(
    `${isWhatsApp ? "WhatsApp" : "Email"} campaign ${new Date().toLocaleDateString("en-IN")}`,
  );
  const [selected, setSelected] = useState({});
  const [rowsError, setRowsError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailTemplateId, setEmailTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateVariables, setTemplateVariables] = useState({});
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchMessage, setLaunchMessage] = useState("");
  const [previewLead, setPreviewLead] = useState(null);

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (item) => `${item.name}::${item.language}` === templateName,
      ) || null,
    [templates, templateName],
  );
  const selectedEmailTemplate = useMemo(
    () =>
      emailTemplates.find((item) => String(item._id) === emailTemplateId) ||
      null,
    [emailTemplates, emailTemplateId],
  );
  const variableIndexes = useMemo(
    () => getTemplateVars(selectedTemplate),
    [selectedTemplate],
  );
  const previewValues = useMemo(() => {
    const max = Math.max(0, ...variableIndexes);
    return Array.from({ length: max }, (_, i) => {
      const config = templateVariables[i + 1] || { source: "name", value: "" };
      if (config.source === "static") return config.value || "";
      const lead = previewLead || {
        name: "Ayush",
        phone: "919876543210",
        email: "ayush@example.com",
      };
      return (
        lead[config.source] || (config.source === "name" ? "Sir/Ma'am" : "")
      );
    });
  }, [variableIndexes, templateVariables, previewLead]);
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  // Preview the message the way the first selected contact will see it.
  const firstSelectedId = selectedIds[0] || "";
  useEffect(() => {
    if (!firstSelectedId) {
      setPreviewLead(null);
      return;
    }
    let active = true;
    leadApi
      .get(firstSelectedId)
      .then((res) => {
        if (active) setPreviewLead(res.data.lead || null);
      })
      .catch(() => {
        if (active) setPreviewLead(null);
      });
    return () => {
      active = false;
    };
  }, [firstSelectedId]);

  useEffect(() => {
    if (isWhatsApp) return;
    let active = true;
    setTemplatesLoading(true);
    setTemplatesError("");
    emailApi
      .templates()
      .then((response) => {
        if (!active) return;
        const items = response.data.templates || [];
        setEmailTemplates(items);
        if (!items.length)
          setTemplatesError(
            "Abhi email template save nahi hai. Email dropdown ke Templates section mein pehle ek template bana lein.",
          );
      })
      .catch((err) => {
        if (active)
          setTemplatesError(
            err?.response?.data?.message ||
              "Email templates load nahi hue. Backend connection check karein.",
          );
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isWhatsApp]);

  useEffect(() => {
    if (!selectedEmailTemplate) return;
    setEmailSubject(selectedEmailTemplate.subject || "");
    setEmailBody(selectedEmailTemplate.body || "");
  }, [selectedEmailTemplate]);

  useEffect(() => {
    if (!isWhatsApp) return;
    let active = true;
    setTemplatesLoading(true);
    setTemplatesError("");
    whatsappApi
      .templates()
      .then((response) => {
        if (!active) return;
        const items = response.data.templates || [];
        setTemplates(items);
        const wanted = items.find(
          (item) =>
            `${item.name}::${item.language}` === initialTemplate ||
            item.name === initialTemplate,
        );
        if (wanted) setTemplateName(`${wanted.name}::${wanted.language}`);
        else if (items.length)
          setTemplateName(`${items[0].name}::${items[0].language}`);
        else
          setTemplatesError(
            "Koi approved template nahi mila. Meta WhatsApp Manager mein template approve karein aur Business Account permissions check karein.",
          );
      })
      .catch((err) => {
        if (active)
          setTemplatesError(
            err?.response?.data?.message ||
              "Approved templates load nahi hue. Meta API credentials check karein.",
          );
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isWhatsApp, initialTemplate]);

  // Saved audiences for this channel
  const loadAudiences = useCallback(async () => {
    setAudiencesLoading(true);
    try {
      const response = await audienceApi.list();
      setAudiences(response.data.audiences || []);
    } catch (err) {
      setRowsError(
        err?.response?.data?.message || "Saved audiences load nahi hue.",
      );
    } finally {
      setAudiencesLoading(false);
    }
  }, []);
  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  // Picking an audience selects channel-ready contacts and loads their details for the preview list.
  useEffect(() => {
    if (source !== "audience" || !audienceId) {
      setAudienceContacts([]);
      setAudienceContactsLoading(false);
      return undefined;
    }
    let active = true;
    setAudienceInfo(null);
    setAudienceContacts([]);
    setAudienceContactsLoading(true);
    setLaunchError("");
    audienceApi
      .leads(audienceId, { channel, excludeSent: skipAlreadySent ? 1 : 0 })
      .then(async (response) => {
        const ids = (response.data.leadIds || []).map(String);
        if (!active) return;
        setSelected(Object.fromEntries(ids.map((id) => [id, true])));
        setAudienceInfo({
          ready: response.data.ready,
          total: response.data.total,
          skippedSent: response.data.skippedSent,
        });

        // The audience endpoint currently returns lead IDs; fetch each lead's display details.
        const contacts = await Promise.all(
          ids.map(async (id) => {
            try {
              const result = await leadApi.get(id);
              return result.data?.lead || null;
            } catch {
              return null;
            }
          }),
        );
        if (active) setAudienceContacts(contacts.filter(Boolean));
      })
      .catch((err) => {
        if (active)
          setLaunchError(
            err?.response?.data?.message ||
              "Audience ke contacts load nahi hue.",
          );
      })
      .finally(() => {
        if (active) setAudienceContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [source, audienceId, skipAlreadySent, channel]);

  const handleDeleteAudience = async (event, item) => {
    event.stopPropagation();
    const confirmed = window.confirm(
      `"${item.name}" audience delete karni hai? Upload Data ke contacts delete nahi honge.`,
    );
    if (!confirmed) return;
    setDeletingAudienceId(item._id);
    setRowsError("");
    setLaunchError("");
    try {
      await audienceApi.remove(item._id);
      setAudiences((current) =>
        current.filter((audience) => audience._id !== item._id),
      );
      if (audienceId === item._id) {
        setAudienceId("");
        setAudienceInfo(null);
        setAudienceContacts([]);
        setSelected({});
      }
    } catch (err) {
      setRowsError(
        err?.response?.data?.message ||
          "Audience delete nahi hui. Dobara try karein.",
      );
    } finally {
      setDeletingAudienceId("");
    }
  };

  const switchSource = (key) => {
    setSource(key);
    if (key !== "sheet") setFileFilter("");
    setSelected({});
    setAudienceId("");
    setAudienceInfo(null);
    setLaunchError("");
  };

  // Upload a new sheet: save contacts (new + already existing) and select them.
  const handleSheet = async (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      setUploadState({
        loading: false,
        fileName: "",
        result: null,
        error: "CSV ya Excel (.xlsx) file chunein.",
      });
      return;
    }
    setUploadState({
      loading: true,
      fileName: file.name,
      result: null,
      error: "",
    });
    try {
      const preview = await leadApi.importPreview(file);
      const usable = (preview.data.rows || []).filter(
        (row) =>
          row.status !== "invalid" && (isWhatsApp ? row.phone : row.email),
      );
      if (!usable.length)
        throw new Error(
          `Is sheet mein ${isWhatsApp ? "WhatsApp number" : "email"} wala koi sahi contact nahi mila.`,
        );
      const confirm = await leadApi.importConfirm(
        usable.map(
          ({
            status,
            errors,
            isDuplicate,
            duplicateReason,
            rowNumber,
            ...row
          }) => ({
            ...row,
            source: "bulk_sheet_upload",
            importFile: file.name,
          }),
        ),
      );
      const ids = [
        ...new Set(
          [
            ...(confirm.data.leadIds || []),
            ...(confirm.data.existingLeadIds || []),
          ].map(String),
        ),
      ];
      setSelected(Object.fromEntries(ids.map((id) => [id, true])));
      let savedAudience = null;
      if (saveUploadAsAudience && ids.length) {
        try {
          const name =
            `${file.name.replace(/\.(csv|xlsx)$/i, "")} · ${new Date().toLocaleDateString("en-IN")}`.slice(
              0,
              120,
            );
          savedAudience = (
            await audienceApi.create({ name, source: "upload", leadIds: ids })
          ).data.audience;
          loadAudiences();
        } catch {
          /* audience name clash etc. — contacts are still selected */
        }
      }
      // Show the uploaded sheet in the Contacts sheet with its rows already ticked.
      setFileFilter(confirm.data.insertedCount ? file.name : "");
      setSheetRefresh((n) => n + 1);
      setSource("sheet");
      setUploadState({
        loading: false,
        fileName: file.name,
        error: "",
        result: {
          rows: preview.data.summary?.total || usable.length,
          ready: ids.length,
          inserted: confirm.data.insertedCount || 0,
          invalid: preview.data.summary?.invalid || 0,
          audienceName: savedAudience?.name || "",
        },
      });
    } catch (err) {
      setSelected({});
      setUploadState({
        loading: false,
        fileName: file.name,
        result: null,
        error:
          err?.response?.data?.message ||
          err.message ||
          "Sheet upload nahi hui.",
      });
    }
  };
  useEffect(() => {
    setTemplateVariables({});
    setHeaderImageUrl(selectedTemplate?.imageUrl || "");
  }, [templateName, selectedTemplate?.imageUrl]);

  const validate = () => {
    if (!campaignName.trim()) return "Campaign name likhna zaroori hai.";
    if (!selectedIds.length) return "Kam se kam ek lead select karein.";
    if (selectedIds.length > 5000)
      return "Ek campaign mein maximum 5,000 leads select karein.";
    if (isWhatsApp) {
      if (!selectedTemplate) return "Ek approved Meta template select karein.";
      if (templateHasImageHeader(selectedTemplate) && !headerImageUrl.trim())
        return "Is template ke image header ke liye public image URL required hai.";
      for (const index of variableIndexes) {
        const config = templateVariables[index] || {
          source: "name",
          value: "",
        };
        if (config.source === "static" && !String(config.value || "").trim())
          return `Template variable {{${index}}} ki value fill karein.`;
      }
    } else {
      if (!selectedEmailTemplate) return "Saved email template select karein.";
      if (!emailSubject.trim())
        return "Selected template ka subject missing hai.";
      if (!emailBody.trim()) return "Selected template ka message missing hai.";
    }
    return "";
  };

  const launch = async (event) => {
    event.preventDefault();
    setLaunchError("");
    setLaunchMessage("");
    const validation = validate();
    if (validation) {
      setLaunchError(validation);
      return;
    }
    setLaunching(true);
    try {
      const payload = {
        name: campaignName.trim(),
        leadIds: selectedIds,
        ...(source === "audience" && audienceId ? { audienceId } : {}),
        channels: { whatsapp: isWhatsApp, email: !isWhatsApp },
        dailyLimit: 5000,
        sendTime: (() => {
          const now = new Date();
          return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        })(),
        startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10),
      };
      if (isWhatsApp) {
        payload.whatsappTemplateName = selectedTemplate.name;
        payload.whatsappTemplateLanguage = selectedTemplate.language || "en_US";
        payload.whatsappTemplateCategory = selectedTemplate.category || "";
        payload.whatsappTemplateHeaderImageUrl = headerImageUrl.trim();
        payload.whatsappTemplateBody =
          (selectedTemplate.components || []).find(
            (item) => String(item.type).toUpperCase() === "BODY",
          )?.text ||
          selectedTemplate.bodyText ||
          "";
        const parts = partsFromTemplate(selectedTemplate);
        payload.whatsappTemplateHeader = parts.headerText || "";
        payload.whatsappTemplateFooter = parts.footer || "";
        payload.whatsappTemplateButtons = parts.buttons
          .map((button) => button.text)
          .filter(Boolean);
        payload.whatsappTemplateVariables = variableIndexes.map((index) => ({
          index,
          source: templateVariables[index]?.source || "name",
          value: templateVariables[index]?.value || "",
        }));
      } else {
        payload.emailTemplateId = selectedEmailTemplate._id;
        payload.emailSubject = emailSubject.trim();
        payload.emailBody = emailBody.trim();
      }
      const response = await campaignApi.launch(payload);
      const queued = response.data?.queued || {};
      const count = isWhatsApp ? queued.whatsapp : queued.email;
      setLaunchMessage(
        `${count || 0} ${isWhatsApp ? "WhatsApp" : "email"} messages queue mein add hue. Sending progress page par live update hogi.`,
      );
      onLaunched?.();
      setTimeout(() => onClose?.(), 1000);
    } catch (err) {
      setLaunchError(
        err?.response?.data?.message ||
          "Campaign start nahi hui. Settings aur selected contacts check karein.",
      );
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !launching) onClose?.();
      }}
    >
      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-ink-900">
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 p-4 dark:border-ink-800 sm:p-5">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isWhatsApp ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"}`}
            >
              {isWhatsApp ? <MessageCircle size={21} /> : <Mail size={21} />}
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">
                Create {isWhatsApp ? "WhatsApp" : "Email"} campaign
              </h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Audience chunein, template ka preview dekhein, aur bhejein.
              </p>
            </div>
          </div>
          <button
            disabled={launching}
            onClick={onClose}
            aria-label="Close campaign launcher"
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={launch} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {(launchError || rowsError || templatesError) && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              >
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <div>{launchError || rowsError || templatesError}</div>
              </div>
            )}
            {launchMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                {launchMessage}
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="min-w-0 space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-100">
                    Campaign name
                  </label>
                  <input
                    className="input-field"
                    maxLength={120}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Diwali property offer"
                  />
                </div>
                <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                        Step 1 · Kisko bhejna hai?
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                        {selectedIds.length.toLocaleString("en-IN")} contacts
                        selected
                      </p>
                    </div>
                    <div
                      role="tablist"
                      aria-label="Contacts source"
                      className="inline-flex shrink-0 flex-wrap rounded-lg bg-ink-100 p-1 dark:bg-ink-800"
                    >
                      {SOURCES.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          role="tab"
                          aria-selected={source === item.key}
                          onClick={() => switchSource(item.key)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${source === item.key ? "bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white" : "text-ink-500 dark:text-ink-300"}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {source === "audience" && (
                  <div className="space-y-2">
                    {audiencesLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border border-ink-100 p-4 text-sm text-ink-500 dark:border-ink-800">
                        <Loader2 size={16} className="animate-spin" /> Loading
                        audiences…
                      </div>
                    ) : audiences.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-ink-200 p-5 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
                        <Users
                          size={24}
                          className="mx-auto mb-2 text-ink-300"
                        />
                        Abhi koi saved audience nahi hai.{" "}
                        <button
                          type="button"
                          onClick={() => switchSource("sheet")}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          Contacts sheet se chunein
                        </button>{" "}
                        ya{" "}
                        <button
                          type="button"
                          onClick={() => switchSource("upload")}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          nayi sheet upload karein
                        </button>
                        .
                      </div>
                    ) : (
                      <div
                        role="radiogroup"
                        aria-label="Saved audiences"
                        className="max-h-[320px] space-y-2 overflow-y-auto pr-1"
                      >
                        {audiences.map((item) => {
                          const ready = isWhatsApp
                            ? item.counts?.whatsapp
                            : item.counts?.email;
                          const active = audienceId === item._id;
                          return (
                            <div
                              key={item._id}
                              className={`flex items-stretch gap-2 rounded-xl border p-2 transition ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15 dark:bg-brand-900/20" : "border-ink-200 dark:border-ink-700"}`}
                            >
                              <button
                                key={item._id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setAudienceId(item._id)}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                              >
                                {active ? (
                                  <CheckCircle2
                                    size={18}
                                    className="shrink-0 text-brand-600"
                                  />
                                ) : (
                                  <span className="h-[18px] w-[18px] shrink-0 rounded-full border border-ink-300" />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                                    {item.name}
                                  </span>
                                  <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                                    {item.source === "upload"
                                      ? "Sheet upload"
                                      : item.source === "filter"
                                        ? "Filter"
                                        : "Selected contacts"}
                                    {item.tags?.length
                                      ? ` · ${item.tags.join(", ")}`
                                      : ""}
                                    {item.lastUsedAt
                                      ? ` · last used ${new Date(item.lastUsedAt).toLocaleDateString("en-IN")}`
                                      : ""}
                                  </span>
                                </span>
                                <span className="text-right">
                                  <span className="block font-display text-base font-bold text-ink-900 dark:text-white">
                                    {Number(ready || 0).toLocaleString("en-IN")}
                                  </span>
                                  <span className="block text-[10px] text-ink-400">
                                    {isWhatsApp ? "WhatsApp" : "Email"} ready
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                title={`Delete ${item.name}`}
                                aria-label={`Delete audience ${item.name}`}
                                disabled={deletingAudienceId === item._id}
                                onClick={(event) =>
                                  handleDeleteAudience(event, item)
                                }
                                className="inline-flex shrink-0 items-center justify-center self-center rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40"
                              >
                                {deletingAudienceId === item._id ? (
                                  <Loader2 size={17} className="animate-spin" />
                                ) : (
                                  <Trash2 size={17} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {audienceId && (
                      <label className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
                        <input
                          type="checkbox"
                          checked={skipAlreadySent}
                          onChange={(e) => setSkipAlreadySent(e.target.checked)}
                        />
                        Jinhe {isWhatsApp ? "WhatsApp" : "email"} pehle ja chuka
                        hai, unhe skip karein
                        {audienceInfo
                          ? ` · ${audienceInfo.ready} ready${audienceInfo.skippedSent ? `, ${audienceInfo.skippedSent} skip` : ""}`
                          : ""}
                      </label>
                    )}
                    {audienceId && (
                      <div className="rounded-xl border border-ink-100 dark:border-ink-800">
                        <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
                          <div>
                            <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                              Selected audience contacts
                            </h3>
                            <p className="text-xs text-ink-500 dark:text-ink-400">
                              {audienceContacts.length.toLocaleString("en-IN")}{" "}
                              contacts loaded
                            </p>
                          </div>
                          {audienceContactsLoading && (
                            <Loader2
                              size={16}
                              className="animate-spin text-brand-600"
                            />
                          )}
                        </div>
                        {audienceContactsLoading ? (
                          <div className="p-4 text-center text-sm text-ink-500">
                            Contacts load ho rahe hain…
                          </div>
                        ) : audienceContacts.length === 0 ? (
                          <div className="p-4 text-center text-sm text-ink-500">
                            Is audience mein is channel ke liye koi contact
                            ready nahi hai.
                          </div>
                        ) : (
                          <div className="max-h-56 overflow-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-ink-50 text-ink-500 dark:bg-ink-800">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">
                                    Name
                                  </th>
                                  <th className="px-3 py-2 font-semibold">
                                    WhatsApp / Phone
                                  </th>
                                  <th className="px-3 py-2 font-semibold">
                                    Email
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                                {audienceContacts.map((lead) => (
                                  <tr key={lead._id || lead.id}>
                                    <td className="px-3 py-2 text-ink-800 dark:text-ink-100">
                                      {lead.name || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-ink-600 dark:text-ink-300">
                                      {lead.phone || lead.whatsapp || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-ink-600 dark:text-ink-300">
                                      {lead.email || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {source === "sheet" && (
                  <>
                    {uploadState.result && (
                      <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
                        <p className="font-semibold">
                          {uploadState.fileName}: {uploadState.result.ready}{" "}
                          contacts select ho gaye
                        </p>
                        <p className="mt-0.5 text-xs">
                          {uploadState.result.inserted} naye contacts jode gaye
                          {uploadState.result.ready -
                            uploadState.result.inserted >
                          0
                            ? `, ${uploadState.result.ready - uploadState.result.inserted} pehle se the`
                            : ""}
                          .
                          {uploadState.result.audienceName
                            ? ` Audience "${uploadState.result.audienceName}" bhi save hua.`
                            : ""}{" "}
                          Neeche dekh kar kam-zyada kar sakte hain.
                        </p>
                      </div>
                    )}
                    <ContactSheetPicker
                      channel={channel}
                      selected={selected}
                      setSelected={setSelected}
                      fileFilter={fileFilter}
                      setFileFilter={setFileFilter}
                      refreshKey={sheetRefresh}
                      onSaveAudience={() => setShowSaveAudience(true)}
                    />
                  </>
                )}

                {source === "upload" && (
                  <div className="space-y-3">
                    <label
                      className={`flex min-h-[170px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/60 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-ink-700 dark:bg-ink-800/40 ${uploadState.loading ? "pointer-events-none opacity-60" : ""}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleSheet(event.dataTransfer.files?.[0]);
                      }}
                    >
                      {uploadState.loading ? (
                        <Loader2
                          size={30}
                          className="animate-spin text-brand-600"
                        />
                      ) : (
                        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                          <FileSpreadsheet size={24} />
                        </span>
                      )}
                      <span className="font-semibold text-ink-900 dark:text-white">
                        {uploadState.loading
                          ? "Sheet padh rahe hain…"
                          : "CSV ya Excel sheet chunein"}
                      </span>
                      <span className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                        Name, Mobile / WhatsApp, Email address, Address, Job
                        title
                      </span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(event) => {
                          handleSheet(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <label className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                        <input
                          type="checkbox"
                          checked={saveUploadAsAudience}
                          onChange={(e) =>
                            setSaveUploadAsAudience(e.target.checked)
                          }
                        />
                        Is sheet ko audience bhi bana dein
                      </label>
                      <button
                        type="button"
                        onClick={downloadSampleSheet}
                        className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline"
                      >
                        <Download size={13} /> Sample sheet
                      </button>
                    </div>
                    {uploadState.error && (
                      <div
                        role="alert"
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
                      >
                        {uploadState.error}
                      </div>
                    )}
                    {uploadState.result && (
                      <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
                        <p className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 size={16} /> {uploadState.fileName}:{" "}
                          {uploadState.result.ready} contacts selected
                        </p>
                        <p className="mt-1 text-xs">
                          {uploadState.result.inserted} naye contacts Upload
                          Data mein jode gaye
                          {uploadState.result.invalid
                            ? `, ${uploadState.result.invalid} galat rows chhodi gayi`
                            : ""}
                          .
                          {uploadState.result.audienceName
                            ? ` Audience "${uploadState.result.audienceName}" bhi save hua.`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                {isWhatsApp ? (
                  <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-ink-900 dark:text-white">
                          Step 2 · Approved Meta template
                        </h3>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                          Template first message ke liye required hai.
                        </p>
                      </div>
                      {templatesLoading ? (
                        <Loader2
                          size={17}
                          className="animate-spin text-brand-600"
                        />
                      ) : (
                        <Link
                          to="/whatsapp/templates?new=1"
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                        >
                          <Plus size={13} /> New template · approval
                        </Link>
                      )}
                    </div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
                      Choose template
                    </label>
                    <select
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="input-field"
                      disabled={templatesLoading || !templates.length}
                    >
                      <option value="">Select an approved template</option>
                      {templates.map((item) => (
                        <option
                          key={`${item.name}::${item.language}`}
                          value={`${item.name}::${item.language}`}
                        >
                          {item.name} · {item.language} ·{" "}
                          {item.category || "Template"}
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <div className="mt-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Approved
                          </span>
                          <span className="rounded-full bg-ink-200 px-2 py-1 text-[10px] font-semibold text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                            {selectedTemplate.language}
                          </span>
                        </div>
                        <WhatsAppPreview
                          {...partsFromTemplate(selectedTemplate)}
                          imageUrl={
                            headerImageUrl || selectedTemplate.imageUrl || ""
                          }
                          values={previewValues}
                          caption={
                            previewLead
                              ? `${previewLead.name || "Pehla contact"} ko aisa dikhega`
                              : "Contact chunte hi unke naam ke saath preview dikhega"
                          }
                        />
                      </div>
                    )}
                    {variableIndexes.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">
                          Template variables
                        </p>
                        {variableIndexes.map((index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[100px_minmax(0,1fr)] gap-2"
                          >
                            <div className="flex items-center text-xs font-semibold text-ink-500">
                              {"{{"}
                              {index}
                              {"}}"}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <select
                                className="input-field"
                                value={
                                  templateVariables[index]?.source || "name"
                                }
                                onChange={(e) =>
                                  setTemplateVariables((previous) => ({
                                    ...previous,
                                    [index]: {
                                      ...previous[index],
                                      source: e.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="name">Lead name</option>
                                <option value="phone">Mobile number</option>
                                <option value="email">Email address</option>
                                <option value="static">Custom text</option>
                              </select>
                              {templateVariables[index]?.source ===
                                "static" && (
                                <input
                                  className="input-field"
                                  maxLength={1000}
                                  value={templateVariables[index]?.value || ""}
                                  onChange={(e) =>
                                    setTemplateVariables((previous) => ({
                                      ...previous,
                                      [index]: {
                                        ...previous[index],
                                        source: "static",
                                        value: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Variable value"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedTemplate &&
                      templateHasImageHeader(selectedTemplate) && (
                        <div className="mt-3">
                          <label className="mb-1.5 block text-xs font-semibold text-ink-600 dark:text-ink-300">
                            Image header URL
                          </label>
                          <input
                            type="url"
                            className="input-field"
                            value={headerImageUrl}
                            onChange={(e) => setHeaderImageUrl(e.target.value)}
                            placeholder="https://.../property-offer.jpg"
                          />
                          <p className="mt-1 text-[11px] text-ink-400">
                            Template image is prefilled. A public HTTPS image
                            URL is required by Meta Cloud API.
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-ink-900 dark:text-white">
                          Step 2 · Choose email template
                        </h3>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                          Saved template ka content per-contact personalize
                          hoga.
                        </p>
                      </div>
                      <Link
                        to="/email/templates"
                        className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        Manage templates
                      </Link>
                    </div>
                    <label className="mb-1.5 mt-4 block text-xs font-semibold text-ink-600 dark:text-ink-300">
                      Template
                    </label>
                    <select
                      className="input-field"
                      value={emailTemplateId}
                      onChange={(e) => setEmailTemplateId(e.target.value)}
                      disabled={templatesLoading || !emailTemplates.length}
                    >
                      <option value="">Select a saved email template</option>
                      {emailTemplates.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} · {item.category || "General"}
                        </option>
                      ))}
                    </select>
                    {selectedEmailTemplate ? (
                      <div className="mt-3 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/70">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                          Subject preview
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ink-800 dark:text-ink-100">
                          {selectedEmailTemplate.subject}
                        </p>
                        {selectedEmailTemplate.imageUrl && (
                          <img
                            src={selectedEmailTemplate.imageUrl}
                            alt="Email template"
                            className="mt-3 max-h-52 w-full rounded-lg object-contain bg-white"
                          />
                        )}
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                          Message preview
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink-700 dark:text-ink-200">
                          {selectedEmailTemplate.body}
                        </p>
                        <p className="mt-2 text-[11px] text-ink-400">
                          Variables such as {"{{name}}"} are filled per
                          recipient.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-ink-200 p-4 text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
                        {templatesLoading
                          ? "Loading saved email templates…"
                          : "Pehle Email → Templates mein reusable email template create karein."}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                  <h3 className="text-sm font-bold text-ink-900 dark:text-white">
                    Send now
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-400">
                    Campaign jobs start as soon as you launch. Messages are
                    still sent one by one with provider-safe pacing; there is no
                    daily schedule or start-time setting.
                  </p>
                </div>
              </section>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/70 px-4 py-3 dark:border-ink-800 dark:bg-ink-900 sm:px-5">
            <p className="text-xs text-ink-500 dark:text-ink-400">
              <b className="text-ink-800 dark:text-ink-100">
                {selectedIds.length.toLocaleString("en-IN")}
              </b>{" "}
              contacts · message tabhi jayega jab aap Start campaign dabayenge.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={launching}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={launching || templatesLoading || !selectedIds.length}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {launching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {launching ? "Adding to queue…" : "Start campaign"}
              </button>
            </div>
          </div>
        </form>
      </div>
      {showSaveAudience && (
        <SaveAudienceModal
          leadIds={selectedIds}
          source="selection"
          onClose={() => setShowSaveAudience(false)}
          onSaved={(audience) => {
            setShowSaveAudience(false);
            setLaunchMessage(`Audience "${audience.name}" save ho gaya.`);
            loadAudiences();
          }}
        />
      )}
    </div>
  );
}
