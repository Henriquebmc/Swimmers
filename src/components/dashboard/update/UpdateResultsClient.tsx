"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Plus, Save, Trash2, Waves } from "lucide-react";
import type { Translations } from "@/i18n/translations";

type UpdateStrings = Translations["updatePage"];
type EventType = "POOL" | "OPEN_WATER";

type ResultEntry = {
  id: string;
  competitionName: string;
  date: string;
  distance: number;
  eventType: EventType;
  stroke: string | null;
  course: string | null;
  timeString: string;
  position: number | null;
  recordTag: string | null;
  category: string | null;
  isRelay: boolean;
  openWaterEnvironment: string | null;
  venueName: string | null;
  notes: string | null;
};

type SelectOption = { value: string; label: string };

type UpdateResultsClientProps = {
  initialResults: ResultEntry[];
  translations: UpdateStrings;
  strokeOptions: SelectOption[];
  courseOptions: SelectOption[];
  environmentOptions: SelectOption[];
  eventTypeOptions: SelectOption[];
  uiText: {
    eventType: string;
    eventTypePool: string;
    eventTypeOpenWater: string;
    environment: string;
    venue: string;
    notesLabel: string;
    notesPlaceholder: string;
    relay: string;
    category: string;
    recordBadge: string;
    openWaterBadge: string;
  };
};

type EditableResult = {
  localId: string;
  id?: string;
  competitionName: string;
  date: string;
  distance: string;
  eventType: EventType;
  stroke: string;
  course: string;
  timeString: string;
  position: string;
  recordTag: string | null;
  category: string;
  isRelay: boolean;
  openWaterEnvironment: string;
  venueName: string;
  notes: string;
  isSaving: boolean;
  feedback: string | null;
  error: string | null;
  dirty: boolean;
};

const fieldClass =
  "bg-[#050b19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/30 transition-colors w-full";

const toDateInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const buildEntry = (
  result: ResultEntry,
  defaultStroke: string,
  defaultCourse: string,
  defaultEnvironment: string
): EditableResult => ({
  localId: result.id,
  id: result.id,
  competitionName: result.competitionName,
  date: toDateInput(result.date),
  distance: String(result.distance),
  eventType: result.eventType,
  stroke: result.stroke || defaultStroke,
  course: result.course || defaultCourse,
  timeString: result.timeString,
  position: result.position ? String(result.position) : "",
  recordTag: result.recordTag ?? null,
  category: result.category ?? "",
  isRelay: result.isRelay,
  openWaterEnvironment: result.openWaterEnvironment || defaultEnvironment,
  venueName: result.venueName ?? "",
  notes: result.notes ?? "",
  isSaving: false,
  feedback: null,
  error: null,
  dirty: false,
});

const buildEmptyEntry = (
  defaultStroke: string,
  defaultCourse: string,
  defaultEnvironment: string
): EditableResult => ({
  localId: crypto.randomUUID(),
  competitionName: "",
  date: "",
  distance: "",
  eventType: "POOL",
  stroke: defaultStroke,
  course: defaultCourse,
  timeString: "",
  position: "",
  recordTag: null,
  category: "",
  isRelay: false,
  openWaterEnvironment: defaultEnvironment,
  venueName: "",
  notes: "",
  isSaving: false,
  feedback: null,
  error: null,
  dirty: true,
});

