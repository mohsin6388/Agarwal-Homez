import { useState } from 'react';
import { X } from 'lucide-react';
import { leadApi } from '../../api/leadApi.js';

// Upload Data contact: name, mobile, email, address, job title (+ optional city & notes).
// Lead status / score are set by the AI from replies, not typed by hand.
const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', jobTitle: '', city: '', notes: '',
};

export default function LeadFormModal({ lead, onClose, onSaved }) {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
          address: lead.address || '', jobTitle: lead.jobTitle || lead.occupation || '',
          city: lead.city || '', notes: lead.notes || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!String(form.phone || '').trim() && !String(form.email || '').trim()) {
        setError('Phone ya email mein se kam se kam ek zaroori hai');
        setSaving(false);
        return;
      }
      const payload = {
        ...form,
      };
      if (isEdit) {
        await leadApi.update(lead._id, payload);
      } else {
        await leadApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">
            {isEdit ? 'Edit contact' : 'Add contact'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (optional)" value={form.name} onChange={set('name')} placeholder="Ayush Sharma" />
            <Field label="Mobile / WhatsApp" value={form.phone} onChange={set('phone')} placeholder="91 98765 43210" inputMode="tel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="name@email.com" />
            <Field label="Job title" value={form.jobTitle} onChange={set('jobTitle')} placeholder="Bank Manager" />
          </div>
          <TextArea label="Address" value={form.address} onChange={set('address')} placeholder="Area, city" />
          <Field label="City (optional)" value={form.city} onChange={set('city')} />
          <TextArea label="Notes (optional)" value={form.notes} onChange={set('notes')} />
          <p className="text-[11px] text-ink-400">Mobile ya email mein se ek zaroori hai. Save karne se koi message nahi jaata.</p>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update contact' : 'Save contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{label}</label>
      <input
        aria-label={label}
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
    </div>
  );
}

function TextArea({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{label}</label>
      <textarea
        aria-label={label}
        rows={2}
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
    </div>
  );
}