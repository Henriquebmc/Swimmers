"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertTriangle, Camera, Loader2, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import AvatarBadge from "@/components/dashboard/AvatarBadge";

type SettingsStrings = {
  title: string;
  subtitle: string;
  account: {
    heading: string;
    description: string;
    email: string;
    provider: string;
  };
  athlete: {
    heading: string;
    description: string;
    photo: string;
    photoHint: string;
    photoCta: string;
    photoReplace: string;
    photoRemove: string;
    photoRequirements: string;
    name: string;
    birthDate: string;
    gender: string;
    abmn: string;
    abmnHint: string;
  };
  coach: {
    heading: string;
    description: string;
    empty: string;
    linkedCoach: string;
    club: string;
  };
  danger: {
    heading: string;
    description: string;
    cta: string;
    confirm: string;
  };
  genderOptions: {
    unset: string;
    female: string;
    male: string;
    other: string;
  };
  actions: {
    save: string;
    saving: string;
    signOut: string;
    deleting: string;
  };
  alerts: {
    saved: string;
    error: string;
    invalidPhoto: string;
    photoTooLarge: string;
  };
};

type SettingsClientProps = {
  strings: SettingsStrings;
  initialValues: {
    name: string;
    email: string;
    birthDate: string;
    gender: string;
    abmnRegistrationNumber: string;
    image: string | null;
  };
  coach: {
    name: string | null;
    clubName: string | null;
  };
};

type ProfileForm = SettingsClientProps["initialValues"];

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid-file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("invalid-file"));
    reader.readAsDataURL(file);
  });

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("invalid-image"));
    image.src = source;
  });

async function compressProfilePhoto(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSize = 512;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("canvas-unavailable");
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.84);

  if (dataUrl.length > 1_800_000) {
    throw new Error("photo-too-large");
  }

  return dataUrl;
}

export default function SettingsClient({ strings, initialValues, coach }: SettingsClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof ProfileForm, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
    setError(null);
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFeedback(null);
    setError(null);

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError(strings.alerts.invalidPhoto);
      event.target.value = "";
      return;
    }

    setIsProcessingPhoto(true);

    try {
      const image = await compressProfilePhoto(file);
      handleChange("image", image);
    } catch (photoError) {
      if (photoError instanceof Error && photoError.message === "photo-too-large") {
        setError(strings.alerts.photoTooLarge);
      } else {
        setError(strings.alerts.invalidPhoto);
      }
    } finally {
      setIsProcessingPhoto(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const data = (await response.json()) as { profile?: ProfileForm };
      if (data.profile) {
        setForm(data.profile);
      }
      router.refresh();
      setFeedback(strings.alerts.saved);
    } catch {
      setError(strings.alerts.error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(strings.danger.confirm);
      if (!confirmed) return;
    }

    setIsDeleting(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/settings", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete");
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(strings.alerts.error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 w-full max-w-5xl mx-auto space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[#00F0FF] font-semibold">{strings.title}</p>
        <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold">{strings.title}</h1>
        <p className="text-gray-400 max-w-3xl">{strings.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <UserRound className="mt-1 text-[#00F0FF]" size={20} />
              <div>
                <h2 className="text-xl font-[family-name:var(--font-display)] font-semibold">{strings.account.heading}</h2>
                <p className="text-sm text-gray-400 mt-1">{strings.account.description}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{strings.account.email}</p>
                <p className="text-white mt-1">{form.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Provider</p>
                <p className="text-white mt-1">{strings.account.provider}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
              >
                {strings.actions.signOut}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 text-[#00F0FF]" size={20} />
              <div>
                <h2 className="text-xl font-[family-name:var(--font-display)] font-semibold">{strings.athlete.heading}</h2>
                <p className="text-sm text-gray-400 mt-1">{strings.athlete.description}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <AvatarBadge
                    name={form.name || form.email || "SW"}
                    image={form.image}
                    sizeClassName="h-24 w-24"
                    textClassName="text-2xl"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{strings.athlete.photo}</p>
                    <p className="mt-1 max-w-md text-sm text-gray-400">{strings.athlete.photoHint}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-500">{strings.athlete.photoRequirements}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 md:justify-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving || isDeleting || isProcessingPhoto}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#00F0FF]/35 bg-[#00F0FF]/10 px-4 py-2 text-sm font-semibold text-[#a6f7ff] transition-colors hover:bg-[#00F0FF]/16 disabled:opacity-60"
                  >
                    {isProcessingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {form.image ? strings.athlete.photoReplace : strings.athlete.photoCta}
                  </button>
                  {form.image ? (
                    <button
                      type="button"
                      onClick={() => handleChange("image", null)}
                      disabled={isSaving || isDeleting || isProcessingPhoto}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      {strings.athlete.photoRemove}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={strings.athlete.name}>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder={strings.athlete.name}
                />
              </Field>

              <Field label={strings.athlete.birthDate}>
                <input
                  type="date"
                  className="input-field date-field"
                  value={form.birthDate}
                  onChange={(event) => handleChange("birthDate", event.target.value)}
                />
              </Field>

              <Field label={strings.athlete.gender}>
                <select
                  className="input-field select-field"
                  value={form.gender}
                  onChange={(event) => handleChange("gender", event.target.value)}
                >
                  <option value="">{strings.genderOptions.unset}</option>
                  <option value="female">{strings.genderOptions.female}</option>
                  <option value="male">{strings.genderOptions.male}</option>
                  <option value="other">{strings.genderOptions.other}</option>
                </select>
              </Field>

              <Field label={strings.athlete.abmn} hint={strings.athlete.abmnHint}>
                <input
                  className="input-field"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.abmnRegistrationNumber}
                  onChange={(event) => handleChange("abmnRegistrationNumber", event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
            <div className="text-sm min-h-6">
              {feedback ? <span className="text-[#00FF85]">{feedback}</span> : null}
              {error ? <span className="text-red-400">{error}</span> : null}
            </div>
            <button
              type="submit"
              disabled={isSaving || isDeleting || isProcessingPhoto}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? strings.actions.saving : strings.actions.save}
            </button>
          </div>
        </form>

        <aside className="space-y-6 self-start">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-[family-name:var(--font-display)] font-semibold">{strings.coach.heading}</h2>
            <p className="text-sm text-gray-400">{strings.coach.description}</p>

            {coach.name ? (
              <div className="rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/8 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{strings.coach.linkedCoach}</p>
                  <p className="text-white mt-1 text-lg font-semibold">{coach.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{strings.coach.club}</p>
                  <p className="text-white mt-1">{coach.clubName || "-"}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/4 p-4 text-sm text-gray-400">
                {strings.coach.empty}
              </div>
            )}
          </div>

          <div className="glass-card p-6 border border-red-500/25 bg-red-500/8 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-red-300" size={20} />
              <div>
                <h2 className="text-xl font-[family-name:var(--font-display)] font-semibold text-white">{strings.danger.heading}</h2>
                <p className="text-sm text-gray-300 mt-1">{strings.danger.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isSaving || isDeleting}
              className="inline-flex items-center justify-center rounded-xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              {isDeleting ? strings.actions.deleting : strings.danger.cta}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-gray-400">{label}</span>
      {children}
      {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}
