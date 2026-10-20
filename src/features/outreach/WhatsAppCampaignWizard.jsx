// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import {
//   AlertCircle,
//   Check,
//   CheckCircle2,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   FileSpreadsheet,
//   Loader2,
//   MessageCircle,
//   Plus,
//   Search,
//   Send,
//   UploadCloud,
//   X,
// } from "lucide-react";
// import { audienceApi } from "../../api/audienceApi.js";
// import { leadApi } from "../../api/leadApi.js";
// import { campaignApi } from "../../api/outreachApi.js";
// import { whatsappApi } from "../../api/whatsappApi.js";

// const PAGE_SIZE = 50;
// const count = (value) => Number(value || 0).toLocaleString("en-IN");
// const errorMessage = (error, fallback) =>
//   error?.response?.data?.message ||
//   error?.response?.data?.error?.message ||
//   error?.message ||
//   fallback;

// function getPayload(response) {
//   return response?.data && typeof response.data === "object"
//     ? response.data
//     : response || {};
// }

// function templateBody(template) {
//   return (
//     template?.bodyText ||
//     (template?.components || []).find(
//       (part) => String(part.type).toUpperCase() === "BODY",
//     )?.text ||
//     ""
//   );
// }

// function templateHeader(template) {
//   return (
//     (template?.components || []).find(
//       (part) => String(part.type).toUpperCase() === "HEADER",
//     ) || null
//   );
// }

// function getHeaderType(template) {
//   const explicit = String(template?.headerType || "").toLowerCase();
//   if (explicit && explicit !== "none") return explicit;
//   const format = String(templateHeader(template)?.format || "").toLowerCase();
//   return ["image", "document", "text"].includes(format) ? format : "none";
// }

// function templateVariables(template) {
//   const indexes = [
//     ...new Set(
//       [...templateBody(template).matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(
//         (match) => Number(match[1]),
//       ),
//     ),
//   ].sort((a, b) => a - b);
//   return indexes.map((index) => ({
//     index,
//     source: "name",
//     value: "",
//     fallback: "Sir/Ma'am",
//   }));
// }

// function audienceTotal(audience) {
//   return Number(
//     audience?.contactCount ??
//       audience?.counts?.total ??
//       audience?.counts?.valid ??
//       audience?.leadIds?.length ??
//       0,
//   );
// }

// function audienceWhatsAppReady(audience) {
//   return Number(
//     audience?.counts?.whatsappReady ??
//       audience?.whatsappReadyCount ??
//       audience?.counts?.validWhatsApp ??
//       audienceTotal(audience),
//   );
// }

// function uploadRowKey(row, index) {
//   return String(row?.rowNumber ?? row?._id ?? row?.id ?? index + 1);
// }

// function eligibleUploadRow(row) {
//   const hasPhone = Boolean(String(row?.phone || row?.mobile || "").trim());
//   const status = String(row?.status || "valid").toLowerCase();
//   return (
//     hasPhone &&
//     status === "valid" &&
//     !row?.isDuplicate &&
//     !(row?.errors || []).length
//   );
// }

// function campaignRow(row) {
//   return {
//     rowNumber: Number(row?.rowNumber || 0) || undefined,
//     name: String(row?.name || row?.fullName || "").trim(),
//     phone: String(row?.phone || row?.mobile || "").trim(),
//     email: String(row?.email || "").trim(),
//     address: String(row?.address || "").trim(),
//     city: String(row?.city || "").trim(),
//     location: String(row?.location || "").trim(),
//     occupation: String(row?.occupation || row?.jobTitle || "").trim(),
//     jobTitle: String(row?.jobTitle || row?.occupation || "").trim(),
//     budgetMin: row?.budgetMin ?? null,
//     budgetMax: row?.budgetMax ?? null,
//     notes: String(row?.notes || "").trim(),
//     requirements: String(row?.requirements || "").trim(),
//     source: String(row?.source || "whatsapp_campaign_upload"),
//   };
// }

// function downloadBlob(response, filename) {
//   const blob =
//     response?.data instanceof Blob ? response.data : new Blob([response?.data]);
//   const url = URL.createObjectURL(blob);
//   const anchor = document.createElement("a");
//   anchor.href = url;
//   anchor.download = filename;
//   document.body.appendChild(anchor);
//   anchor.click();
//   anchor.remove();
//   URL.revokeObjectURL(url);
// }

// const fieldClass =
//   "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
// const secondaryButton =
//   "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45";

// export default function WhatsAppCampaignWizard({ onClose, onCampaignStarted }) {
//   const navigate = useNavigate();
//   const fileInputRef = useRef(null);
//   const lastLeadClickIndex = useRef(null);
//   const [campaignName, setCampaignName] = useState(
//     `WhatsApp campaign ${new Date().toLocaleDateString("en-GB")}`,
//   );
//   const [tab, setTab] = useState("contacts");
//   const [leads, setLeads] = useState([]);
//   const [leadsTotal, setLeadsTotal] = useState(0);
//   const [leadPages, setLeadPages] = useState(1);
//   const [leadPage, setLeadPage] = useState(1);
//   const [leadSearch, setLeadSearch] = useState("");
//   const [leadFilter, setLeadFilter] = useState("all");
//   const [leadsLoading, setLeadsLoading] = useState(false);
//   const [leadsError, setLeadsError] = useState("");
//   const [selectedLeadIds, setSelectedLeadIds] = useState([]);
//   const [rangeStart, setRangeStart] = useState("1");
//   const [rangeEnd, setRangeEnd] = useState("50");

//   const [audiences, setAudiences] = useState([]);
//   const [audiencesLoading, setAudiencesLoading] = useState(false);
//   const [audiencesError, setAudiencesError] = useState("");
//   const [selectedAudienceId, setSelectedAudienceId] = useState("");

//   const [uploadFile, setUploadFile] = useState(null);
//   const [uploadPreview, setUploadPreview] = useState(null);
//   const [uploadRows, setUploadRows] = useState([]);
//   const [selectedUploadKeys, setSelectedUploadKeys] = useState([]);
//   const [uploadLoading, setUploadLoading] = useState(false);
//   const [uploadError, setUploadError] = useState("");
//   const [saveUploadAsAudience, setSaveUploadAsAudience] = useState(true);

//   const [templates, setTemplates] = useState([]);
//   const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
//   const [templatesLoading, setTemplatesLoading] = useState(false);
//   const [metaError, setMetaError] = useState("");
//   const [skipAlreadySent, setSkipAlreadySent] = useState(true);
//   const [optInConfirmed, setOptInConfirmed] = useState(false);
//   const [recipientPreview, setRecipientPreview] = useState(null);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [launching, setLaunching] = useState(false);
//   const [actionError, setActionError] = useState("");
//   const [notice, setNotice] = useState("");

//   const selectedAudience = useMemo(
//     () =>
//       audiences.find(
//         (audience) =>
//           String(audience._id || audience.id) === selectedAudienceId,
//       ) || null,
//     [audiences, selectedAudienceId],
//   );
//   const selectedTemplate = useMemo(
//     () =>
//       templates.find(
//         (template) =>
//           `${template.name}::${template.language || "en_US"}` ===
//           selectedTemplateKey,
//       ) || null,
//     [templates, selectedTemplateKey],
//   );

//   const visibleLeads = useMemo(() => {
//     if (leadFilter === "whatsapp")
//       return leads.filter((lead) => String(lead.phone || "").trim());
//     if (leadFilter === "missing")
//       return leads.filter((lead) => !String(lead.phone || "").trim());
//     return leads;
//   }, [leads, leadFilter]);

//   const validUploadRows = useMemo(
//     () => uploadRows.filter(eligibleUploadRow),
//     [uploadRows],
//   );
//   const selectedUploadRows = useMemo(
//     () =>
//       uploadRows.filter(
//         (row, index) =>
//           selectedUploadKeys.includes(uploadRowKey(row, index)) &&
//           eligibleUploadRow(row),
//       ),
//     [uploadRows, selectedUploadKeys],
//   );

//   const loadLeads = useCallback(async () => {
//     setLeadsLoading(true);
//     setLeadsError("");
//     try {
//       const response = await leadApi.list({
//         page: leadPage,
//         limit: PAGE_SIZE,
//         ...(leadSearch.trim() ? { search: leadSearch.trim() } : {}),
//       });
//       const payload = getPayload(response);
//       const rows = Array.isArray(payload.leads)
//         ? payload.leads
//         : Array.isArray(response?.leads)
//           ? response.leads
//           : [];
//       const pagination = payload.pagination || response?.pagination || {};
//       const total = Number(pagination.total ?? payload.total ?? rows.length);
//       setLeads(rows);
//       setLeadsTotal(total);
//       setLeadPages(
//         Math.max(
//           1,
//           Number(
//             pagination.totalPages ??
//               pagination.pages ??
//               (Math.ceil(total / PAGE_SIZE) || 1),
//           ),
//         ),
//       );
//     } catch (error) {
//       setLeads([]);
//       setLeadsTotal(0);
//       setLeadPages(1);
//       setLeadsError(errorMessage(error, "Contacts sheet load nahi ho saki."));
//     } finally {
//       setLeadsLoading(false);
//     }
//   }, [leadPage, leadSearch]);

//   useEffect(() => {
//     loadLeads();
//   }, [loadLeads]);

//   useEffect(() => {
//     let alive = true;
//     setAudiencesLoading(true);
//     setAudiencesError("");
//     audienceApi
//       .list()
//       .then((response) => {
//         if (!alive) return;
//         const payload = getPayload(response);
//         const items = Array.isArray(payload.audiences)
//           ? payload.audiences
//           : Array.isArray(response?.audiences)
//             ? response.audiences
//             : [];
//         setAudiences(items);
//       })
//       .catch((error) => {
//         if (alive)
//           setAudiencesError(
//             errorMessage(error, "Saved audience load nahi ho saki."),
//           );
//       })
//       .finally(() => {
//         if (alive) setAudiencesLoading(false);
//       });
//     return () => {
//       alive = false;
//     };
//   }, []);

//   useEffect(() => {
//     let alive = true;
//     setTemplatesLoading(true);
//     setMetaError("");
//     whatsappApi
//       .templates()
//       .then((response) => {
//         if (!alive) return;
//         const payload = getPayload(response);
//         const approved = (
//           Array.isArray(payload.templates) ? payload.templates : []
//         ).filter(
//           (template) =>
//             String(template.status || "").toUpperCase() === "APPROVED",
//         );
//         setTemplates(approved);
//         setSelectedTemplateKey((current) =>
//           current &&
//           approved.some(
//             (template) =>
//               `${template.name}::${template.language || "en_US"}` === current,
//           )
//             ? current
//             : "",
//         );
//       })
//       .catch((error) => {
//         if (alive) {
//           setTemplates([]);
//           setSelectedTemplateKey("");
//           setMetaError(
//             errorMessage(error, "Approved Meta templates load nahi ho sake."),
//           );
//         }
//       })
//       .finally(() => {
//         if (alive) setTemplatesLoading(false);
//       });
//     whatsappApi
//       .status()
//       .then((response) => {
//         if (!alive) return;
//         const payload = getPayload(response);
//         const possibleError =
//           payload?.error?.message ||
//           payload?.errorMessage ||
//           (payload?.ok === false ? payload?.message : "");
//         if (possibleError)
//           setMetaError((current) => current || String(possibleError));
//       })
//       .catch((error) => {
//         if (alive)
//           setMetaError(
//             (current) =>
//               current ||
//               errorMessage(
//                 error,
//                 "WhatsApp Meta connection status check nahi ho saka.",
//               ),
//           );
//       });
//     return () => {
//       alive = false;
//     };
//   }, []);

