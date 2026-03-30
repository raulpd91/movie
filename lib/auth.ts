import { createHmac, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "sk_live";
const INSTALL_TOKEN_PREFIX = "it_live";

function readHashSecret() {
  const secret = process.env.API_KEY_HASH_SECRET;

  if (!secret) {
    throw new Error(
      "Missing required environment variable: API_KEY_HASH_SECRET",
    );
  }

  return secret;
}

export function generateApiKey() {
  return `${API_KEY_PREFIX}_${randomBytes(32).toString("base64url")}`;
}

export function hashApiKey(apiKey: string) {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("API key cannot be empty.");
  }

  return createHmac("sha256", readHashSecret())
    .update(normalizedApiKey)
    .digest("hex");
}

export function generateInstallToken() {
  return `${INSTALL_TOKEN_PREFIX}_${randomBytes(32).toString("base64url")}`;
}

export function hashInstallToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Install token cannot be empty.");
  }

  return createHmac("sha256", readHashSecret())
    .update(normalizedToken)
    .digest("hex");
}

export function maskApiKey(apiKey: string) {
  if (apiKey.length <= 12) {
    return `${apiKey.slice(0, 4)}****`;
  }

  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}
