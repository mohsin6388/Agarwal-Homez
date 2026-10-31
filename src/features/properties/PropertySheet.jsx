import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Maximize2, Plus, Trash2 } from "lucide-react";
import { propertyApi } from "../../api/propertyApi.js";
import { siteApi, siteKey } from "../../api/siteApi.js";

/**
 * Properties in "Excel mode": a spreadsheet grid where every cell is edited
 * in place and saved on blur / Enter. The AI reads this same data, and only
 * suggests rows whose Status is "Available".
 */
const COLUMNS = [
  { key: "projectName", label: "Project", width: "min-w-[190px]" },
  {
    key: "propertyType",
    label: "Type",
    width: "min-w-[110px]",
    list: "sheet-types",
  },
  { key: "bhk", label: "BHK", width: "min-w-[70px]" },
  {
    key: "sizeSqft",
    label: "Area (sq ft)",
    width: "min-w-[100px]",
    number: true,
  },
  {
    key: "budgetMin",
    label: "Price from (₹)",
    width: "min-w-[130px]",
    number: true,
  },
  {
    key: "budgetMax",
    label: "Price to (₹)",
    width: "min-w-[130px]",
    number: true,
  },
  { key: "location", label: "Location", width: "min-w-[170px]" },
  { key: "city", label: "City", width: "min-w-[110px]" },
  { key: "floor", label: "Floor", width: "min-w-[70px]" },
  {
    key: "availability",
    label: "Status",
    width: "min-w-[120px]",
    select: ["available", "booked", "sold"],
  },
  { key: "possession", label: "Possession", width: "min-w-[120px]" },
  { key: "reraNumber", label: "RERA no.", width: "min-w-[130px]" },
];