//   useEffect(() => {
//     let alive = true;
//     let payload = null;
//     if (tab === "contacts" && selectedLeadIds.length)
//       payload = { leadIds: selectedLeadIds };
//     if (tab === "audience" && selectedAudienceId)
//       payload = { audienceId: selectedAudienceId };
//     if (!payload) {
//       setRecipientPreview(null);
//       setPreviewLoading(false);
//       return undefined;
//     }
//     setPreviewLoading(true);
//     campaignApi
//       .preview({
//         ...payload,
//         channel: "whatsapp",
//         skipAlreadySent,
//         category: String(
//           selectedTemplate?.category || "MARKETING",
//         ).toUpperCase(),
//       })
//       .then((response) => {
//         if (!alive) return;
//         setRecipientPreview(getPayload(response));
//       })
//       .catch(() => {
//         if (alive) setRecipientPreview(null);
//       })
//       .finally(() => {
//         if (alive) setPreviewLoading(false);
//       });
//     return () => {
//       alive = false;
//     };
//   }, [
//     tab,
//     selectedLeadIds,
//     selectedAudienceId,
//     skipAlreadySent,
//     selectedTemplate?.category,
//   ]);

//   const close = () => {
//     if (onClose) onClose();
//     else navigate("/outreach/whatsapp", { replace: true });
//   };

//   const changeTab = (nextTab) => {
//     setTab(nextTab);
//     setActionError("");
//     setNotice("");
//   };

//   const toggleLead = (leadId, checked) => {
//     const id = String(leadId);
//     setSelectedLeadIds((current) =>
//       checked
//         ? [...new Set([...current, id])]
//         : current.filter((item) => item !== id),
//     );
//     setRecipientPreview(null);
//     setActionError("");
//   };

//   const handleLeadCheckbox = (lead, index, event) => {
//     const checked = event.target.checked;
//     const id = String(lead._id || lead.id);
//     if (event.nativeEvent?.shiftKey && lastLeadClickIndex.current !== null) {
//       const start = Math.min(lastLeadClickIndex.current, index);
//       const end = Math.max(lastLeadClickIndex.current, index);
//       const rangeIds = visibleLeads
//         .slice(start, end + 1)
//         .filter((item) => String(item.phone || "").trim())
//         .map((item) => String(item._id || item.id));
//       setSelectedLeadIds((current) => {
//         const next = new Set(current);
//         rangeIds.forEach((rangeId) => {
//           if (checked) next.add(rangeId);
//           else next.delete(rangeId);
//         });
//         return [...next];
//       });
//       setRecipientPreview(null);
//       setActionError("");
//     } else {
//       toggleLead(id, checked);
//     }
//     lastLeadClickIndex.current = index;
//   };

//   const selectVisibleLeads = () => {
//     const eligibleIds = visibleLeads
//       .filter((lead) => String(lead.phone || "").trim())
//       .map((lead) => String(lead._id || lead.id));
//     const selected = new Set(selectedLeadIds);
//     const allSelected =
//       eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
//     if (allSelected) eligibleIds.forEach((id) => selected.delete(id));
//     else eligibleIds.forEach((id) => selected.add(id));
//     setSelectedLeadIds([...selected]);
//     setRecipientPreview(null);
//     setActionError("");
//   };

//   const selectRange = () => {
//     const first = Math.max(1, Number.parseInt(rangeStart, 10) || 1);
//     const last = Math.max(first, Number.parseInt(rangeEnd, 10) || first);
//     const selected = new Set(selectedLeadIds);
//     visibleLeads.forEach((lead, index) => {
//       const serial = (leadPage - 1) * PAGE_SIZE + index + 1;
//       if (serial >= first && serial <= last && String(lead.phone || "").trim())
//         selected.add(String(lead._id || lead.id));
//     });
//     setSelectedLeadIds([...selected]);
//     setRecipientPreview(null);
//     setActionError("");
//   };

//   const selectAllUploadRows = () => {
//     const validKeys = uploadRows.filter(eligibleUploadRow).map(uploadRowKey);
//     setSelectedUploadKeys(validKeys);
//   };

//   const toggleUploadRow = (row, index, checked) => {
//     const key = uploadRowKey(row, index);
//     setSelectedUploadKeys((current) =>
//       checked
//         ? [...new Set([...current, key])]
//         : current.filter((item) => item !== key),
//     );
//   };

//   const handleUpload = async (file) => {
//     if (!file) return;
//     const lower = file.name.toLowerCase();
//     if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
//       setUploadError(
//         "CSV ya Excel workbook (.xlsx) upload karein. Purani .xls file ko pehle .xlsx mein save karein.",
//       );
//       return;
//     }
//     setUploadFile(file);
//     setUploadError("");
//     setUploadPreview(null);
//     setUploadRows([]);
//     setSelectedUploadKeys([]);
//     setUploadLoading(true);
//     try {
//       const response = await audienceApi.previewFile(file, true);
//       const payload = getPayload(response);
//       const rows = Array.isArray(payload.rows) ? payload.rows : [];
//       setUploadPreview(payload);
//       setUploadRows(rows);
//       setSaveUploadAsAudience(true);
//     } catch (error) {
//       setUploadError(
//         errorMessage(
//           error,
//           "Sheet read nahi ho saki. Header row aur file format check karein.",
//         ),
//       );
//     } finally {
//       setUploadLoading(false);
//     }
//   };

//   const downloadSampleSheet = async () => {
//     try {
//       const response = await leadApi.sampleSheet();
//       downloadBlob(response, "propai-contacts-sample.xlsx");
//     } catch (error) {
//       setUploadError(
//         errorMessage(error, "Sample sheet download nahi ho saki."),
//       );
//     }
//   };

//   const activeSelectedCount = useMemo(() => {
//     if (tab === "contacts") return selectedLeadIds.length;
//     if (tab === "audience")
//       return selectedAudience ? audienceTotal(selectedAudience) : 0;
//     return selectedUploadRows.length;
//   }, [
//     tab,
//     selectedLeadIds.length,
//     selectedAudience,
//     selectedUploadRows.length,
//   ]);

//   const effectiveCount = useMemo(() => {
//     if (tab === "contacts")
//       return Number(recipientPreview?.final ?? selectedLeadIds.length);
//     if (tab === "audience")
//       return Number(
//         recipientPreview?.final ??
//           (selectedAudience ? audienceWhatsAppReady(selectedAudience) : 0),
//       );
//     return selectedUploadRows.length;
//   }, [
//     tab,
//     recipientPreview,
//     selectedLeadIds.length,
//     selectedAudience,
//     selectedUploadRows.length,
//   ]);

//   const launchCampaign = async () => {
//     setActionError("");
//     setNotice("");
//     if (!campaignName.trim()) {
//       setActionError("Campaign name zaroori hai.");
//       return;
//     }
//     if (!selectedTemplate) {
//       setActionError("Approved Meta template select karein.");
//       return;
//     }
//     if (activeSelectedCount < 1 || effectiveCount < 1) {
//       setActionError(
//         "WhatsApp number wale kam se kam ek contact select karein.",
//       );
//       return;
//     }
//     if (!optInConfirmed) {
//       setActionError(
//         "Campaign se pehle confirm karein ki selected contacts ne WhatsApp messages ke liye opt-in diya hai.",
//       );
//       return;
//     }

//     setLaunching(true);
//     try {
//       let recipients = {};
//       if (tab === "contacts") {
//         recipients = { leadIds: selectedLeadIds };
//       } else if (tab === "audience") {
//         recipients = { audienceId: selectedAudienceId };
//       } else {
//         if (saveUploadAsAudience) {
//           const audienceName = `${campaignName.trim()} audience`.slice(0, 120);
//           const previewSourceType = String(
//             uploadPreview?.sourceType || "upload",
//           ).toLowerCase();
//           const safeSourceType = ["upload", "paste", "leads"].includes(
//             previewSourceType,
//           )
//             ? previewSourceType
//             : "upload";
//           const audienceResponse = await audienceApi.create({
//             name: audienceName,
//             tags: [],
//             sourceType: safeSourceType,
//             sourceLabel:
//               uploadPreview?.sourceLabel ||
//               uploadFile?.name ||
//               "WhatsApp campaign upload",
//             sourceFileName:
//               uploadPreview?.sourceFileName || uploadFile?.name || "",
//             addToCrm: true,
//             addCountryCode: true,
//             rows: selectedUploadRows.map((row) => ({
//               ...campaignRow(row),
//               rowNumber: row.rowNumber,
//               status: "valid",
//               isDuplicate: false,
//               duplicateReason: "",
//               errors: [],
//             })),
//           });
//           const createdAudience = getPayload(audienceResponse).audience;
//           const createdAudienceId = createdAudience?._id || createdAudience?.id;
//           if (!createdAudienceId)
//             throw new Error(
//               "Audience save response mein ID nahi mili. Audience page check karein.",
//             );
//           recipients = { audienceId: String(createdAudienceId) };
//         } else {
//           recipients = { rows: selectedUploadRows.map(campaignRow) };
//         }
//       }

//       const body = templateBody(selectedTemplate);
//       const headerType = getHeaderType(selectedTemplate);
//       const category = String(
//         selectedTemplate.category || "MARKETING",
//       ).toUpperCase();
//       const variables = templateVariables(selectedTemplate);
//       const today = new Intl.DateTimeFormat("en-CA", {
//         timeZone: "Asia/Kolkata",
//         year: "numeric",
//         month: "2-digit",
//         day: "2-digit",
//       }).format(new Date());
//       const now = new Intl.DateTimeFormat("en-GB", {
//         timeZone: "Asia/Kolkata",
//         hour: "2-digit",
//         minute: "2-digit",
//         hourCycle: "h23",
//       }).format(new Date());

