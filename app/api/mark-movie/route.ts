import axios from "axios";
import { Client } from "@notionhq/client";
import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { getServiceEnv, isValidDateString } from "@/lib/env";
import { redis } from "@/lib/redis";
import { signOgUrl } from "@/lib/sign";

type MarkMoviePayload = {
  title?: string;
  rating?: number;
  comment?: string;
  date?: string;
};

type TmdbMovieResult = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
};

type CustomerAuthRecord = {
  customerId: string;
  customerName: string;
  status: string;
  rateLimit: number;
  createdAt: number;
};

type TmdbStatus = "matched" | "fallback" | "error";
type NotionPageProperties = NonNullable<CreatePageParameters["properties"]>;

function normalizePayload(payload: MarkMoviePayload) {
  const title = payload.title?.trim();
  const rating = Number(payload.rating);
  const comment = payload.comment?.trim() || undefined;
  const date = payload.date?.trim() || new Date().toISOString().slice(0, 10);

  if (!title) {
    throw new Error("`title` is required.");
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("`rating` must be a number between 1 and 5.");
  }

  if (!isValidDateString(date)) {
    throw new Error("`date` must be in YYYY-MM-DD format.");
  }

  return {
    title,
    rating,
    comment,
    date,
  };
}

async function searchMovie(
  title: string,
  tmdbApiKey: string,
): Promise<TmdbMovieResult | null> {
  const response = await axios.get<{ results: TmdbMovieResult[] }>(
    "https://api.themoviedb.org/3/search/movie",
    {
      params: {
        api_key: tmdbApiKey,
        query: title,
        language: "zh-CN",
        include_adult: false,
      },
      timeout: 10000,
    },
  );

  return response.data.results[0] ?? null;
}

function buildPosterUrl(posterPath: string | null) {
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "";
}

function normalizeReleaseDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  return isValidDateString(value) ? value : "";
}

function buildNotionProperties(input: {
  title: string;
  rating: number;
  date: string;
  comment?: string;
  posterUrl?: string;
  customerId: string;
  customerName: string;
  tmdbStatus: TmdbStatus;
  releaseDate?: string;
}) {
  const properties: NotionPageProperties = {
    Title: {
      title: [
        {
          text: {
            content: input.title,
          },
        },
      ],
    },
    Rating: {
      number: input.rating,
    },
    Date: {
      date: {
        start: input.date,
      },
    },
    "Customer ID": {
      rich_text: [
        {
          text: {
            content: input.customerId,
          },
        },
      ],
    },
    "Customer Name": {
      rich_text: [
        {
          text: {
            content: input.customerName,
          },
        },
      ],
    },
    "TMDB Status": {
      select: {
        name: input.tmdbStatus,
      },
    },
  };

  if (input.comment) {
    properties.Comment = {
      rich_text: [
        {
          text: {
            content: input.comment,
          },
        },
      ],
    };
  }

  if (input.posterUrl) {
    properties.Poster = {
      url: input.posterUrl,
    };
  }

  if (input.releaseDate) {
    properties["Release Date"] = {
      date: {
        start: input.releaseDate,
      },
    };
  }

  return properties;
}

function getNotionPageUrl(page: Awaited<ReturnType<Client["pages"]["create"]>>) {
  return "url" in page ? page.url : undefined;
}

function getApiKeyFromAuthorizationHeader(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function isCustomerAuthRecord(value: unknown): value is CustomerAuthRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CustomerAuthRecord>;

  return (
    typeof candidate.customerId === "string" &&
    typeof candidate.customerName === "string" &&
    typeof candidate.status === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKeyFromAuthorizationHeader(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid Authorization header.",
        },
        { status: 401 },
      );
    }

    const hashedApiKey = hashApiKey(apiKey);
    const customerRecord = await redis.get(`apikey:${hashedApiKey}`);

    if (!isCustomerAuthRecord(customerRecord)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid API key.",
        },
        { status: 401 },
      );
    }

    if (customerRecord.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "API key is inactive.",
        },
        { status: 403 },
      );
    }

    const env = getServiceEnv();
    const notion = new Client({
      auth: env.NOTION_API_KEY,
    });
    const body = (await request.json()) as MarkMoviePayload;
    const input = normalizePayload(body);

    let tmdbStatus: TmdbStatus = "error";
    let matchedMovie: TmdbMovieResult | null = null;
    let posterUrl = "";
    let releaseDate = "";

    try {
      matchedMovie = await searchMovie(input.title, env.TMDB_API_KEY);

      if (matchedMovie) {
        posterUrl = buildPosterUrl(matchedMovie.poster_path);
        releaseDate = normalizeReleaseDate(matchedMovie.release_date);
        tmdbStatus = "matched";
      } else {
        tmdbStatus = "fallback";
      }
    } catch {
      tmdbStatus = "error";
    }

    const page = await notion.pages.create({
      parent: {
        database_id: env.NOTION_DATABASE_ID,
      },
      properties: buildNotionProperties({
        title: input.title,
        rating: input.rating,
        comment: input.comment,
        date: input.date,
        posterUrl: posterUrl || undefined,
        customerId: customerRecord.customerId,
        customerName: customerRecord.customerName,
        tmdbStatus,
        releaseDate,
      }),
    });

    const ogParams: Record<string, string> = {
      title: matchedMovie?.title || input.title,
      rating: String(input.rating),
    };

    if (input.comment) {
      ogParams.comment = input.comment;
    }

    if (posterUrl) {
      ogParams.poster = posterUrl;
    }

    if (releaseDate) {
      ogParams.releaseDate = releaseDate;
    }

    const cardImageUrl = signOgUrl(ogParams);

    return NextResponse.json({
      success: true,
      message: "记录成功！",
      card_image_url: cardImageUrl,
      notion_url: getNotionPageUrl(page),
      customer_id: customerRecord.customerId,
      tmdb_status: tmdbStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record the movie.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 },
    );
  }
}
