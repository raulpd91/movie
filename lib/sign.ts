import { createHmac, timingSafeEqual } from "node:crypto";

function readEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeBaseUrl(value: string) {
  const normalized = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  return new URL(normalized).origin;
}

function toSortedEntries(params: Iterable<[string, string]>) {
  return [...params]
    .filter(([key]) => key !== "sig")
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    });
}

function buildCanonicalQuery(entries: Iterable<[string, string]>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of toSortedEntries(entries)) {
    searchParams.append(key, value);
  }

  return searchParams.toString();
}

function createSignature(payload: string) {
  const secret = readEnv("OG_SIGNING_SECRET");

  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signOgUrl(params: Record<string, string>) {
  const baseUrl = normalizeBaseUrl(readEnv("NEXT_PUBLIC_APP_URL"));
  const query = buildCanonicalQuery(Object.entries(params));
  const signature = createSignature(query);
  const suffix = query ? `${query}&sig=${signature}` : `sig=${signature}`;

  return `${baseUrl}/api/og?${suffix}`;
}

export function verifyOgUrl(input: URL | string) {
  const url = input instanceof URL ? input : new URL(input);
  const signature = url.searchParams.get("sig");

  if (!signature) {
    return false;
  }

  const query = buildCanonicalQuery(url.searchParams.entries());
  const expectedSignature = createSignature(query);

  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