//       const response = await campaignApi.launch({
//         name: campaignName.trim(),
//         ...recipients,
//         skipAlreadySent,
//         optInConfirmed,
//         channels: { whatsapp: true, email: false },
//         dailyLimit: 5000,
//         startDate: today,
//         sendTime: now,
//         whatsappTemplateName: selectedTemplate.name,
//         whatsappTemplateLanguage: selectedTemplate.language || "en_US",
//         whatsappTemplateCategory: category,
//         whatsappTemplateBody: body,
//         whatsappTemplateHeaderType: headerType,
//         whatsappTemplateHeaderImageUrl: selectedTemplate.imageUrl || "",
//         whatsappTemplateHeaderDocumentUrl:
//           selectedTemplate.headerDocumentUrl || "",
//         whatsappTemplateVariables: variables,
//       });
//       const result = getPayload(response);
//       const queued = Number(result?.queued?.whatsapp ?? 0);
//       const successMessage =
//         response?.message ||
//         `${count(queued)} WhatsApp messages campaign queue mein add ho gaye.`;
//       setNotice(successMessage);
//       onCampaignStarted?.(successMessage);
//       window.setTimeout(() => {
//         if (onClose) onClose();
//         else
//           navigate("/outreach/whatsapp", {
//             replace: true,
//             state: { notice: successMessage },
//           });
//       }, 800);
//     } catch (error) {
//       setActionError(
//         errorMessage(
//           error,
//           "Campaign start nahi ho saki. Selected contacts, template aur Meta settings check karein.",
//         ),
//       );
//     } finally {
//       setLaunching(false);
//     }
//   };

//   const hasAudienceCount = selectedAudience
//     ? audienceTotal(selectedAudience)
//     : 0;
//   const footerCount =
//     tab === "audience" ? hasAudienceCount : activeSelectedCount;
//   const templateBodyPreview = templateBody(selectedTemplate);
//   const filteredAudienceList = audiences;
//   const startDisabled =
//     launching ||
//     !campaignName.trim() ||
//     !selectedTemplate ||
//     activeSelectedCount < 1 ||
//     effectiveCount < 1 ||
//     !optInConfirmed;

//   return (
//     <div
//       className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-[1px] sm:p-5"
//       onMouseDown={(event) => {
//         if (event.target === event.currentTarget && !launching) close();
//       }}
//     >
//       <section
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="whatsapp-campaign-title"
//         className="flex max-h-[calc(100dvh-16px)] w-full max-w-[1010px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-40px)]"
//       >
//         <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
//           <div className="flex min-w-0 items-center gap-3">
//             <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
//               <MessageCircle size={20} />
//             </span>
//             <div className="min-w-0">
//               <h2
//                 id="whatsapp-campaign-title"
//                 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
//               >
//                 Create WhatsApp campaign
//               </h2>
//               <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
//                 Audience chunein, template ka preview dekhein, aur bhejein.
//               </p>
//             </div>
//           </div>
//           <button
//             type="button"
//             aria-label="Close"
//             onClick={close}
//             disabled={launching}
//             className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
//           >
//             <X size={19} />
//           </button>
//         </header>

//         <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
//           {metaError && (
//             <div
//               role="alert"
//               className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
//             >
//               <AlertCircle size={17} className="mt-0.5 shrink-0" />
//               <span className="min-w-0">{metaError}</span>
//             </div>
//           )}
//           {(actionError || uploadError) && (
//             <div
//               role="alert"
//               className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
//             >
//               <AlertCircle size={17} className="mt-0.5 shrink-0" />
//               <span className="min-w-0">{actionError || uploadError}</span>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setActionError("");
//                   setUploadError("");
//                 }}
//                 aria-label="Dismiss error"
//                 className="ml-auto shrink-0"
//               >
//                 ×
//               </button>
//             </div>
//           )}
//           {notice && (
//             <div
//               role="status"
//               className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
//             >
//               <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
//               <span>{notice}</span>
//             </div>
//           )}

//           <label
//             className="mb-3 block text-xs font-bold text-slate-700"
//             htmlFor="whatsapp-campaign-name"
//           >
//             Campaign name
//             <input
//               id="whatsapp-campaign-name"
//               value={campaignName}
//               onChange={(event) => setCampaignName(event.target.value)}
//               maxLength={120}
//               className={`${fieldClass} mt-1.5`}
//               placeholder="WhatsApp campaign name"
//             />
//           </label>

//           <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.48fr)_minmax(285px,0.98fr)] lg:gap-4">
//             <div className="min-w-0">
//               <section className="rounded-xl border border-slate-200 p-3">
//                 <div className="flex flex-wrap items-center justify-between gap-2">
//                   <div>
//                     <h3 className="text-sm font-extrabold text-slate-800">
//                       Step 1 · Kisko bhejna hai?
//                     </h3>
//                     <p className="mt-0.5 text-[11px] text-slate-500">
//                       {count(footerCount)} contacts selected
//                     </p>
//                   </div>
//                   <div className="flex max-w-full items-center gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
//                     <button
//                       type="button"
//                       onClick={() => changeTab("contacts")}
//                       className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "contacts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
//                     >
//                       Contacts sheet
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => changeTab("audience")}
//                       className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "audience" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
//                     >
//                       Saved audience
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => changeTab("upload")}
//                       className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
//                     >
//                       Nayi sheet upload
//                     </button>
//                   </div>
//                 </div>
//               </section>

//               {tab === "contacts" && (
//                 <div className="mt-3 space-y-2.5">
//                   <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(145px,0.78fr)_minmax(0,1.22fr)]">
//                     <label className="relative block">
//                       <span className="sr-only">Contact filter</span>
//                       <select
//                         value={leadFilter}
//                         onChange={(event) => setLeadFilter(event.target.value)}
//                         className={`${fieldClass} appearance-none pr-9`}
//                       >
//                         <option value="all">Sab contacts</option>
//                         <option value="whatsapp">WhatsApp ready</option>
//                         <option value="missing">
//                           WhatsApp number nahi hai
//                         </option>
//                       </select>
//                       <ChevronDown
//                         size={15}
//                         className="pointer-events-none absolute right-3 top-3 text-slate-500"
//                       />
//                     </label>
//                     <label className="relative block">
//                       <span className="sr-only">Search contacts</span>
//                       <Search
//                         size={16}
//                         className="absolute left-3 top-3 text-slate-400"
//                       />
//                       <input
//                         value={leadSearch}
//                         onChange={(event) => {
//                           setLeadSearch(event.target.value);
//                           setLeadPage(1);
//                         }}
//                         className={`${fieldClass} pl-9`}
//                         placeholder="Naam, mobile, email, address ya job title"
//                       />
//                     </label>
//                   </div>

//                   <div className="rounded-xl bg-slate-50 px-3 py-2.5">
//                     <div className="flex flex-wrap items-center gap-2 text-xs">
//                       <span className="font-semibold text-slate-500">
//                         Sr. no.
//                       </span>
//                       <input
//                         aria-label="Range start"
//                         type="number"
//                         min="1"
//                         value={rangeStart}
//                         onChange={(event) => setRangeStart(event.target.value)}
//                         className="w-[68px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-emerald-500"
//                       />
//                       <span className="text-slate-500">se</span>
//                       <input
//                         aria-label="Range end"
//                         type="number"
//                         min="1"
//                         value={rangeEnd}
//                         onChange={(event) => setRangeEnd(event.target.value)}
//                         className="w-[68px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-emerald-500"
//                       />
//                       <span className="text-slate-500">tak</span>
//                       <button
//                         type="button"
//                         onClick={selectRange}
//                         disabled={!visibleLeads.length}
//                         className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-45"
//                       >
//                         Select karein
//                       </button>
//                       <span className="hidden h-5 w-px bg-slate-200 sm:block" />
//                       <button
//                         type="button"
//                         onClick={selectVisibleLeads}
//                         disabled={
//                           !visibleLeads.some((lead) =>
//                             String(lead.phone || "").trim(),
//                           )
//                         }
//                         className="px-1 py-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
//                       >
//                         Sab{" "}
//                         {count(
//                           visibleLeads.filter((lead) =>
//                             String(lead.phone || "").trim(),
//                           ).length,
//                         )}{" "}
//                         select
//                       </button>
//                       {selectedLeadIds.length > 0 && (
//                         <button
//                           type="button"
//                           onClick={() => setSelectedLeadIds([])}
//                           className="px-1 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
//                         >
//                           Clear
//                         </button>
//                       )}
//                     </div>
//                     <label className="mt-2 flex cursor-pointer items-center justify-end gap-2 text-[11px] text-slate-600">
//                       <input
//                         type="checkbox"
//                         checked={skipAlreadySent}
//                         onChange={(event) =>
//                           setSkipAlreadySent(event.target.checked)
//                         }
//                         className="h-3.5 w-3.5 accent-emerald-600"
//                       />
//                       Sirf jinhe abhi tak nahi bheja
//                     </label>
//                   </div>

