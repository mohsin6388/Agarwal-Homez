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
