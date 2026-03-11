"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ReviewFormSchema, type ExtractedResults, type ReviewForm } from "@/modules/results-ai/schema";

export interface UploadModalProps {
  onClose: () => void;
}

type Step = "upload" | "review" | "success";
type UploadSource = "local" | "abmn";
type ProcessingState = {
  title: string;
  detail: string;
};

type AbmnSessionResponse = {
  sessionId: string;
  captchaImageUrl: string;
  registrationNumber: string;
  expiresAt: string;
  error?: string;
};

type ApiErrorResponse = {
  error?: string;
  detail?: string;
  code?: string;
  refreshCaptcha?: boolean;
};

const STROKE_OPTIONS = [
  { value: "FREESTYLE", label: "Freestyle" },
  { value: "BACKSTROKE", label: "Backstroke" },
  { value: "BREASTSTROKE", label: "Breaststroke" },
  { value: "BUTTERFLY", label: "Butterfly" },
  { value: "MEDLEY", label: "Medley" },
];

const COURSE_OPTIONS = [
  { value: "SHORT_COURSE", label: "Short Course (25m)" },
  { value: "LONG_COURSE", label: "Long Course (50m)" },
];

export default function UploadModal({ onClose }: UploadModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [source, setSource] = useState<UploadSource>("local");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [abmnSessionId, setAbmnSessionId] = useState<string | null>(null);
  const [abmnCaptchaUrl, setAbmnCaptchaUrl] = useState<string | null>(null);
  const [abmnRegistrationNumber, setAbmnRegistrationNumber] = useState("");
  const [abmnCaptchaAnswer, setAbmnCaptchaAnswer] = useState("");
  const [saveRegistrationNumber, setSaveRegistrationNumber] = useState(true);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isFetchingAbmn, setIsFetchingAbmn] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewForm>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: { results: [] },
  });

  const { fields, remove } = useFieldArray({ control, name: "results" });

  const stepTitles: Record<Step, string> = {
    upload: "Import Results",
    review: "Review Extracted Results",
    success: "Import Complete",
  };

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
    };
  }, []);

  function clearProcessingState() {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setProcessingState(null);
  }

  function startProcessingState(initial: ProcessingState, delayed: ProcessingState) {
    clearProcessingState();
    setProcessingState(initial);
    processingTimerRef.current = setTimeout(() => {
      setProcessingState(delayed);
      processingTimerRef.current = null;
    }, 1800);
  }

  function resetAbmnSession() {
    setAbmnSessionId(null);
    setAbmnCaptchaUrl(null);
    setAbmnCaptchaAnswer("");
  }

  function applyExtractedResults(data: ExtractedResults) {
    const defaultValues = data.results.map((result) => ({
      athleteName: result.athleteName,
      competitionName: result.competitionName,
      date: result.date,
      distance: result.distance,
      stroke: result.stroke,
      course: result.course,
      category: result.category,
      timeString: result.timeString,
      position: result.position ?? undefined,
      isRelay: result.isRelay ?? false,
      recordTag: result.recordTag,
    }));

    reset({ results: defaultValues });
    setError(null);
    setStep("review");
  }

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File size must be less than 20MB.");
      return;
    }

    setIsLoading(true);
    setError(null);
    startProcessingState(
      {
        title: "Enviando PDF...",
        detail: "Preparando o documento para análise.",
      },
      {
        title: "IA analisando o documento...",
        detail: "Isso pode levar até 5 minutos.",
      }
    );

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/results/upload", {
        method: "POST",
        body: formData,
      });

      const data: ExtractedResults & ApiErrorResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.detail ?? data.error ?? "Failed to process PDF");
      }

      applyExtractedResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      clearProcessingState();
      setIsLoading(false);
    }
  }

  async function loadAbmnCaptcha(messageAfterLoad: string | null = null) {
    setIsLoadingCaptcha(true);
    if (!messageAfterLoad) {
      setError(null);
    }

    try {
      const res = await fetch("/api/abmn/curriculo/session", { cache: "no-store" });
      const data: AbmnSessionResponse = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Failed to load ABMN captcha");
      }

      setAbmnSessionId(data.sessionId);
      setAbmnCaptchaUrl(`${data.captchaImageUrl}&t=${Date.now()}`);
      setAbmnCaptchaAnswer("");
      setAbmnRegistrationNumber((current) => current || data.registrationNumber || "");
      setError(messageAfterLoad);
    } catch (err) {
      resetAbmnSession();
      setError(err instanceof Error ? err.message : "Failed to load ABMN captcha.");
    } finally {
      setIsLoadingCaptcha(false);
    }
  }

  async function importFromAbmn() {
    if (!abmnSessionId) {
      setError("Load the ABMN captcha first.");
      return;
    }

    if (abmnRegistrationNumber.replace(/\D/g, "").length !== 6) {
      setError("Enter a valid 6-digit ABMN registration number.");
      return;
    }

    if (abmnCaptchaAnswer.trim().length < 4) {
      setError("Enter the captcha text before downloading the curriculum.");
      return;
    }

    setIsFetchingAbmn(true);
    setError(null);
    startProcessingState(
      {
        title: "Baixando o PDF da ABMN...",
        detail: "Buscando o currículo direto da fonte oficial.",
      },
      {
        title: "PDF encontrado. IA analisando o documento...",
        detail: "Isso pode levar até 5 minutos.",
      }
    );

    try {
      const res = await fetch("/api/abmn/curriculo/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: abmnSessionId,
          matricula: abmnRegistrationNumber,
          captchaAnswer: abmnCaptchaAnswer,
          saveRegistrationNumber,
        }),
      });

      const data: ExtractedResults & ApiErrorResponse = await res.json();
      if (!res.ok || data.error) {
        const message = data.detail ?? data.error ?? "Failed to download the ABMN curriculum.";
        if (data.refreshCaptcha) {
          clearProcessingState();
          resetAbmnSession();
          await loadAbmnCaptcha(message);
          return;
        }
        throw new Error(message);
      }

      resetAbmnSession();
      applyExtractedResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download the ABMN curriculum.");
    } finally {
      clearProcessingState();
      setIsFetchingAbmn(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function onSubmit(data: ReviewForm) {
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json: { saved?: number; error?: string } = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to save results");
      }

      setSavedCount(json.saved ?? data.results.length);
      router.refresh();
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  const isBusy = isLoading || isLoadingCaptcha || isFetchingAbmn;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)] text-white">{stepTitles[step]}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === "upload" && (
            <div className="space-y-6">
              <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSource("local");
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    source === "local" ? "bg-[#00F0FF]/15 text-[#00F0FF]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Arquivo PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSource("abmn");
                    setError(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    source === "abmn" ? "bg-[#00F0FF]/15 text-[#00F0FF]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Buscar da ABMN
                </button>
              </div>

              {source === "local" ? (
                <div className="space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                      isDragging
                        ? "border-[#00F0FF] bg-[#00F0FF]/5"
                        : "border-white/20 hover:border-[#00F0FF]/50 hover:bg-white/5"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={48} className="text-[#00F0FF] animate-spin" />
                        <div className="text-center space-y-1">
                          <p className="text-white font-medium">{processingState?.title ?? "Processando PDF..."}</p>
                          <p className="text-gray-400 text-sm">{processingState?.detail ?? "Isso pode levar alguns minutos."}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={48} className="text-[#00F0FF]" />
                        <div className="text-center">
                          <p className="text-white font-medium">Drop your PDF here or click to browse</p>
                          <p className="text-gray-400 text-sm mt-1">PDF files only, up to 20MB</p>
                        </div>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    id="pdf-input"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 text-[#00F0FF]" size={20} />
                      <div>
                        <p className="text-white font-medium">Baixar currículo direto da ABMN</p>
                        <p className="text-sm text-gray-400 mt-1">
                          O app replica os mesmos passos do site da ABMN: matrícula do atleta, captcha e download do PDF.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.2fr_auto] md:items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Número da matrícula ABMN</label>
                        <input
                          value={abmnRegistrationNumber}
                          onChange={(e) => setAbmnRegistrationNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          inputMode="numeric"
                          maxLength={6}
                          className="input-field w-full"
                          placeholder="Ex.: 123456"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => loadAbmnCaptcha()}
                        disabled={isBusy}
                        className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingCaptcha ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {abmnCaptchaUrl ? "Atualizar captcha" : "Carregar captcha"}
                      </button>
                    </div>

                    {abmnCaptchaUrl ? (
                      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                        <div className="rounded-xl border border-white/10 bg-[#050b19] p-4 flex items-center justify-center min-h-[108px]">
                          <img src={abmnCaptchaUrl} alt="Captcha da ABMN" className="max-h-20 w-auto rounded" />
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">Texto do captcha</label>
                            <input
                              value={abmnCaptchaAnswer}
                              onChange={(e) => setAbmnCaptchaAnswer(e.target.value.toUpperCase())}
                              className="input-field w-full"
                              placeholder="Digite o texto da imagem"
                              autoComplete="off"
                              maxLength={8}
                            />
                          </div>

                          <label className="flex items-center gap-3 text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={saveRegistrationNumber}
                              onChange={(e) => setSaveRegistrationNumber(e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-[#050b19]"
                            />
                            Salvar matrícula no meu perfil para as próximas importações
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Carregue um captcha para iniciar a importação assistida da ABMN.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 max-w-xl">
                      Se a ABMN rejeitar o captcha ou a matrícula, o app vai solicitar um novo captcha automaticamente sem afetar o upload manual.
                    </p>
                    <button
                      type="button"
                      onClick={importFromAbmn}
                      disabled={isBusy || !abmnSessionId}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFetchingAbmn ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      Baixar currículo PDF
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {processingState && (
                <div className="rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/8 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-[#00F0FF]" />
                    <div>
                      <p className="text-sm font-semibold text-white">{processingState.title}</p>
                      <p className="text-sm text-gray-300 mt-1">{processingState.detail}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "review" && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {fields.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">No results were extracted. Try a different PDF or ABMN import.</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#00F0FF]">Result #{index + 1}</span>
                      {field.isRelay ? (
                        <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-[#00FF85]/10 text-[#00FF85]">
                          Relay
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      aria-label="Remove result"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Athlete Name</label>
                      <input {...register(`results.${index}.athleteName`)} className="input-field w-full" placeholder="Full name" />
                      {errors.results?.[index]?.athleteName && (
                        <p className="text-xs text-red-400">{errors.results[index]?.athleteName?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Competition Name</label>
                    <input {...register(`results.${index}.athleteBirthDate`)} type="hidden" />

                      <input
                        {...register(`results.${index}.competitionName`)}
                        className="input-field w-full"
                        placeholder="Meet name"
                      />
                      {errors.results?.[index]?.competitionName && (
                        <p className="text-xs text-red-400">{errors.results[index]?.competitionName?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Date</label>
                      <input {...register(`results.${index}.date`)} type="date" className="input-field w-full" />
                      {errors.results?.[index]?.date && (
                        <p className="text-xs text-red-400">{errors.results[index]?.date?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Distance (m)</label>
                      <input
                        {...register(`results.${index}.distance`, { valueAsNumber: true })}
                        type="number"
                        className="input-field w-full"
                        placeholder="e.g. 100"
                      />
                      {errors.results?.[index]?.distance && (
                        <p className="text-xs text-red-400">{errors.results[index]?.distance?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Stroke</label>
                      <select {...register(`results.${index}.stroke`)} className="input-field w-full">
                        {STROKE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Course</label>
                      <select {...register(`results.${index}.course`)} className="input-field w-full">
                        {COURSE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input {...register(`results.${index}.category`)} type="hidden" />
                    <input {...register(`results.${index}.recordTag`)} type="hidden" />

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Time</label>
                      <input
                        {...register(`results.${index}.timeString`)}
                        className="input-field w-full"
                        placeholder="e.g. 1:02.45 or 28.34"
                      />
                      {errors.results?.[index]?.timeString && (
                        <p className="text-xs text-red-400">{errors.results[index]?.timeString?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Position (optional)</label>
                      <input
                        {...register(`results.${index}.position`, {
                          setValueAs: (value) => (value === "" ? undefined : Number(value)),
                        })}
                        type="number"
                        className="input-field w-full"
                        placeholder="e.g. 1"
                      />
                    </div>

                    <label className="col-span-2 flex items-center gap-3 text-sm text-gray-300">
                      <input
                        {...register(`results.${index}.isRelay`)}
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-[#050b19]"
                      />
                      Relay / Revezamento
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("upload");
                  }}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Start over
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || fields.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Save {fields.length} Result{fields.length !== 1 ? "s" : ""}
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <CheckCircle2 size={64} className="text-[#00FF85]" />
              <div className="text-center">
                <h3 className="text-2xl font-bold font-[family-name:var(--font-display)] text-white">
                  {savedCount} Result{savedCount !== 1 ? "s" : ""} Saved!
                </h3>
                <p className="text-gray-400 mt-2">Your swimming results have been successfully recorded.</p>
              </div>
              <button onClick={onClose} className="btn-primary">
                View Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}