//                   <div className="overflow-hidden rounded-xl border border-slate-200">
//                     <div className="max-h-[350px] overflow-auto">
//                       <table className="w-full min-w-[490px] table-fixed text-left text-xs">
//                         <thead className="sticky top-0 z-10 bg-slate-100 text-slate-500">
//                           <tr>
//                             <th className="w-8 px-2 py-3">
//                               <input
//                                 aria-label="Select all visible contacts"
//                                 type="checkbox"
//                                 checked={
//                                   visibleLeads.filter((lead) =>
//                                     String(lead.phone || "").trim(),
//                                   ).length > 0 &&
//                                   visibleLeads
//                                     .filter((lead) =>
//                                       String(lead.phone || "").trim(),
//                                     )
//                                     .every((lead) =>
//                                       selectedLeadIds.includes(
//                                         String(lead._id || lead.id),
//                                       ),
//                                     )
//                                 }
//                                 onChange={selectVisibleLeads}
//                                 className="h-3.5 w-3.5 accent-emerald-600"
//                               />
//                             </th>
//                             <th className="w-10 px-2 py-3">Sr.</th>
//                             <th className="px-2 py-3">Naam</th>
//                             <th className="w-[130px] px-2 py-3">WhatsApp</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {leadsLoading && (
//                             <tr>
//                               <td
//                                 colSpan={4}
//                                 className="px-3 py-8 text-center text-slate-500"
//                               >
//                                 <Loader2
//                                   size={17}
//                                   className="mx-auto mb-2 animate-spin"
//                                 />
//                                 Contacts load ho rahe hain…
//                               </td>
//                             </tr>
//                           )}
//                           {!leadsLoading && leadsError && (
//                             <tr>
//                               <td
//                                 colSpan={4}
//                                 className="px-3 py-5 text-center text-red-600"
//                               >
//                                 {leadsError}
//                               </td>
//                             </tr>
//                           )}
//                           {!leadsLoading &&
//                             !leadsError &&
//                             visibleLeads.length === 0 && (
//                               <tr>
//                                 <td
//                                   colSpan={4}
//                                   className="px-3 py-8 text-center text-slate-500"
//                                 >
//                                   Koi contact nahi mila.
//                                 </td>
//                               </tr>
//                             )}
//                           {!leadsLoading &&
//                             !leadsError &&
//                             visibleLeads.map((lead, index) => {
//                               const id = String(lead._id || lead.id);
//                               const serial =
//                                 (leadPage - 1) * PAGE_SIZE + index + 1;
//                               const canSend = Boolean(
//                                 String(lead.phone || "").trim(),
//                               );
//                               const checked = selectedLeadIds.includes(id);
//                               return (
//                                 <tr
//                                   key={id}
//                                   className={`border-t border-slate-100 ${checked ? "bg-emerald-50" : "bg-white"}`}
//                                 >
//                                   <td className="px-2 py-3">
//                                     <input
//                                       type="checkbox"
//                                       aria-label={`Select ${lead.name || "contact"}`}
//                                       disabled={!canSend}
//                                       checked={checked}
//                                       onChange={(event) =>
//                                         handleLeadCheckbox(lead, index, event)
//                                       }
//                                       className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-25"
//                                     />
//                                   </td>
//                                   <td className="px-2 py-3 text-slate-500">
//                                     {serial}
//                                   </td>
//                                   <td
//                                     className="truncate px-2 py-3 font-semibold text-slate-800"
//                                     title={lead.name || "Unknown contact"}
//                                   >
//                                     {lead.name || "—"}
//                                   </td>
//                                   <td
//                                     className="truncate px-2 py-3 text-slate-600"
//                                     title={lead.phone || "No WhatsApp number"}
//                                   >
//                                     {lead.phone || (
//                                       <span className="text-slate-400">
//                                         No phone
//                                       </span>
//                                     )}
//                                   </td>
//                                 </tr>
//                               );
//                             })}
//                         </tbody>
//                       </table>
//                     </div>
//                     <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
//                       <span>
//                         Sr. {leadsTotal ? (leadPage - 1) * PAGE_SIZE + 1 : 0}–
//                         {Math.min(leadPage * PAGE_SIZE, leadsTotal)} of{" "}
//                         {count(leadsTotal)} · Shift dabakar click = beech ke sab
//                       </span>
//                       <div className="flex items-center gap-2">
//                         <button
//                           type="button"
//                           aria-label="Previous page"
//                           disabled={leadPage <= 1 || leadsLoading}
//                           onClick={() =>
//                             setLeadPage((page) => Math.max(1, page - 1))
//                           }
//                           className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
//                         >
//                           <ChevronLeft size={14} />
//                         </button>
//                         <span>
//                           Page {leadPage} / {leadPages}
//                         </span>
//                         <button
//                           type="button"
//                           aria-label="Next page"
//                           disabled={leadPage >= leadPages || leadsLoading}
//                           onClick={() =>
//                             setLeadPage((page) => Math.min(leadPages, page + 1))
//                           }
//                           className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
//                         >
//                           <ChevronRight size={14} />
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {tab === "audience" && (
//                 <div className="mt-3 space-y-2.5">
//                   {audiencesLoading && (
//                     <div className="rounded-xl border border-slate-200 px-4 py-9 text-center text-sm text-slate-500">
//                       <Loader2
//                         size={18}
//                         className="mx-auto mb-2 animate-spin"
//                       />
//                       Saved audience load ho rahi hai…
//                     </div>
//                   )}
//                   {!audiencesLoading && audiencesError && (
//                     <div
//                       role="alert"
//                       className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
//                     >
//                       {audiencesError}
//                     </div>
//                   )}
//                   {!audiencesLoading &&
//                     !audiencesError &&
//                     filteredAudienceList.length === 0 && (
//                       <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
//                         Abhi koi saved audience nahi hai. Pehle Upload Data se
//                         audience banayein.
//                       </div>
//                     )}
//                   {!audiencesLoading &&
//                     !audiencesError &&
//                     filteredAudienceList.map((audience) => {
//                       const id = String(audience._id || audience.id);
//                       const active = selectedAudienceId === id;
//                       const total = audienceTotal(audience);
//                       const ready = audienceWhatsAppReady(audience);
//                       return (
//                         <button
//                           type="button"
//                           key={id}
//                           onClick={() => {
//                             setSelectedAudienceId(id);
//                             setSelectedLeadIds([]);
//                             setSelectedUploadKeys([]);
//                             setRecipientPreview(null);
//                             setActionError("");
//                           }}
//                           className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}
//                         >
//                           <span
//                             className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}
//                           >
//                             {active && <Check size={12} />}
//                           </span>
//                           <span className="min-w-0 flex-1">
//                             <span className="block truncate text-sm font-extrabold text-slate-800">
//                               {audience.name || "Untitled audience"}
//                             </span>
//                             <span className="mt-0.5 block truncate text-[11px] text-slate-500">
//                               {audience.sourceFileName
//                                 ? `Uploaded · ${audience.sourceFileName}`
//                                 : "Selected contacts"}
//                             </span>
//                           </span>
//                           <span className="shrink-0 text-right">
//                             <span className="block text-base font-extrabold tabular-nums text-slate-800">
//                               {count(total)}
//                             </span>
//                             <span className="block text-[10px] text-slate-400">
//                               {count(ready)} WhatsApp ready
//                             </span>
//                           </span>
//                         </button>
//                       );
//                     })}
//                 </div>
//               )}

//               {tab === "upload" && (
//                 <div className="mt-3 space-y-3">
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept=".csv,.xlsx"
//                     className="hidden"
//                     onChange={(event) => {
//                       const file = event.target.files?.[0];
//                       handleUpload(file);
//                       event.target.value = "";
//                     }}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => fileInputRef.current?.click()}
//                     className="flex min-h-[175px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40"
//                   >
//                     <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
//                       <FileSpreadsheet size={22} />
//                     </span>
//                     <span className="text-sm font-extrabold text-slate-800">
//                       CSV ya Excel sheet chunein
//                     </span>
//                     <span className="mt-1 text-xs text-slate-500">
//                       Name, Mobile / WhatsApp, Email address, Address, Job title
//                     </span>
//                     <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
//                       <UploadCloud size={14} />
//                       {uploadFile
//                         ? "Dusri sheet chunein"
//                         : "Sheet upload karein"}
//                     </span>
//                   </button>
//                   <div className="flex flex-wrap items-center justify-between gap-3">
//                     <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
//                       <input
//                         type="checkbox"
//                         checked={saveUploadAsAudience}
//                         onChange={(event) =>
//                           setSaveUploadAsAudience(event.target.checked)
//                         }
//                         className="h-3.5 w-3.5 accent-emerald-600"
//                       />
//                       Is sheet ko audience bhi bana dein
//                     </label>
//                     <button
//                       type="button"
//                       onClick={downloadSampleSheet}
//                       className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
//                     >
//                       <UploadCloud size={13} className="rotate-180" />
//                       Sample sheet
//                     </button>
//                   </div>
//                   {uploadFile && (
//                     <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
//                       Selected file: <b>{uploadFile.name}</b>
//                     </p>
//                   )}
//                   {uploadLoading && (
//                     <div className="rounded-xl border border-slate-200 px-3 py-5 text-center text-sm text-slate-500">
//                       <Loader2
//                         size={17}
//                         className="mx-auto mb-2 animate-spin"
//                       />
//                       Sheet check ho rahi hai…
//                     </div>
//                   )}
//                   {!uploadLoading && uploadPreview && (
//                     <div className="overflow-hidden rounded-xl border border-slate-200">
//                       <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 text-xs">
//                         <span className="font-bold text-slate-700">
//                           {count(validUploadRows.length)} valid WhatsApp
//                           contacts
//                         </span>
//                         <div className="flex gap-2">
//                           <button
//                             type="button"
//                             onClick={selectAllUploadRows}
//                             className="font-bold text-emerald-700"
//                           >
//                             Sab valid select
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => setSelectedUploadKeys([])}
//                             className="font-semibold text-slate-500"
//                           >
//                             Clear
//                           </button>
//                         </div>
//                       </div>
//                       <div className="max-h-[245px] overflow-auto">
//                         <table className="w-full min-w-[400px] text-left text-xs">
//                           <thead className="sticky top-0 bg-slate-100 text-slate-500">
//                             <tr>
//                               <th className="w-9 px-2 py-2.5"></th>
//                               <th className="w-12 px-2 py-2.5">Sr.</th>
//                               <th className="px-2 py-2.5">Naam</th>
//                               <th className="px-2 py-2.5">WhatsApp</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {uploadRows.map((row, index) => {
//                               const eligible = eligibleUploadRow(row);
//                               const selected = selectedUploadKeys.includes(
//                                 uploadRowKey(row, index),
//                               );
//                               return (
//                                 <tr
//                                   key={uploadRowKey(row, index)}
//                                   className={`border-t border-slate-100 ${selected ? "bg-emerald-50" : "bg-white"}`}
//                                 >
//                                   <td className="px-2 py-2.5">
//                                     <input
//                                       type="checkbox"
//                                       disabled={!eligible}
//                                       checked={selected}
//                                       onChange={(event) =>
//                                         toggleUploadRow(
//                                           row,
//                                           index,
//                                           event.target.checked,
//                                         )
//                                       }
//                                       className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-25"
//                                     />
//                                   </td>
//                                   <td className="px-2 py-2.5 text-slate-500">
//                                     {row.rowNumber || index + 1}
//                                   </td>
//                                   <td
//                                     className="max-w-[220px] truncate px-2 py-2.5 font-semibold text-slate-800"
//                                     title={row.name || ""}
//                                   >
//                                     {row.name || "—"}
//                                   </td>
//                                   <td className="px-2 py-2.5 text-slate-600">
//                                     {row.phone || row.mobile || "No phone"}
//                                   </td>
//                                 </tr>
//                               );
//                             })}
//                             {uploadRows.length === 0 && (
//                               <tr>
//                                 <td
//                                   colSpan={4}
//                                   className="px-3 py-5 text-center text-slate-500"
//                                 >
//                                   Sheet mein rows nahi mili.
//                                 </td>
//                               </tr>
//                             )}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <aside className="min-w-0 space-y-3">
//               <section className="rounded-xl border border-slate-200 p-3.5">
//                 <div className="flex items-start justify-between gap-2">
//                   <div>
//                     <h3 className="text-sm font-extrabold text-slate-800">
//                       Step 2 · Approved Meta template
//                     </h3>
//                     <p className="mt-1 text-[11px] text-slate-500">
//                       Template first message ke liye required hai.
//                     </p>
//                   </div>
//                   <Link
//                     to="/whatsapp/templates/new"
//                     onClick={() => {
//                       if (onClose) onClose();
//                     }}
//                     className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
//                   >
//                     <Plus size={13} />
//                     New template · approval
//                   </Link>
//                 </div>
//                 <label
//                   className="mt-4 block text-[11px] font-bold text-slate-600"
//                   htmlFor="approved-meta-template"
//                 >
//                   Choose template
//                 </label>
//                 <div className="relative mt-1.5">
//                   <select
//                     id="approved-meta-template"
//                     value={selectedTemplateKey}
//                     onChange={(event) =>
//                       setSelectedTemplateKey(event.target.value)
//                     }
//                     disabled={templatesLoading || templates.length === 0}
//                     className={`${fieldClass} appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50`}
//                   >
//                     <option value="">
//                       {templatesLoading
//                         ? "Approved templates load ho rahe hain…"
//                         : templates.length
//                           ? "Select an approved template"
//                           : "No approved template found"}
//                     </option>
//                     {templates.map((template) => (
//                       <option
//                         key={`${template.name}::${template.language || "en_US"}`}
//                         value={`${template.name}::${template.language || "en_US"}`}
//                       >
//                         {template.name} ({template.language || "en_US"})
//                       </option>
//                     ))}
//                   </select>
//                   <ChevronDown
//                     size={15}
//                     className="pointer-events-none absolute right-3 top-3 text-slate-500"
//                   />
//                 </div>
//                 {selectedTemplate && templateBodyPreview && (
//                   <div className="mt-3 rounded-lg bg-slate-50 p-3">
//                     <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
//                       Template preview
//                     </p>
//                     <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
//                       {templateBodyPreview}
//                     </p>
//                   </div>
//                 )}
//                 {!templatesLoading && !metaError && templates.length === 0 && (
//                   <p className="mt-2 text-[11px] text-amber-700">
//                     Meta Business Manager mein template approve hone ke baad
//                     yahan dikhega.
//                   </p>
//                 )}
//               </section>

//               <section className="rounded-xl border border-slate-200 p-3.5">
//                 <h3 className="text-sm font-extrabold text-slate-800">
//                   Send now
//                 </h3>
//                 <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
//                   Campaign jobs launch karte hi start ho jayenge. Messages
//                   provider-safe pacing ke saath ek-ek karke bheje jayenge; daily
//                   schedule ya start-time setting nahi hai.
//                 </p>
//                 <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-600">
//                   <input
//                     type="checkbox"
//                     checked={optInConfirmed}
//                     onChange={(event) =>
//                       setOptInConfirmed(event.target.checked)
//                     }
//                     className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
//                   />
//                   <span>
//                     Confirm karein: selected contacts ne WhatsApp messages ke
//                     liye opt-in diya hai.
//                   </span>
//                 </label>
//                 {(tab === "contacts" || tab === "audience") &&
//                   (previewLoading || recipientPreview) && (
//                     <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
//                       <div className="flex justify-between gap-2 text-slate-500">
//                         <span>Messages to be sent</span>
//                         <b className="text-slate-800">
//                           {previewLoading
//                             ? "…"
//                             : count(recipientPreview?.final ?? 0)}
//                         </b>
//                       </div>
//                       {recipientPreview?.skip > 0 && (
//                         <p className="mt-1 text-[10px] text-slate-500">
//                           {count(recipientPreview.skip)} previously sent
//                           contacts skip honge.
//                         </p>
//                       )}
//                     </div>
//                   )}
//               </section>
//             </aside>
//           </div>
//         </div>

//         <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
//           <p className="text-[11px] text-slate-500">
//             <b className="text-slate-700">{count(footerCount)} contacts</b> ·
//             message tabhi jayega jab aap Start campaign dabayenge.
//           </p>
//           <div className="ml-auto flex items-center gap-2">
//             <button
//               type="button"
//               onClick={close}
//               disabled={launching}
//               className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
//             >
//               Cancel
//             </button>
//             <button
//               type="button"
//               onClick={launchCampaign}
//               disabled={startDisabled}
//               className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
//             >
//               {launching ? (
//                 <Loader2 size={15} className="animate-spin" />
//               ) : (
//                 <Send size={15} />
//               )}
//               {launching ? "Starting…" : "Start campaign"}
//             </button>
//           </div>
//         </footer>
//       </section>
//     </div>
//   );
// }

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { audienceApi } from "../../api/audienceApi.js";
import { leadApi } from "../../api/leadApi.js";
import { campaignApi } from "../../api/outreachApi.js";
import { whatsappApi } from "../../api/whatsappApi.js";

const PAGE_SIZE = 50;
const count = (value) => Number(value || 0).toLocaleString("en-IN");
const errorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  fallback;

function getPayload(response) {
  return response?.data && typeof response.data === "object"
    ? response.data
    : response || {};
}

function templateBody(template) {
  return (
    template?.bodyText ||
    (template?.components || []).find(
      (part) => String(part.type).toUpperCase() === "BODY",
    )?.text ||
    ""
  );
}

function templateHeader(template) {
  return (
    (template?.components || []).find(
      (part) => String(part.type).toUpperCase() === "HEADER",
    ) || null
  );
}

function getHeaderType(template) {
  const explicit = String(template?.headerType || "").toLowerCase();
  if (explicit && explicit !== "none") return explicit;
  const format = String(templateHeader(template)?.format || "").toLowerCase();
  return ["image", "document", "text"].includes(format) ? format : "none";
}

function templateVariables(template) {
  const indexes = [
    ...new Set(
      [...templateBody(template).matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(
        (match) => Number(match[1]),
      ),
    ),
  ].sort((a, b) => a - b);
  return indexes.map((index) => ({
    index,
    source: "name",
    value: "",
    fallback: "Sir/Ma'am",
  }));
}

function audienceTotal(audience) {
  return Number(
    audience?.contactCount ??
      audience?.counts?.total ??
      audience?.counts?.valid ??
      audience?.leadIds?.length ??
      0,
  );
}

function audienceWhatsAppReady(audience) {
  return Number(
    audience?.counts?.whatsappReady ??
      audience?.whatsappReadyCount ??
      audience?.counts?.validWhatsApp ??
      audienceTotal(audience),
  );
}

function uploadRowKey(row, index) {
  return String(row?.rowNumber ?? row?._id ?? row?.id ?? index + 1);
}

function eligibleUploadRow(row) {
  const hasPhone = Boolean(String(row?.phone || row?.mobile || "").trim());
  const status = String(row?.status || "valid").toLowerCase();
  return (
    hasPhone &&
    status === "valid" &&
    !row?.isDuplicate &&
    !(row?.errors || []).length
  );
}

function campaignRow(row) {
  return {
    rowNumber: Number(row?.rowNumber || 0) || undefined,
    name: String(row?.name || row?.fullName || "").trim(),
    phone: String(row?.phone || row?.mobile || "").trim(),
    email: String(row?.email || "").trim(),
    address: String(row?.address || "").trim(),
    city: String(row?.city || "").trim(),
    location: String(row?.location || "").trim(),
    occupation: String(row?.occupation || row?.jobTitle || "").trim(),
    jobTitle: String(row?.jobTitle || row?.occupation || "").trim(),
    budgetMin: row?.budgetMin ?? null,
    budgetMax: row?.budgetMax ?? null,
    notes: String(row?.notes || "").trim(),
    requirements: String(row?.requirements || "").trim(),
    source: String(row?.source || "whatsapp_campaign_upload"),
  };
}

function downloadBlob(response, filename) {
  const blob =
    response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45";

export default function WhatsAppCampaignWizard({ onClose, onCampaignStarted }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const lastLeadClickIndex = useRef(null);
  const [campaignName, setCampaignName] = useState(
    `WhatsApp campaign ${new Date().toLocaleDateString("en-GB")}`,
  );
  const [tab, setTab] = useState("contacts");
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadPages, setLeadPages] = useState(1);
  const [leadPage, setLeadPage] = useState(1);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("50");

  const [audiences, setAudiences] = useState([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [audiencesError, setAudiencesError] = useState("");
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [audienceContacts, setAudienceContacts] = useState([]);
  const [audienceContactsTotal, setAudienceContactsTotal] = useState(0);
  const [audienceContactsPage, setAudienceContactsPage] = useState(1);
  const [audienceContactsPages, setAudienceContactsPages] = useState(1);
  const [audienceContactsLoading, setAudienceContactsLoading] = useState(false);
  const [audienceContactsError, setAudienceContactsError] = useState("");

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadRows, setUploadRows] = useState([]);
  const [selectedUploadKeys, setSelectedUploadKeys] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveUploadAsAudience, setSaveUploadAsAudience] = useState(true);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [optInConfirmed, setOptInConfirmed] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedAudience = useMemo(
    () =>
      audiences.find(
        (audience) =>
          String(audience._id || audience.id) === selectedAudienceId,
      ) || null,
    [audiences, selectedAudienceId],
  );
  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          `${template.name}::${template.language || "en_US"}` ===
          selectedTemplateKey,
      ) || null,
    [templates, selectedTemplateKey],
  );

  const visibleLeads = useMemo(() => {
    if (leadFilter === "whatsapp")
      return leads.filter((lead) => String(lead.phone || "").trim());
    if (leadFilter === "missing")
      return leads.filter((lead) => !String(lead.phone || "").trim());
    return leads;
  }, [leads, leadFilter]);

  const validUploadRows = useMemo(
    () => uploadRows.filter(eligibleUploadRow),
    [uploadRows],
  );
  const selectedUploadRows = useMemo(
    () =>
      uploadRows.filter(
        (row, index) =>
          selectedUploadKeys.includes(uploadRowKey(row, index)) &&
          eligibleUploadRow(row),
      ),
    [uploadRows, selectedUploadKeys],
  );

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError("");
    try {
      const response = await leadApi.list({
        page: leadPage,
        limit: PAGE_SIZE,
        ...(leadSearch.trim() ? { search: leadSearch.trim() } : {}),
      });
      const payload = getPayload(response);
      const rows = Array.isArray(payload.leads)
        ? payload.leads
        : Array.isArray(response?.leads)
          ? response.leads
          : [];
      const pagination = payload.pagination || response?.pagination || {};
      const total = Number(pagination.total ?? payload.total ?? rows.length);
      setLeads(rows);
      setLeadsTotal(total);
      setLeadPages(
        Math.max(
          1,
          Number(
            pagination.totalPages ??
              pagination.pages ??
              (Math.ceil(total / PAGE_SIZE) || 1),
          ),
        ),
      );
    } catch (error) {
      setLeads([]);
      setLeadsTotal(0);
      setLeadPages(1);
      setLeadsError(errorMessage(error, "Contacts sheet load nahi ho saki."));
    } finally {
      setLeadsLoading(false);
    }
  }, [leadPage, leadSearch]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    let alive = true;
    setAudiencesLoading(true);
    setAudiencesError("");
    audienceApi
      .list()
      .then((response) => {
        if (!alive) return;
        const payload = getPayload(response);
        const items = Array.isArray(payload.audiences)
          ? payload.audiences
          : Array.isArray(response?.audiences)
            ? response.audiences
            : [];
        setAudiences(items);
      })
      .catch((error) => {
        if (alive)
          setAudiencesError(
            errorMessage(error, "Saved audience load nahi ho saki."),
          );
      })
      .finally(() => {
        if (alive) setAudiencesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "audience" || !selectedAudienceId) {
      setAudienceContacts([]);
      setAudienceContactsTotal(0);
      setAudienceContactsPages(1);
      setAudienceContactsError("");
      setAudienceContactsLoading(false);
      return undefined;
    }

    let alive = true;
    setAudienceContacts([]);
    setAudienceContactsTotal(0);
    setAudienceContactsPages(1);
    setAudienceContactsError("");
    setAudienceContactsLoading(true);

    audienceApi
      .contacts(selectedAudienceId, { page: audienceContactsPage, limit: 100 })
      .then((response) => {
        if (!alive) return;
        const payload = getPayload(response);
        const contacts = Array.isArray(payload.contacts)
          ? payload.contacts
          : [];
        const pagination = payload.pagination || {};
        const total = Number(
          payload.total ?? pagination.total ?? contacts.length,
        );
        setAudienceContacts(contacts);
        setAudienceContactsTotal(total);
        setAudienceContactsPages(
          Math.max(
            1,
            Number(pagination.totalPages ?? Math.ceil(total / 100) ?? 1),
          ),
        );
      })
      .catch((error) => {
        if (!alive) return;
        setAudienceContactsError(
          errorMessage(
            error,
            "Selected audience ke contact numbers load nahi ho paaye.",
          ),
        );
      })
      .finally(() => {
        if (alive) setAudienceContactsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tab, selectedAudienceId, audienceContactsPage]);

  useEffect(() => {
    let alive = true;
    setTemplatesLoading(true);
    setMetaError("");
    whatsappApi
      .templates()
      .then((response) => {
        if (!alive) return;
        const payload = getPayload(response);
        const approved = (
          Array.isArray(payload.templates) ? payload.templates : []
        ).filter(
          (template) =>
            String(template.status || "").toUpperCase() === "APPROVED",
        );
        setTemplates(approved);
        setSelectedTemplateKey((current) =>
          current &&
          approved.some(
            (template) =>
              `${template.name}::${template.language || "en_US"}` === current,
          )
            ? current
            : "",
        );
      })
      .catch((error) => {
        if (alive) {
          setTemplates([]);
          setSelectedTemplateKey("");
          setMetaError(
            errorMessage(error, "Approved Meta templates load nahi ho sake."),
          );
        }
      })
      .finally(() => {
        if (alive) setTemplatesLoading(false);
      });
    whatsappApi
      .status()
      .then((response) => {
        if (!alive) return;
        const payload = getPayload(response);
        const possibleError =
          payload?.error?.message ||
          payload?.errorMessage ||
          (payload?.ok === false ? payload?.message : "");
        if (possibleError)
          setMetaError((current) => current || String(possibleError));
      })
      .catch((error) => {
        if (alive)
          setMetaError(
            (current) =>
              current ||
              errorMessage(
                error,
                "WhatsApp Meta connection status check nahi ho saka.",
              ),
          );
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let payload = null;
    if (tab === "contacts" && selectedLeadIds.length)
      payload = { leadIds: selectedLeadIds };
    if (tab === "audience" && selectedAudienceId)
      payload = { audienceId: selectedAudienceId };
    if (!payload) {
      setRecipientPreview(null);
      setPreviewLoading(false);
      return undefined;
    }
    setPreviewLoading(true);
    campaignApi
      .preview({
        ...payload,
        channel: "whatsapp",
        skipAlreadySent,
        category: String(
          selectedTemplate?.category || "MARKETING",
        ).toUpperCase(),
      })
      .then((response) => {
        if (!alive) return;
        setRecipientPreview(getPayload(response));
      })
      .catch(() => {
        if (alive) setRecipientPreview(null);
      })
      .finally(() => {
        if (alive) setPreviewLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    tab,
    selectedLeadIds,
    selectedAudienceId,
    skipAlreadySent,
    selectedTemplate?.category,
  ]);

  const close = () => {
    if (onClose) onClose();
    else navigate("/outreach/whatsapp", { replace: true });
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setActionError("");
    setNotice("");
  };

  const toggleLead = (leadId, checked) => {
    const id = String(leadId);
    setSelectedLeadIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    );
    setRecipientPreview(null);
    setActionError("");
  };

  const handleLeadCheckbox = (lead, index, event) => {
    const checked = event.target.checked;
    const id = String(lead._id || lead.id);
    if (event.nativeEvent?.shiftKey && lastLeadClickIndex.current !== null) {
      const start = Math.min(lastLeadClickIndex.current, index);
      const end = Math.max(lastLeadClickIndex.current, index);
      const rangeIds = visibleLeads
        .slice(start, end + 1)
        .filter((item) => String(item.phone || "").trim())
        .map((item) => String(item._id || item.id));
      setSelectedLeadIds((current) => {
        const next = new Set(current);
        rangeIds.forEach((rangeId) => {
          if (checked) next.add(rangeId);
          else next.delete(rangeId);
        });
        return [...next];
      });
      setRecipientPreview(null);
      setActionError("");
    } else {
      toggleLead(id, checked);
    }
    lastLeadClickIndex.current = index;
  };

  const selectVisibleLeads = () => {
    const eligibleIds = visibleLeads
      .filter((lead) => String(lead.phone || "").trim())
      .map((lead) => String(lead._id || lead.id));
    const selected = new Set(selectedLeadIds);
    const allSelected =
      eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
    if (allSelected) eligibleIds.forEach((id) => selected.delete(id));
    else eligibleIds.forEach((id) => selected.add(id));
    setSelectedLeadIds([...selected]);
    setRecipientPreview(null);
    setActionError("");
  };

  const selectRange = () => {
    const first = Math.max(1, Number.parseInt(rangeStart, 10) || 1);
    const last = Math.max(first, Number.parseInt(rangeEnd, 10) || first);
    const selected = new Set(selectedLeadIds);
    visibleLeads.forEach((lead, index) => {
      const serial = (leadPage - 1) * PAGE_SIZE + index + 1;
      if (serial >= first && serial <= last && String(lead.phone || "").trim())
        selected.add(String(lead._id || lead.id));
    });
    setSelectedLeadIds([...selected]);
    setRecipientPreview(null);
    setActionError("");
  };

  const selectAllUploadRows = () => {
    const validKeys = uploadRows.filter(eligibleUploadRow).map(uploadRowKey);
    setSelectedUploadKeys(validKeys);
  };

  const toggleUploadRow = (row, index, checked) => {
    const key = uploadRowKey(row, index);
    setSelectedUploadKeys((current) =>
      checked
        ? [...new Set([...current, key])]
        : current.filter((item) => item !== key),
    );
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      setUploadError(
        "CSV ya Excel workbook (.xlsx) upload karein. Purani .xls file ko pehle .xlsx mein save karein.",
      );
      return;
    }
    setUploadFile(file);
    setUploadError("");
    setUploadPreview(null);
    setUploadRows([]);
    setSelectedUploadKeys([]);
    setUploadLoading(true);
    try {
      const response = await audienceApi.previewFile(file, true);
      const payload = getPayload(response);
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      setUploadPreview(payload);
      setUploadRows(rows);
      setSaveUploadAsAudience(true);
    } catch (error) {
      setUploadError(
        errorMessage(
          error,
          "Sheet read nahi ho saki. Header row aur file format check karein.",
        ),
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadSampleSheet = async () => {
    try {
      const response = await leadApi.sampleSheet();
      downloadBlob(response, "propai-contacts-sample.xlsx");
    } catch (error) {
      setUploadError(
        errorMessage(error, "Sample sheet download nahi ho saki."),
      );
    }
  };

  const activeSelectedCount = useMemo(() => {
    if (tab === "contacts") return selectedLeadIds.length;
    if (tab === "audience")
      return selectedAudience ? audienceTotal(selectedAudience) : 0;
    return selectedUploadRows.length;
  }, [
    tab,
    selectedLeadIds.length,
    selectedAudience,
    selectedUploadRows.length,
  ]);

  const effectiveCount = useMemo(() => {
    if (tab === "contacts")
      return Number(recipientPreview?.final ?? selectedLeadIds.length);
    if (tab === "audience")
      return Number(
        recipientPreview?.final ??
          (selectedAudience ? audienceWhatsAppReady(selectedAudience) : 0),
      );
    return selectedUploadRows.length;
  }, [
    tab,
    recipientPreview,
    selectedLeadIds.length,
    selectedAudience,
    selectedUploadRows.length,
  ]);

  const launchCampaign = async () => {
    setActionError("");
    setNotice("");
    if (!campaignName.trim()) {
      setActionError("Campaign name zaroori hai.");
      return;
    }
    if (!selectedTemplate) {
      setActionError("Approved Meta template select karein.");
      return;
    }
    if (activeSelectedCount < 1 || effectiveCount < 1) {
      setActionError(
        "WhatsApp number wale kam se kam ek contact select karein.",
      );
      return;
    }
    if (!optInConfirmed) {
      setActionError(
        "Campaign se pehle confirm karein ki selected contacts ne WhatsApp messages ke liye opt-in diya hai.",
      );
      return;
    }

    setLaunching(true);
    try {
      let recipients = {};
      if (tab === "contacts") {
        recipients = { leadIds: selectedLeadIds };
      } else if (tab === "audience") {
        recipients = { audienceId: selectedAudienceId };
      } else {
        if (saveUploadAsAudience) {
          const audienceName = `${campaignName.trim()} audience`.slice(0, 120);
          const previewSourceType = String(
            uploadPreview?.sourceType || "upload",
          ).toLowerCase();
          const safeSourceType = ["upload", "paste", "leads"].includes(
            previewSourceType,
          )
            ? previewSourceType
            : "upload";
          const audienceResponse = await audienceApi.create({
            name: audienceName,
            tags: [],
            sourceType: safeSourceType,
            sourceLabel:
              uploadPreview?.sourceLabel ||
              uploadFile?.name ||
              "WhatsApp campaign upload",
            sourceFileName:
              uploadPreview?.sourceFileName || uploadFile?.name || "",
            addToCrm: true,
            addCountryCode: true,
            rows: selectedUploadRows.map((row) => ({
              ...campaignRow(row),
              rowNumber: row.rowNumber,
              status: "valid",
              isDuplicate: false,
              duplicateReason: "",
              errors: [],
            })),
          });
          const createdAudience = getPayload(audienceResponse).audience;
          const createdAudienceId = createdAudience?._id || createdAudience?.id;
          if (!createdAudienceId)
            throw new Error(
              "Audience save response mein ID nahi mili. Audience page check karein.",
            );
          recipients = { audienceId: String(createdAudienceId) };
        } else {
          recipients = { rows: selectedUploadRows.map(campaignRow) };
        }
      }

      const body = templateBody(selectedTemplate);
      const headerType = getHeaderType(selectedTemplate);
      const category = String(
        selectedTemplate.category || "MARKETING",
      ).toUpperCase();
      const variables = templateVariables(selectedTemplate);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const now = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());

      const response = await campaignApi.launch({
        name: campaignName.trim(),
        ...recipients,
        skipAlreadySent,
        optInConfirmed,
        channels: { whatsapp: true, email: false },
        dailyLimit: 5000,
        startDate: today,
        sendTime: now,
        whatsappTemplateName: selectedTemplate.name,
        whatsappTemplateLanguage: selectedTemplate.language || "en_US",
        whatsappTemplateCategory: category,
        whatsappTemplateBody: body,
        whatsappTemplateHeaderType: headerType,
        whatsappTemplateHeaderImageUrl: selectedTemplate.imageUrl || "",
        whatsappTemplateHeaderDocumentUrl:
          selectedTemplate.headerDocumentUrl || "",
        whatsappTemplateVariables: variables,
      });
      const result = getPayload(response);
      const queued = Number(result?.queued?.whatsapp ?? 0);
      const successMessage =
        response?.message ||
        `${count(queued)} WhatsApp messages campaign queue mein add ho gaye.`;
      setNotice(successMessage);
      onCampaignStarted?.(successMessage);
      window.setTimeout(() => {
        if (onClose) onClose();
        else
          navigate("/outreach/whatsapp", {
            replace: true,
            state: { notice: successMessage },
          });
      }, 800);
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "Campaign start nahi ho saki. Selected contacts, template aur Meta settings check karein.",
        ),
      );
    } finally {
      setLaunching(false);
    }
  };

  const hasAudienceCount = selectedAudience
    ? audienceTotal(selectedAudience)
    : 0;
  const footerCount =
    tab === "audience" ? hasAudienceCount : activeSelectedCount;
  const templateBodyPreview = templateBody(selectedTemplate);
  const filteredAudienceList = audiences;
  const waitingForRecipientCheck = tab !== "upload" && previewLoading;
  const startDisabled =
    launching ||
    !campaignName.trim() ||
    !selectedTemplate ||
    activeSelectedCount < 1 ||
    effectiveCount < 1 ||
    !optInConfirmed ||
    waitingForRecipientCheck;
  const startDisabledReason = launching
    ? "Campaign start ho rahi hai…"
    : !campaignName.trim()
      ? "Campaign name likhein."
      : !selectedTemplate
        ? "Start karne se pehle approved Meta template select karein."
        : activeSelectedCount < 1
          ? "Pehle contacts ya saved audience select karein."
          : waitingForRecipientCheck
            ? "Selected contacts verify ho rahe hain…"
            : effectiveCount < 1
              ? skipAlreadySent
                ? "Koi eligible contact nahi bacha. 'Pehle message nahi bheja' filter uncheck karke preview check karein."
                : "Selected audience mein bhejne layak WhatsApp number nahi mila."
              : !optInConfirmed
                ? "Start karne ke liye WhatsApp opt-in confirmation tick karein."
                : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] sm:p-6 lg:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !launching) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-campaign-title"
        className="flex max-h-[calc(100dvh-48px)] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-64px)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <MessageCircle size={20} />
            </span>
            <div className="min-w-0">
              <h2
                id="whatsapp-campaign-title"
                className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
              >
                Create WhatsApp campaign
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Audience chunein, template ka preview dekhein, aur bhejein.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            disabled={launching}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {metaError && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span className="min-w-0">{metaError}</span>
            </div>
          )}
          {(actionError || uploadError) && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span className="min-w-0">{actionError || uploadError}</span>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setUploadError("");
                }}
                aria-label="Dismiss error"
                className="ml-auto shrink-0"
              >
                ×
              </button>
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
            >
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <label
            className="mb-3 block text-xs font-bold text-slate-700"
            htmlFor="whatsapp-campaign-name"
          >
            Campaign name
            <input
              id="whatsapp-campaign-name"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              maxLength={120}
              className={`${fieldClass} mt-1.5`}
              placeholder="WhatsApp campaign name"
            />
          </label>

          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.48fr)_minmax(285px,0.98fr)] lg:gap-4">
            <div className="min-w-0">
              <section className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Step 1 · Kisko bhejna hai?
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {count(footerCount)} contacts selected
                    </p>
                  </div>
                  <div className="flex max-w-full items-center gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => changeTab("contacts")}
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "contacts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Contacts sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTab("audience")}
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "audience" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Saved audience
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTab("upload")}
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 transition ${tab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Nayi sheet upload
                    </button>
                  </div>
                </div>
              </section>

              {tab === "contacts" && (
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(145px,0.78fr)_minmax(0,1.22fr)]">
                    <label className="relative block">
                      <span className="sr-only">Contact filter</span>
                      <select
                        value={leadFilter}
                        onChange={(event) => setLeadFilter(event.target.value)}
                        className={`${fieldClass} appearance-none pr-9`}
                      >
                        <option value="all">Sab contacts</option>
                        <option value="whatsapp">WhatsApp ready</option>
                        <option value="missing">
                          WhatsApp number nahi hai
                        </option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-3 text-slate-500"
                      />
                    </label>
                    <label className="relative block">
                      <span className="sr-only">Search contacts</span>
                      <Search
                        size={16}
                        className="absolute left-3 top-3 text-slate-400"
                      />
                      <input
                        value={leadSearch}
                        onChange={(event) => {
                          setLeadSearch(event.target.value);
                          setLeadPage(1);
                        }}
                        className={`${fieldClass} pl-9`}
                        placeholder="Naam, mobile, email, address ya job title"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500">
                        Sr. no.
                      </span>
                      <input
                        aria-label="Range start"
                        type="number"
                        min="1"
                        value={rangeStart}
                        onChange={(event) => setRangeStart(event.target.value)}
                        className="w-[68px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-emerald-500"
                      />
                      <span className="text-slate-500">se</span>
                      <input
                        aria-label="Range end"
                        type="number"
                        min="1"
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(event.target.value)}
                        className="w-[68px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-emerald-500"
                      />
                      <span className="text-slate-500">tak</span>
                      <button
                        type="button"
                        onClick={selectRange}
                        disabled={!visibleLeads.length}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-45"
                      >
                        Select karein
                      </button>
                      <span className="hidden h-5 w-px bg-slate-200 sm:block" />
                      <button
                        type="button"
                        onClick={selectVisibleLeads}
                        disabled={
                          !visibleLeads.some((lead) =>
                            String(lead.phone || "").trim(),
                          )
                        }
                        className="px-1 py-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Sab{" "}
                        {count(
                          visibleLeads.filter((lead) =>
                            String(lead.phone || "").trim(),
                          ).length,
                        )}{" "}
                        select
                      </button>
                      {selectedLeadIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedLeadIds([])}
                          className="px-1 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="max-h-[350px] overflow-auto">
                      <table className="w-full min-w-[490px] table-fixed text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-500">
                          <tr>
                            <th className="w-8 px-2 py-3">
                              <input
                                aria-label="Select all visible contacts"
                                type="checkbox"
                                checked={
                                  visibleLeads.filter((lead) =>
                                    String(lead.phone || "").trim(),
                                  ).length > 0 &&
                                  visibleLeads
                                    .filter((lead) =>
                                      String(lead.phone || "").trim(),
                                    )
                                    .every((lead) =>
                                      selectedLeadIds.includes(
                                        String(lead._id || lead.id),
                                      ),
                                    )
                                }
                                onChange={selectVisibleLeads}
                                className="h-3.5 w-3.5 accent-emerald-600"
                              />
                            </th>
                            <th className="w-10 px-2 py-3">Sr.</th>
                            <th className="px-2 py-3">Naam</th>
                            <th className="w-[130px] px-2 py-3">WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leadsLoading && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-8 text-center text-slate-500"
                              >
                                <Loader2
                                  size={17}
                                  className="mx-auto mb-2 animate-spin"
                                />
                                Contacts load ho rahe hain…
                              </td>
                            </tr>
                          )}
                          {!leadsLoading && leadsError && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-5 text-center text-red-600"
                              >
                                {leadsError}
                              </td>
                            </tr>
                          )}
                          {!leadsLoading &&
                            !leadsError &&
                            visibleLeads.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-3 py-8 text-center text-slate-500"
                                >
                                  Koi contact nahi mila.
                                </td>
                              </tr>
                            )}
                          {!leadsLoading &&
                            !leadsError &&
                            visibleLeads.map((lead, index) => {
                              const id = String(lead._id || lead.id);
                              const serial =
                                (leadPage - 1) * PAGE_SIZE + index + 1;
                              const canSend = Boolean(
                                String(lead.phone || "").trim(),
                              );
                              const checked = selectedLeadIds.includes(id);
                              return (
                                <tr
                                  key={id}
                                  className={`border-t border-slate-100 ${checked ? "bg-emerald-50" : "bg-white"}`}
                                >
                                  <td className="px-2 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${lead.name || "contact"}`}
                                      disabled={!canSend}
                                      checked={checked}
                                      onChange={(event) =>
                                        handleLeadCheckbox(lead, index, event)
                                      }
                                      className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-25"
                                    />
                                  </td>
                                  <td className="px-2 py-3 text-slate-500">
                                    {serial}
                                  </td>
                                  <td
                                    className="truncate px-2 py-3 font-semibold text-slate-800"
                                    title={lead.name || "Unknown contact"}
                                  >
                                    {lead.name || "—"}
                                  </td>
                                  <td
                                    className="truncate px-2 py-3 text-slate-600"
                                    title={lead.phone || "No WhatsApp number"}
                                  >
                                    {lead.phone || (
                                      <span className="text-slate-400">
                                        No phone
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
                      <span>
                        Sr. {leadsTotal ? (leadPage - 1) * PAGE_SIZE + 1 : 0}–
                        {Math.min(leadPage * PAGE_SIZE, leadsTotal)} of{" "}
                        {count(leadsTotal)} · Shift dabakar click = beech ke sab
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Previous page"
                          disabled={leadPage <= 1 || leadsLoading}
                          onClick={() =>
                            setLeadPage((page) => Math.max(1, page - 1))
                          }
                          className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span>
                          Page {leadPage} / {leadPages}
                        </span>
                        <button
                          type="button"
                          aria-label="Next page"
                          disabled={leadPage >= leadPages || leadsLoading}
                          onClick={() =>
                            setLeadPage((page) => Math.min(leadPages, page + 1))
                          }
                          className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "audience" && (
                <div className="mt-3 space-y-2.5">
                  {audiencesLoading && (
                    <div className="rounded-xl border border-slate-200 px-4 py-9 text-center text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="mx-auto mb-2 animate-spin"
                      />
                      Saved audience load ho rahi hai…
                    </div>
                  )}
                  {!audiencesLoading && audiencesError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                    >
                      {audiencesError}
                    </div>
                  )}
                  {!audiencesLoading &&
                    !audiencesError &&
                    filteredAudienceList.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                        Abhi koi saved audience nahi hai. Pehle Upload Data se
                        audience banayein.
                      </div>
                    )}
                  {!audiencesLoading &&
                    !audiencesError &&
                    filteredAudienceList.map((audience) => {
                      const id = String(audience._id || audience.id);
                      const active = selectedAudienceId === id;
                      const total = audienceTotal(audience);
                      const ready = audienceWhatsAppReady(audience);
                      return (
                        <button
                          type="button"
                          key={id}
                          onClick={() => {
                            setSelectedAudienceId(id);
                            setAudienceContactsPage(1);
                            setSelectedLeadIds([]);
                            setSelectedUploadKeys([]);
                            setRecipientPreview(null);
                            setActionError("");
                            setNotice("");
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}
                          >
                            {active && <Check size={12} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-slate-800">
                              {audience.name || "Untitled audience"}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                              {audience.sourceFileName
                                ? `Uploaded · ${audience.sourceFileName}`
                                : "Selected contacts"}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-base font-extrabold tabular-nums text-slate-800">
                              {count(total)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {count(ready)} WhatsApp ready
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  {selectedAudience && (
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-800">
                            Selected audience contacts
                          </h4>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {selectedAudience.name || "Selected audience"} ·{" "}
                            {count(audienceContactsTotal)} contacts
                          </p>
                        </div>
                        {audienceContactsTotal > audienceContacts.length &&
                          !audienceContactsLoading && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                              Showing {count(audienceContacts.length)} of{" "}
                              {count(audienceContactsTotal)}
                            </span>
                          )}
                      </div>
                      {audienceContactsLoading ? (
                        <div className="flex items-center justify-center gap-2 px-3 py-7 text-sm text-slate-500">
                          <Loader2 size={16} className="animate-spin" /> Contact
                          numbers load ho rahe hain…
                        </div>
                      ) : audienceContactsError ? (
                        <div
                          role="alert"
                          className="px-3 py-4 text-xs text-red-600"
                        >
                          {audienceContactsError}
                        </div>
                      ) : audienceContacts.length === 0 ? (
                        <div className="px-3 py-5 text-xs text-slate-500">
                          Is audience mein dikhane ke liye saved contacts nahi
                          mile.
                        </div>
                      ) : (
                        <div className="max-h-[250px] overflow-auto">
                          <table className="w-full min-w-[470px] text-left text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-500">
                              <tr>
                                <th className="w-10 px-3 py-2.5">Sr.</th>
                                <th className="px-3 py-2.5">Name</th>
                                <th className="px-3 py-2.5">WhatsApp number</th>
                                <th className="px-3 py-2.5">Email</th>
                              </tr>
                            </thead>
                            <tbody>
                              {audienceContacts.map((contact, index) => (
                                <tr
                                  key={
                                    contact._id ||
                                    contact.id ||
                                    `${contact.phone}-${index}`
                                  }
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-3 py-2.5 text-slate-500">
                                    {(audienceContactsPage - 1) * 100 +
                                      index +
                                      1}
                                  </td>
                                  <td
                                    className="max-w-[150px] truncate px-3 py-2.5 font-semibold text-slate-800"
                                    title={contact.name || ""}
                                  >
                                    {contact.name || "—"}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">
                                    {contact.phone ||
                                      contact.mobile ||
                                      contact.whatsappNumber || (
                                        <span className="text-slate-400">
                                          No phone
                                        </span>
                                      )}
                                  </td>
                                  <td
                                    className="max-w-[140px] truncate px-3 py-2.5 text-slate-500"
                                    title={contact.email || ""}
                                  >
                                    {contact.email || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {audienceContactsPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                          <span>
                            Page {audienceContactsPage} /{" "}
                            {audienceContactsPages}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={
                                audienceContactsPage <= 1 ||
                                audienceContactsLoading
                              }
                              onClick={() =>
                                setAudienceContactsPage((page) =>
                                  Math.max(1, page - 1),
                                )
                              }
                              className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
                              aria-label="Previous audience contacts page"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={
                                audienceContactsPage >= audienceContactsPages ||
                                audienceContactsLoading
                              }
                              onClick={() =>
                                setAudienceContactsPage((page) =>
                                  Math.min(audienceContactsPages, page + 1),
                                )
                              }
                              className="rounded-md border border-slate-200 p-1.5 disabled:opacity-30"
                              aria-label="Next audience contacts page"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                        Ye preview list hai; contact table par click karne se
                        audience membership nahi badlegi.
                      </p>
                    </section>
                  )}
                </div>
              )}

              {tab === "upload" && (
                <div className="mt-3 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      handleUpload(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-[175px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40"
                  >
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet size={22} />
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">
                      CSV ya Excel sheet chunein
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Name, Mobile / WhatsApp, Email address, Address, Job title
                    </span>
                    <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                      <UploadCloud size={14} />
                      {uploadFile
                        ? "Dusri sheet chunein"
                        : "Sheet upload karein"}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={saveUploadAsAudience}
                        onChange={(event) =>
                          setSaveUploadAsAudience(event.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      Is sheet ko audience bhi bana dein
                    </label>
                    <button
                      type="button"
                      onClick={downloadSampleSheet}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      <UploadCloud size={13} className="rotate-180" />
                      Sample sheet
                    </button>
                  </div>
                  {uploadFile && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Selected file: <b>{uploadFile.name}</b>
                    </p>
                  )}
                  {uploadLoading && (
                    <div className="rounded-xl border border-slate-200 px-3 py-5 text-center text-sm text-slate-500">
                      <Loader2
                        size={17}
                        className="mx-auto mb-2 animate-spin"
                      />
                      Sheet check ho rahi hai…
                    </div>
                  )}
                  {!uploadLoading && uploadPreview && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 text-xs">
                        <span className="font-bold text-slate-700">
                          {count(validUploadRows.length)} valid WhatsApp
                          contacts
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllUploadRows}
                            className="font-bold text-emerald-700"
                          >
                            Sab valid select
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedUploadKeys([])}
                            className="font-semibold text-slate-500"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[245px] overflow-auto">
                        <table className="w-full min-w-[400px] text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-500">
                            <tr>
                              <th className="w-9 px-2 py-2.5"></th>
                              <th className="w-12 px-2 py-2.5">Sr.</th>
                              <th className="px-2 py-2.5">Naam</th>
                              <th className="px-2 py-2.5">WhatsApp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadRows.map((row, index) => {
                              const eligible = eligibleUploadRow(row);
                              const selected = selectedUploadKeys.includes(
                                uploadRowKey(row, index),
                              );
                              return (
                                <tr
                                  key={uploadRowKey(row, index)}
                                  className={`border-t border-slate-100 ${selected ? "bg-emerald-50" : "bg-white"}`}
                                >
                                  <td className="px-2 py-2.5">
                                    <input
                                      type="checkbox"
                                      disabled={!eligible}
                                      checked={selected}
                                      onChange={(event) =>
                                        toggleUploadRow(
                                          row,
                                          index,
                                          event.target.checked,
                                        )
                                      }
                                      className="h-3.5 w-3.5 accent-emerald-600 disabled:opacity-25"
                                    />
                                  </td>
                                  <td className="px-2 py-2.5 text-slate-500">
                                    {row.rowNumber || index + 1}
                                  </td>
                                  <td
                                    className="max-w-[220px] truncate px-2 py-2.5 font-semibold text-slate-800"
                                    title={row.name || ""}
                                  >
                                    {row.name || "—"}
                                  </td>
                                  <td className="px-2 py-2.5 text-slate-600">
                                    {row.phone || row.mobile || "No phone"}
                                  </td>
                                </tr>
                              );
                            })}
                            {uploadRows.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-3 py-5 text-center text-slate-500"
                                >
                                  Sheet mein rows nahi mili.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="min-w-0 space-y-3">
              <section className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Step 2 · Approved Meta template
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Template first message ke liye required hai.
                    </p>
                  </div>
                  <Link
                    to="/whatsapp/templates/new"
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus size={13} />
                    New template · approval
                  </Link>
                </div>
                <label
                  className="mt-4 block text-[11px] font-bold text-slate-600"
                  htmlFor="approved-meta-template"
                >
                  Choose template
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="approved-meta-template"
                    value={selectedTemplateKey}
                    onChange={(event) =>
                      setSelectedTemplateKey(event.target.value)
                    }
                    disabled={templatesLoading || templates.length === 0}
                    className={`${fieldClass} appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50`}
                  >
                    <option value="">
                      {templatesLoading
                        ? "Approved templates load ho rahe hain…"
                        : templates.length
                          ? "Select an approved template"
                          : "No approved template found"}
                    </option>
                    {templates.map((template) => (
                      <option
                        key={`${template.name}::${template.language || "en_US"}`}
                        value={`${template.name}::${template.language || "en_US"}`}
                      >
                        {template.name} ({template.language || "en_US"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-3 text-slate-500"
                  />
                </div>
                {selectedTemplate && templateBodyPreview && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Template preview
                    </p>
                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {templateBodyPreview}
                    </p>
                  </div>
                )}
                {!templatesLoading && !metaError && templates.length === 0 && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Meta Business Manager mein template approve hone ke baad
                    yahan dikhega.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-3.5">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Send now
                </h3>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Campaign jobs launch karte hi start ho jayenge. Messages
                  provider-safe pacing ke saath ek-ek karke bheje jayenge; daily
                  schedule ya start-time setting nahi hai.
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-600">
                  <input
                    type="checkbox"
                    checked={skipAlreadySent}
                    onChange={(event) =>
                      setSkipAlreadySent(event.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
                  />
                  <span>
                    Sirf un contacts ko bhejein jinhe is channel par pehle
                    message nahi bheja gaya.
                  </span>
                </label>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-600">
                  <input
                    type="checkbox"
                    checked={optInConfirmed}
                    onChange={(event) =>
                      setOptInConfirmed(event.target.checked)
                    }
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
                  />
                  <span>
                    Confirm karein: selected contacts ne WhatsApp messages ke
                    liye opt-in diya hai.
                  </span>
                </label>
                {(tab === "contacts" || tab === "audience") &&
                  (previewLoading || recipientPreview) && (
                    <div className="mt-3 border-t border-slate-100 pt-3 text-xs">
                      <div className="flex justify-between gap-2 text-slate-500">
                        <span>Messages to be sent</span>
                        <b className="text-slate-800">
                          {previewLoading
                            ? "…"
                            : count(recipientPreview?.final ?? 0)}
                        </b>
                      </div>
                      {recipientPreview?.skip > 0 && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          {count(recipientPreview.skip)} previously sent
                          contacts skip honge.
                        </p>
                      )}
                    </div>
                  )}
              </section>
            </aside>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-500">
              <b className="text-slate-700">{count(footerCount)} contacts</b> ·
              message tabhi jayega jab aap Start campaign dabayenge.
            </p>
            {startDisabled && startDisabledReason && (
              <p className="mt-1 max-w-[580px] text-[11px] font-semibold text-amber-700">
                {startDisabledReason}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={launching}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={launchCampaign}
              disabled={startDisabled}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {launching ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {launching ? "Starting…" : "Start campaign"}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
