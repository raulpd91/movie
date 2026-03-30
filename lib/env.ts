import { NextRequest } from "next/server";

function readEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServiceEnv() {
  return {
    TMDB_API_KEY: readEnv("TMDB_API_KEY"),
    NOTION_API_KEY: readEnv("NOTION_API_KEY"),
    NOTION_DATABASE_ID: readEnv("NOTION_DATABASE_ID"),
  };
}

export function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getBaseUrl(request: NextRequest) {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return request.nextUrl.origin;
  }

  return `${proto}://${host}`;
}
