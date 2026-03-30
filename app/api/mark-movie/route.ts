import axios from "axios";
import { Client } from "@notionhq/client";
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, getServiceEnv, isValidDateString } from "@/lib/env";

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

function normalizePayload(payload: MarkMoviePayload) {
  const title = payload.title?.trim();
  const rating = Number(payload.rating);
  const comment = payload.comment?.trim() ?? "";
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

function buildNotionProperties(input: {
  title: string;
  posterUrl: string;
  rating: number;
  comment: string;
  date: string;
  releaseDate?: string;
}) {
  return {
    Title: {
      title: [
        {
          text: {
            content: input.title,
          },
        },
      ],
    },
    "Poster URL": {
      url: input.posterUrl || null,
    },
    Rating: {
      number: input.rating,
    },
    Comment: {
      rich_text: input.comment
        ? [
            {
              text: {
                content: input.comment,
              },
            },
          ]
        : [],
    },
    Date: {
      date: {
        start: input.date,
      },
    },
    "Release Date": {
      rich_text: input.releaseDate
        ? [
            {
              text: {
                content: input.releaseDate,
              },
            },
          ]
        : [],
    },
  };
}

function getNotionPageUrl(page: Awaited<ReturnType<Client["pages"]["create"]>>) {
  return "url" in page ? page.url : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const env = getServiceEnv();
    const notion = new Client({
      auth: env.NOTION_API_KEY,
    });
    const body = (await request.json()) as MarkMoviePayload;
    const input = normalizePayload(body);

    const movie = await searchMovie(input.title, env.TMDB_API_KEY);
    const posterUrl = buildPosterUrl(movie?.poster_path ?? null);
    const releaseDate = movie?.release_date || "";

    const page = await notion.pages.create({
      parent: {
        database_id: env.NOTION_DATABASE_ID,
      },
      properties: buildNotionProperties({
        title: movie?.title || input.title,
        posterUrl,
        rating: input.rating,
        comment: input.comment,
        date: input.date,
        releaseDate,
      }),
    });

    const ogUrl = new URL("/api/og", getBaseUrl(request));
    ogUrl.searchParams.set("title", movie?.title || input.title);
    ogUrl.searchParams.set("rating", String(input.rating));

    if (input.comment) {
      ogUrl.searchParams.set("comment", input.comment);
    }

    if (posterUrl) {
      ogUrl.searchParams.set("poster", posterUrl);
    }

    if (releaseDate) {
      ogUrl.searchParams.set("releaseDate", releaseDate);
    }

    return NextResponse.json({
      success: true,
      message: `已记录《${movie?.title || input.title}》的观影信息，并生成了观影卡片。`,
      card_image_url: ogUrl.toString(),
      notion_url: getNotionPageUrl(page),
      movie: {
        title: movie?.title || input.title,
        release_date: releaseDate || null,
        poster_url: posterUrl || null,
      },
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
