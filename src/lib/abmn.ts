const ABMN_CURRICULO_URL = "https://www.abmn.org.br/curriculo/";
const ABMN_BASE_URL = "https://www.abmn.org.br";

export const ABMN_SESSION_TTL_MS = 10 * 60 * 1000;
export const ABMN_CURRICULO_SOURCE = "ABMN_CURRICULO" as const;

export type AbmnSessionSeed = {
  token: string;
  captchaCode: string;
  captchaImageUrl: string;
  phpSessionId: string;
};

export type AbmnFetchSuccess = {
  ok: true;
  pdfBuffer: Buffer;
};

export type AbmnFetchFailure = {
  ok: false;
  code: string;
  error: string;
  refreshCaptcha: boolean;
};

export type AbmnFetchResult = AbmnFetchSuccess | AbmnFetchFailure;

export function normalizeRegistrationNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function getSetCookieValues(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  if (!raw) {
    return [];
  }

  return raw.split(/,(?=[^;]+=[^;]+)/).map((value) => value.trim());
}

function extractCookieValue(setCookies: string[], cookieName: string): string | null {
  for (const cookie of setCookies) {
    const match = cookie.match(new RegExp(`(?:^|\\s)${cookieName}=([^;]+)`));
    if (match) {
      return match[1];
    }
  }
  return null;
}

function buildCookieHeader(phpSessionId: string): string {
  return `PHPSESSID=${phpSessionId}; pll_language=pt`;
}

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function parseCurriculoPage(html: string): Omit<AbmnSessionSeed, "phpSessionId"> {
  const token = html.match(/name=token value="([^"]+)"/i)?.[1] ?? html.match(/name="token" value="([^"]+)"/i)?.[1];
  const captchaCode = html.match(/name="codigocaptcha" value="([^"]+)"/i)?.[1];
  const captchaImageSrc = html.match(/<img[^>]+src="([^"]+really-simple-captcha\/tmp\/[^"]+)"/i)?.[1];

  if (!token || !captchaCode || !captchaImageSrc) {
    throw new Error("ABMN curriculum form markup changed.");
  }

  return {
    token,
    captchaCode,
    captchaImageUrl: new URL(captchaImageSrc, ABMN_BASE_URL).toString(),
  };
}

function isPdfPayload(contentType: string | null, buffer: Buffer): boolean {
  if (contentType?.toLowerCase().includes("application/pdf")) {
    return true;
  }
  return buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

function extractPdfUrlFromHtml(html: string): string | null {
  const patterns = [
    /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
    /src=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
    /window\.open\(["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
    /location\.href\s*=\s*["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
    /(https?:\/\/[^\s"']+\.pdf(?:\?[^\s"']*)?)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) {
      return new URL(match, ABMN_BASE_URL).toString();
    }
  }

  return null;
}

function inferAbmnError(html: string): AbmnFetchFailure {
  const messageBlock = html.match(/<div id="barra-de-mensagens">([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const text = stripHtml(messageBlock || html).toLowerCase();

  if (text.includes("captcha")) {
    return {
      ok: false,
      code: "invalid_captcha",
      error: "Captcha incorreto ou expirado. Carregue um novo captcha e tente novamente.",
      refreshCaptcha: true,
    };
  }

  if (text.includes("matr") || text.includes("cadastro") || text.includes("não encontrado") || text.includes("nao encontrado")) {
    return {
      ok: false,
      code: "invalid_registration",
      error: "A matrícula não foi aceita pela ABMN. Confira o número e tente novamente.",
      refreshCaptcha: true,
    };
  }

  return {
    ok: false,
    code: "abmn_rejected",
    error: "A ABMN não retornou o currículo. Carregue um novo captcha e tente novamente.",
    refreshCaptcha: true,
  };
}

export async function createAbmnSessionSeed(): Promise<AbmnSessionSeed> {
  const response = await fetch(ABMN_CURRICULO_URL, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "text/html,application/xhtml+xml" },
  });

  if (!response.ok) {
    throw new Error(`ABMN request failed with status ${response.status}.`);
  }

  const html = await response.text();
  const setCookies = getSetCookieValues(response.headers);
  const phpSessionId = extractCookieValue(setCookies, "PHPSESSID");

  if (!phpSessionId) {
    throw new Error("ABMN session cookie was not returned.");
  }

  return {
    ...parseCurriculoPage(html),
    phpSessionId,
  };
}

async function fetchWithAbmnSession(url: string, phpSessionId: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Cookie", buildCookieHeader(phpSessionId));
  headers.set("Accept", headers.get("Accept") ?? "text/html,application/xhtml+xml,application/pdf");

  return fetch(url, {
    ...init,
    cache: "no-store",
    redirect: init?.redirect ?? "manual",
    headers,
  });
}

function nextPhpSessionId(response: Response, currentSessionId: string): string {
  const nextValue = extractCookieValue(getSetCookieValues(response.headers), "PHPSESSID");
  return nextValue ?? currentSessionId;
}

export async function fetchAbmnCurriculoPdf(options: {
  phpSessionId: string;
  token: string;
  captchaCode: string;
  registrationNumber: string;
  captchaAnswer: string;
}): Promise<AbmnFetchResult> {
  const form = new URLSearchParams({
    matricula: normalizeRegistrationNumber(options.registrationNumber),
    respostacaptcha: options.captchaAnswer.trim(),
    codigocaptcha: options.captchaCode,
    token: options.token,
    botao_gerar: "Gerar o currículo »»»",
  });

  let phpSessionId = options.phpSessionId;

  const postResponse = await fetchWithAbmnSession(ABMN_CURRICULO_URL, phpSessionId, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  phpSessionId = nextPhpSessionId(postResponse, phpSessionId);

  const postBuffer = Buffer.from(await postResponse.arrayBuffer());
  if (isPdfPayload(postResponse.headers.get("content-type"), postBuffer)) {
    return { ok: true, pdfBuffer: postBuffer };
  }

  let html = postBuffer.toString("utf8");

  if (postResponse.status >= 300 && postResponse.status < 400) {
    const location = postResponse.headers.get("location") ?? ABMN_CURRICULO_URL;
    const followUrl = new URL(location, ABMN_CURRICULO_URL).toString();
    const followResponse = await fetchWithAbmnSession(followUrl, phpSessionId, { method: "GET" });
    phpSessionId = nextPhpSessionId(followResponse, phpSessionId);

    const followBuffer = Buffer.from(await followResponse.arrayBuffer());
    if (isPdfPayload(followResponse.headers.get("content-type"), followBuffer)) {
      return { ok: true, pdfBuffer: followBuffer };
    }

    html = followBuffer.toString("utf8");
  }

  const pdfUrl = extractPdfUrlFromHtml(html);
  if (pdfUrl) {
    const pdfResponse = await fetchWithAbmnSession(pdfUrl, phpSessionId, { method: "GET" });
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    if (isPdfPayload(pdfResponse.headers.get("content-type"), pdfBuffer)) {
      return { ok: true, pdfBuffer };
    }
  }

  if (html.toLowerCase().includes("curriculo") || html.toLowerCase().includes("captcha") || html.toLowerCase().includes("matr")) {
    return inferAbmnError(html);
  }

  return {
    ok: false,
    code: "markup_changed",
    error: "A ABMN mudou a página de currículo e o download automático não conseguiu continuar.",
    refreshCaptcha: true,
  };
}
