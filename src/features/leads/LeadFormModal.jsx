import { useState } from "react";
import { X } from "lucide-react";
import { leadApi } from "../../api/leadApi.js";

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "hot",
  "warm",
  "cold",
  "site_visit",
  "closed",
  "lost",
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  city: "",
  location: "",
  address: "",
  occupation: "",
  notes: "",
  requirements: "",
  status: "new",
};

export default function LeadFormModal({ lead, onClose, onSaved }) {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: lead.name || "",
          phone: lead.phone || "",
          email: lead.email || "",
          city: lead.city || "",
          location: lead.location || "",
          address: lead.address || "",
          occupation: lead.occupation || "",
          notes: lead.notes || "",
          requirements: lead.requirements || "",
          status: lead.status || "new",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (
        !isEdit &&
        !String(form.phone || "")
          .replace(/\D/g, "")
          .trim()
      ) {
        setError("Mobile / WhatsApp number is required.");
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
      setError(err?.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-ink-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">
            {isEdit ? "Edit contact" : "New contact"}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-700 dark:hover:text-white"
            aria-label="Close"
          >
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
            <Field
              label="Name (optional)"
              value={form.name}
              onChange={set("name")}
            />
            <Field
              label={isEdit ? "Mobile / WhatsApp" : "Mobile / WhatsApp *"}
              value={form.phone}
              onChange={set("phone")}
              required={!isEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
            <Field label="City" value={form.city} onChange={set("city")} />
          </div>
          <Field
            label="Location"
            value={form.location}
            onChange={set("location")}
          />
          <TextArea
            label="Address"
            value={form.address}
            onChange={set("address")}
          />
          <Field
            label="Job title"
            value={form.occupation}
            onChange={set("occupation")}
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
              Status
            </label>
            <select
              value={form.status}
              onChange={set("status")}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <TextArea
            label="Requirements"
            value={form.requirements}
            onChange={set("requirements")}
          />
          <TextArea label="Notes" value={form.notes} onChange={set("notes")} />

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save contact"}
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
      <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
    </div>
  );
}

function TextArea({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
        {label}
      </label>
      <textarea
        rows={2}
        {...props}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-white"
      />
    </div>
  );
}
