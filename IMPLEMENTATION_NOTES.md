# Update (20 Oct 2026)

- Properties → **Sites & brochures**: one card per project with its own brochures (newest is the one the AI sends) and photos; upload / remove per site; "Nayi site + brochure". Excel mode has a **Site brochure** column (PDF link or "+ Add", which opens that site's card).
- WhatsApp phone preview (`components/WhatsAppPreview.jsx`) in template creation, template cards and the bulk launcher (filled with the first selected contact's details).
- Bulk Step 1 "Contacts sheet" with Sr. no. range selection and sheet filter.

---

# PropAI CRM frontend — flow update (19 Oct 2026)

Same look and theme; screens now follow the new flow.

- **Upload Data**: columns Name, Mobile / WhatsApp, Email, Address, Job title, Source, Added. Manual "Add contact" form has the same fields. "Sample sheet" downloads a ready CSV. Select rows → **Audience banao**.
- **Qualified Leads** (+ new **WhatsApp → Leads** and **Email → Leads**): tabs All leads (reply + score > 30), Hot (> 60), Visit leads. Columns: Name, Mobile / WhatsApp, Email, WhatsApp send, WhatsApp reply, Email send, Email reply, Last response, Score, Actions (open chat).
- **Bulk message (WhatsApp / Email)**: Step 1 has three sources — Saved audience, Data se chunein (with "Save as audience"), Nayi sheet upload (saves contacts and, by default, an audience). Selected template preview as before; "New template · approval" link. Templates → "Use in bulk" opens the launcher with that template chosen.
- **Templates**: All / Approved / In review / Rejected tabs, Meta rejection reason, "Use in bulk" only on approved WhatsApp templates. Email templates need no approval.
- **Conversations**: right-side panel with short summary, score and lead type, requirement/budget, site visits and next follow-up. Opens directly via `?id=` or `?lead=`.
- **Site Visits**: Aaj / Aane wali / Ho chuki / Sab, "Chat se booked (AI)" filter, AI badge and Chat button.
- **Follow Ups**: summary + "Puri chat padhein" opens the full conversation.
- **Properties**: default **Excel mode** — spreadsheet grid, edit any cell (saves on Enter/blur), new row, Status Available / Booked / Sold. Cards view still available.

`npm run build` passes (Vite 5).

---

# PropAI CRM frontend updates

- Luxury real-estate login styling with responsive layout and a bundled property background photo.
- Emerald theme, simplified top bar and sidebar branding.
- Shorter Upload Data and Qualified Leads headings, channel-specific import options, temperature/score columns and adjusted qualification metrics.
- WhatsApp conversation display depends on real activity, template previews display available body/image information, and bulk campaign start-time scheduling UI has been removed.
- WhatsApp and email template management now offer live previews and Cloudinary image upload controls. WhatsApp template deletion calls the Meta-backed API; email templates retain edit/delete.
- Property form supports image upload to the backend's Cloudinary endpoint.
- Email details no longer labels all contacts with a phone number as “WhatsApp lead”.

## Configuration

Copy `.env.example` to `.env` for local development and set `VITE_API_BASE_URL` to the backend's `/api/` URL. Image upload controls require the backend's authenticated `POST /api/uploads/image` endpoint and valid Cloudinary credentials on the backend. See the backend `IMPLEMENTATION_NOTES.md` for deployment and provider requirements.

Run `npm ci`, then `npm run build` before deployment. Dependency download/build could not be completed in the preparation environment, so run this verification in your development or CI environment before deployment.