const STATUS_TONE = {
  available:
    "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  booked: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  sold: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

const letter = (index) => String.fromCharCode(65 + index);

function toInput(property, column) {
  const value = property[column.key];
  if (column.key === "availability") return value || "available";
  return value == null ? "" : String(value);
}

function toValue(column, raw) {
  const text = String(raw ?? "").trim();
  if (!column.number) return text;
  if (!text) return null;
  // Accept "48,00,000", "48 lakh", "1.2 cr"
  const lower = text.toLowerCase();
  const n = parseFloat(lower.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return undefined;
  if (/cr/.test(lower)) return Math.round(n * 10000000);
  if (/lakh|lac|\bl\b/.test(lower)) return Math.round(n * 100000);
  return Math.round(n);
}

export default function PropertySheet({
  search = "",
  city = "",
  refreshKey = 0,
  onOpenFull,
  onChanged,
  onAddBrochure,
}) {
  const [siteBrochures, setSiteBrochures] = useState({}); // site key -> newest brochure
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cellState, setCellState] = useState({}); // `${id}:${key}` -> 'saving' | 'saved' | 'error'
  const [adding, setAdding] = useState(false);
  const drafts = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await propertyApi.list({
        page,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "asc",
        ...(search ? { search } : {}),
        ...(city ? { city } : {}),
      });
      setRows(res.data.properties || []);
      setPagination(res.data.pagination || { page, total: 0, totalPages: 1 });
      drafts.current = {};
    } catch (err) {
      setError(err?.response?.data?.message || "Properties load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, [page, search, city]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    let active = true;
    siteApi
      .list()
      .then((res) => {
        if (!active) return;
        const map = {};
        (res.data.sites || []).forEach((site) => {
          const latest = site.brochures?.length
            ? site.brochures[site.brochures.length - 1]
            : site.legacyBrochure;
          if (latest)
            map[site.nameKey || siteKey(site.name)] = {
              ...latest,
              count: site.brochures?.length || 1,
            };
        });
        setSiteBrochures(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refreshKey, rows.length]);
  useEffect(() => {
    setPage(1);
  }, [search, city]);

  const saveCell = async (property, column, raw) => {
    const cellId = `${property._id}:${column.key}`;
    const value = toValue(column, raw);
    if (value === undefined) {
      setCellState((s) => ({ ...s, [cellId]: "error" }));
      setError(`"${raw}" sahi number nahi hai (${column.label}).`);
      return;
    }
    if (column.key === "projectName" && !value) {
      setCellState((s) => ({ ...s, [cellId]: "error" }));
      setError("Project ka naam khali nahi chhod sakte.");
      return;
    }
    const current = property[column.key] ?? (column.number ? null : "");
    if (
      String(current ?? "") === String(value ?? "") ||
      (column.key === "availability" &&
        !property.availability &&
        value === "available")
    )
      return;
    setCellState((s) => ({ ...s, [cellId]: "saving" }));
    try {
      const res = await propertyApi.update(property._id, {
        [column.key]: value,
      });
      const updated = res.data.property || { ...property, [column.key]: value };
      setRows((list) =>
        list.map((row) =>
          row._id === property._id ? { ...row, ...updated } : row,
        ),
      );
      setCellState((s) => ({ ...s, [cellId]: "saved" }));
      setTimeout(
        () =>
          setCellState((s) => {
            const next = { ...s };
            if (next[cellId] === "saved") delete next[cellId];
            return next;
          }),
        1200,
      );
      setError("");
      onChanged?.();
    } catch (err) {
      setCellState((s) => ({ ...s, [cellId]: "error" }));
      setError(
        err?.response?.data?.message || `${column.label} save nahi hua.`,
      );
    }
  };

  const addRow = async () => {
    setAdding(true);
    setError("");
    try {
      await propertyApi.create({
        projectName: "New project",
        availability: "available",
      });
      const lastPage = Math.max(1, Math.ceil((pagination.total + 1) / 100));
      if (lastPage !== page) setPage(lastPage);
      else await load();
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Nayi row nahi bani.");
    } finally {
      setAdding(false);
    }
  };

  const removeRow = async (property) => {
    if (!window.confirm(`"${property.projectName}" row delete karni hai?`))
      return;
    try {
      await propertyApi.remove(property._id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Row delete nahi hui.");
    }
  };

  const cellClass = (property, column) => {
    const state = cellState[`${property._id}:${column.key}`];
    const ring =
      state === "saving"
        ? "bg-amber-50 dark:bg-amber-900/20"
        : state === "saved"
          ? "bg-green-50 dark:bg-green-900/20"
          : state === "error"
            ? "bg-red-50 ring-1 ring-inset ring-red-400 dark:bg-red-900/20"
            : "";
    const tone =
      column.key === "availability"
        ? STATUS_TONE[property.availability || "available"]
        : "";
    return `h-10 w-full border-0 bg-transparent px-2.5 text-sm text-ink-800 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:text-ink-100 dark:focus:bg-ink-900 ${column.number ? "text-right tabular-nums" : ""} ${tone} ${ring}`;
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Cell par click karke likhiye — Enter ya bahar click karte hi save.
          Price "48 lakh" ya "1.2 cr" bhi likh sakte hain. <b>Available</b> rows
          hi AI customer ko batata hai.
        </p>
        <button
          type="button"
          onClick={addRow}
          disabled={adding}
          className="btn-primary inline-flex items-center gap-2 !py-2"
        >
          {adding ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}{" "}
          Nayi row
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}
      <datalist id="sheet-types">
        <option value="Apartment" />
        <option value="Villa" />
        <option value="Plot" />
        <option value="Commercial" />
        <option value="Independent house" />
      </datalist>
      <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink-100/80 dark:bg-ink-800">
              <th
                className="sticky left-0 z-10 w-12 border border-ink-200 bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-400 dark:border-ink-700 dark:bg-ink-800"
                aria-hidden="true"
              />
              {COLUMNS.map((column, index) => (
                <th
                  key={column.key}
                  className="border border-ink-200 px-2 py-1 text-center text-[11px] font-medium text-ink-400 dark:border-ink-700"
                  aria-hidden="true"
                >
                  {letter(index)}
                </th>
              ))}
              <th
                className="border border-ink-200 px-2 py-1 text-center text-[11px] font-medium text-ink-400 dark:border-ink-700"
                aria-hidden="true"
              >
                {letter(COLUMNS.length)}
              </th>
              <th
                className="border border-ink-200 px-2 py-1 dark:border-ink-700"
                aria-hidden="true"
              />
            </tr>
            <tr className="bg-ink-50 dark:bg-ink-800/60">
              <th className="sticky left-0 z-10 border border-ink-200 bg-ink-50 px-2 py-2 text-[11px] font-medium text-ink-400 dark:border-ink-700 dark:bg-ink-800">
                1
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap border border-ink-200 px-2.5 py-2 text-left text-xs font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200 ${column.width}`}
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="min-w-[130px] whitespace-nowrap border border-ink-200 px-2.5 py-2 text-left text-xs font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200"
              >
                Site brochure
              </th>
              <th
                scope="col"
                className="border border-ink-200 px-2 py-2 text-xs font-bold text-ink-700 dark:border-ink-700 dark:text-ink-200"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 3}
                  className="py-12 text-center text-ink-400"
                >
                  <Loader2 size={20} className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + 3}
                  className="py-12 text-center text-sm text-ink-400"
                >
                  Abhi koi property nahi. "Nayi row" dabakar likhna shuru
                  karein, ya Excel import karein.
                </td>
              </tr>
            ) : (
              rows.map((property, rowIndex) => (
                <tr key={property._id} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border border-ink-200 bg-ink-50 px-2 text-center text-[11px] font-medium text-ink-400 dark:border-ink-700 dark:bg-ink-800"
                  >
                    {(pagination.page - 1) * 100 + rowIndex + 2}
                  </th>
                  {COLUMNS.map((column) => {
                    const id = `${property._id}:${column.key}`;
                    const label = `${column.label}, row ${(pagination.page - 1) * 100 + rowIndex + 2}`;
                    return (
                      <td
                        key={column.key}
                        className="border border-ink-200 p-0 dark:border-ink-700"
                      >
                        {column.select ? (
                          <select
                            aria-label={label}
                            value={toInput(property, column)}
                            onChange={(e) =>
                              saveCell(property, column, e.target.value)
                            }
                            className={`${cellClass(property, column)} cursor-pointer font-semibold capitalize`}
                          >
                            {column.select.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={label}
                            list={column.list}
                            defaultValue={toInput(property, column)}
                            key={`${id}:${toInput(property, column)}`}
                            onChange={(e) => {
                              drafts.current[id] = e.target.value;
                            }}
                            onBlur={(e) => {
                              if (id in drafts.current) {
                                delete drafts.current[id];
                                saveCell(property, column, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                              if (e.key === "Escape") {
                                delete drafts.current[id];
                                e.currentTarget.value = toInput(
                                  property,
                                  column,
                                );
                                e.currentTarget.blur();
                              }
                            }}
                            className={cellClass(property, column)}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-ink-200 px-2 dark:border-ink-700">
                    {(() => {
                      const b = siteBrochures[siteKey(property.projectName)];
                      return b ? (
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[150px] items-center gap-1 truncate text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                          title={b.label || b.name}
                        >
                          <FileText size={13} className="shrink-0" />
                          {b.count > 1 ? `${b.count} PDFs` : "PDF"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddBrochure?.(property.projectName)}
                          disabled={!property.projectName}
                          className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-40"
                        >
                          + Add
                        </button>
                      );
                    })()}
                  </td>
                  <td className="border border-ink-200 px-1 dark:border-ink-700">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onOpenFull?.(property)}
                        className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                        aria-label={`Open full details for ${property.projectName}`}
                        title="Photos, brochure, amenities"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(property)}
                        className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        aria-label={`Delete ${property.projectName}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
        <span>{pagination.total || 0} rows · apne-aap save hota hai</span>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-ink-200 px-3 py-1.5 disabled:opacity-40 dark:border-ink-700"
            >
              Prev
            </button>
            <span>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-ink-200 px-3 py-1.5 disabled:opacity-40 dark:border-ink-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