export default function UpdateResultsClient({
  initialResults,
  translations,
  strokeOptions,
  courseOptions,
  environmentOptions,
  eventTypeOptions,
  uiText,
}: UpdateResultsClientProps) {
  const defaultStroke = strokeOptions[0]?.value ?? "FREESTYLE";
  const defaultCourse = courseOptions[0]?.value ?? "LONG_COURSE";
  const defaultEnvironment = environmentOptions[0]?.value ?? "SEA";
  const [entries, setEntries] = useState<EditableResult[]>(
    initialResults.length > 0
      ? initialResults.map((result) => buildEntry(result, defaultStroke, defaultCourse, defaultEnvironment))
      : []
  );

  const handleAdd = () => {
    setEntries((prev) => [buildEmptyEntry(defaultStroke, defaultCourse, defaultEnvironment), ...prev]);
  };

  const handleFieldChange = (
    localId: string,
    field: keyof EditableResult,
    value: string | boolean
  ) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.localId !== localId) return entry;

        const next = {
          ...entry,
          [field]: value,
          dirty: true,
          feedback: null,
          error: null,
        } as EditableResult;

        if (field === "eventType") {
          if (value === "POOL") {
            next.stroke = next.stroke || defaultStroke;
            next.course = next.course || defaultCourse;
            next.openWaterEnvironment = defaultEnvironment;
            next.venueName = "";
            next.notes = "";
          } else {
            next.isRelay = false;
            next.recordTag = null;
          }
        }

        return next;
      })
    );
  };

  const handleSave = async (localId: string) => {
    const entry = entries.find((item) => item.localId === localId);
    if (!entry) return;

    const trimmedName = entry.competitionName.trim();
    const trimmedTime = entry.timeString.trim();
    const trimmedVenue = entry.venueName.trim();

    if (!trimmedName || !entry.date || !entry.distance || !trimmedTime) {
      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, error: translations.alerts.error, feedback: null } : item
        )
      );
      return;
    }

    const distanceValue = Number(entry.distance);
    if (!Number.isFinite(distanceValue) || distanceValue <= 0) {
      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, error: translations.alerts.error, feedback: null } : item
        )
      );
      return;
    }

    if (entry.eventType === "OPEN_WATER" && !trimmedVenue) {
      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, error: translations.alerts.error, feedback: null } : item
        )
      );
      return;
    }

    const payload = entry.eventType === "POOL"
      ? {
          id: entry.id,
          competitionName: trimmedName,
          date: entry.date,
          distance: distanceValue,
          eventType: entry.eventType,
          stroke: entry.stroke,
          course: entry.course,
          timeString: trimmedTime,
          position: entry.position ? Number(entry.position) : null,
          recordTag: entry.recordTag,
          category: entry.category.trim() || null,
          isRelay: entry.isRelay,
          openWaterEnvironment: null,
          venueName: null,
          notes: null,
        }
      : {
          id: entry.id,
          competitionName: trimmedName,
          date: entry.date,
          distance: distanceValue,
          eventType: entry.eventType,
          stroke: null,
          course: null,
          timeString: trimmedTime,
          position: entry.position ? Number(entry.position) : null,
          recordTag: null,
          category: entry.category.trim() || null,
          isRelay: false,
          openWaterEnvironment: entry.openWaterEnvironment,
          venueName: trimmedVenue,
          notes: entry.notes.trim() || null,
        };

    setEntries((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, isSaving: true, error: null, feedback: null } : item
      )
    );

    try {
      const res = await fetch("/api/results/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: [payload] }),
      });

      if (!res.ok) {
        throw new Error("Failed");
      }

      const data: { results?: ResultEntry[] } = await res.json();
      const saved = data.results?.[0];
      if (!saved) {
        throw new Error("Missing data");
      }

      const successMessage = entry.id ? translations.alerts.saved : translations.alerts.created;

      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? buildEntry(saved, defaultStroke, defaultCourse, defaultEnvironment)
            : item
        )
      );

      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, feedback: successMessage, isSaving: false, dirty: false }
            : item
        )
      );
    } catch {
      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, isSaving: false, error: translations.alerts.error } : item
        )
      );
    }
  };

  const handleDelete = async (localId: string) => {
    const entry = entries.find((item) => item.localId === localId);
    if (!entry) return;

    if (!entry.id) {
      setEntries((prev) => prev.filter((item) => item.localId !== localId));
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(translations.form.deleteConfirm);
      if (!confirmed) return;
    }

    setEntries((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, isSaving: true, error: null, feedback: null } : item
      )
    );

    try {
      const res = await fetch(`/api/results/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed");
      }
      setEntries((prev) => prev.filter((item) => item.localId !== localId));
    } catch {
      setEntries((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, isSaving: false, error: translations.alerts.error } : item
        )
      );
    }
  };

  const renderEntry = (entry: EditableResult) => {
    const isOpenWater = entry.eventType === "OPEN_WATER";

    return (
      <div key={entry.localId} className="rounded-2xl border border-white/10 p-4 space-y-4 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#00F0FF]">{translations.form.competition}</span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              {entry.eventType === "POOL" ? uiText.eventTypePool : uiText.openWaterBadge}
            </span>
            {entry.recordTag ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                {uiText.recordBadge}
                <span className="rounded-full bg-cyan-200 px-2 py-0.5 text-[10px] font-bold text-[#02111d]">
                  {entry.recordTag}
                </span>
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(entry.localId)}
            className="text-gray-400 hover:text-red-400 transition-colors"
            aria-label={translations.form.delete}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={translations.form.competition}>
            <input
              className={fieldClass}
              value={entry.competitionName}
              onChange={(event) => handleFieldChange(entry.localId, "competitionName", event.target.value)}
              placeholder={translations.form.competition}
            />
          </Field>

          <Field label={uiText.eventType}>
            <select
              className={`${fieldClass} select-field`}
              value={entry.eventType}
              onChange={(event) => handleFieldChange(entry.localId, "eventType", event.target.value as EventType)}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={translations.form.date}>
            <input
              type="date"
              className={fieldClass}
              value={entry.date}
              onChange={(event) => handleFieldChange(entry.localId, "date", event.target.value)}
            />
          </Field>

          <Field label={translations.form.distance}>
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={entry.distance}
              onChange={(event) => handleFieldChange(entry.localId, "distance", event.target.value)}
              placeholder="100"
            />
          </Field>

          <Field label={translations.form.time}>
            <input
              className={fieldClass}
              value={entry.timeString}
              onChange={(event) => handleFieldChange(entry.localId, "timeString", event.target.value)}
              placeholder="01:02.45"
            />
            <p className="text-xs text-gray-500 mt-1">{translations.form.notes}</p>
          </Field>

          <Field label={translations.form.position}>
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={entry.position}
              onChange={(event) => handleFieldChange(entry.localId, "position", event.target.value)}
              placeholder="1"
            />
          </Field>

          <Field label={uiText.category}>
            <input
              className={fieldClass}
              value={entry.category}
              onChange={(event) => handleFieldChange(entry.localId, "category", event.target.value)}
              placeholder={uiText.category}
            />
          </Field>

          {isOpenWater ? (
            <Field label={uiText.environment}>
              <select
                className={`${fieldClass} select-field`}
                value={entry.openWaterEnvironment}
                onChange={(event) => handleFieldChange(entry.localId, "openWaterEnvironment", event.target.value)}
              >
                {environmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label={translations.form.stroke}>
              <select
                className={`${fieldClass} select-field`}
                value={entry.stroke}
                onChange={(event) => handleFieldChange(entry.localId, "stroke", event.target.value)}
              >
                {strokeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isOpenWater ? (
            <Field label={uiText.venue}>
              <input
                className={fieldClass}
                value={entry.venueName}
                onChange={(event) => handleFieldChange(entry.localId, "venueName", event.target.value)}
                placeholder={uiText.venue}
              />
            </Field>
          ) : (
            <Field label={translations.form.course}>
              <select
                className={`${fieldClass} select-field`}
                value={entry.course}
                onChange={(event) => handleFieldChange(entry.localId, "course", event.target.value)}
              >
                {courseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {isOpenWater ? (
          <Field label={uiText.notesLabel}>
            <textarea
              className={`${fieldClass} min-h-24 resize-y`}
              value={entry.notes}
              onChange={(event) => handleFieldChange(entry.localId, "notes", event.target.value)}
              placeholder={uiText.notesPlaceholder}
            />
          </Field>
        ) : (
          <label className="flex items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={entry.isRelay}
              onChange={(event) => handleFieldChange(entry.localId, "isRelay", event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#050b19]"
            />
            {uiText.relay}
          </label>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm">
            {entry.feedback ? (
              <span className="text-[#00FF85]">{entry.feedback}</span>
            ) : entry.error ? (
              <span className="text-red-400">{entry.error}</span>
            ) : entry.dirty ? (
              <span className="text-gray-400">{translations.form.unsaved}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleSave(entry.localId)}
            disabled={entry.isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00F0FF] text-[#020817] text-sm font-semibold disabled:opacity-60"
          >
            {entry.isSaving ? <Loader2 size={16} className="animate-spin" /> : isOpenWater ? <Waves size={16} /> : <Save size={16} />}
            {translations.form.save}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="glass-card p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-[family-name:var(--font-display)] font-semibold">
            {translations.existingSection.heading}
          </h3>
          <p className="text-gray-400 text-sm">{translations.existingSection.description}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00F0FF]/60 text-[#00F0FF] text-sm font-semibold hover:bg-[#00F0FF]/10"
        >
          <Plus size={16} />
          {translations.actions.add}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-white/20 rounded-2xl p-8 text-center space-y-4">
          <p className="text-lg font-semibold">{translations.emptyState.title}</p>
          <p className="text-gray-400 text-sm">{translations.emptyState.description}</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00F0FF] text-[#020817] text-sm font-semibold"
          >
            <Plus size={16} />
            {translations.emptyState.cta}
          </button>
        </div>
      ) : (
        <div className="space-y-6">{entries.map((entry) => renderEntry(entry))}</div>
      )}
    </section>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-gray-400">{label}</span>
      {children}
    </label>
  );
}


