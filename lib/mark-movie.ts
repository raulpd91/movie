import axios from "axios";
import { Client } from "@notionhq/client";
import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getServiceEnv, isValidDateString } from "@/lib/env";
import { signOgUrl } from "@/lib/sign";

export type MarkMoviePayload = {
  title?: string;
  rating?: number;
  comment?: string;
  date?: string;
};

export type CustomerRecord = {
  customerId: string;
  customerName: string;
  status: string;
  rateLimit?: number;
  createdAt?: number;
};

type TmdbMovieResult = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
};

type TmdbStatus = "matched" | "fallback" | "error";
type NotionPageProperties = NonNullable<CreatePageParameters["properties"]>;
type NotionDatabaseProperties = Record<string, { type: string }>;

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

function findPropertyName(
  properties: NotionDatabaseProperties,
  type: string,
  preferredNames: string[],
) {
  for (const name of preferredNames) {
    if (properties[name]?.type === type) {
      return name;
    }
  }

  for (const [name, config] of Object.entries(properties)) {
    if (config.type === type) {
      return name;
    }
  }

  return null;
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
}, databaseProperties: NotionDatabaseProperties) {
  const properties: NotionPageProperties = {};

  const titleKey = findPropertyName(databaseProperties, "title", [
    "Title",
    "Name",
    "标题",
  ]);

  if (!titleKey) {
    throw new Error("No title property was found in the Notion database.");
  }

  properties[titleKey] = {
    title: [
      {
        text: {
          content: input.title,
        },
      },
    ],
  };

  const ratingKey = findPropertyName(databaseProperties, "number", [
    "Rating",
    "评分",
  ]);
  if (ratingKey) {
    properties[ratingKey] = {
      number: input.rating,
    };
  }

  const dateKey = findPropertyName(databaseProperties, "date", [
    "Date",
    "Watched Date",
    "观看日期",
  ]);
  if (dateKey) {
    properties[dateKey] = {
      date: {
        start: input.date,
      },
    };
  }

  const customerIdKey = findPropertyName(databaseProperties, "rich_text", [
    "Customer ID",
    "客户 ID",
  ]);
  if (customerIdKey) {
    properties[customerIdKey] = {
      rich_text: [
        {
          text: {
            content: input.customerId,
          },
        },
      ],
    };
  }

  const customerNameKey = findPropertyName(databaseProperties, "rich_text", [
    "Customer Name",
    "客户名",
  ]);
  if (customerNameKey) {
    properties[customerNameKey] = {
      rich_text: [
        {
          text: {
            content: input.customerName,
          },
        },
      ],
    };
  }

  const tmdbStatusSelectKey = findPropertyName(databaseProperties, "select", [
    "TMDB Status",
    "TMDB状态",
  ]);
  if (tmdbStatusSelectKey) {
    properties[tmdbStatusSelectKey] = {
      select: {
        name: input.tmdbStatus,
      },
    };
  }

  const tmdbStatusStateKey = findPropertyName(databaseProperties, "status", [
    "TMDB Status",
    "状态",
  ]);
  if (tmdbStatusStateKey) {
    properties[tmdbStatusStateKey] = {
      status: {
        name: input.tmdbStatus,
      },
    };
  }

  const commentKey = findPropertyName(databaseProperties, "rich_text", [
    "Comment",
    "短评",
  ]);
  if (input.comment && commentKey) {
    properties[commentKey] = {
      rich_text: [
        {
          text: {
            content: input.comment,
          },
        },
      ],
    };
  }

  const posterKey = findPropertyName(databaseProperties, "url", [
    "Poster",
    "Poster URL",
    "海报",
  ]);
  if (input.posterUrl && posterKey) {
    properties[posterKey] = {
      url: input.posterUrl,
    };
  }

  const releaseDateKey = findPropertyName(databaseProperties, "date", [
    "Release Date",
    "上映日期",
  ]);
  if (input.releaseDate && releaseDateKey) {
    properties[releaseDateKey] = {
      date: {
        start: input.releaseDate,
      },
    };
  }

  return properties;
}

function extractDatabaseProperties(
  value: Awaited<ReturnType<Client["databases"]["retrieve"]>>,
) {
  if (!("properties" in value) || !value.properties || typeof value.properties !== "object") {
    throw new Error("Failed to read Notion database properties.");
  }

  return value.properties as NotionDatabaseProperties;
}

function getNotionPageUrl(page: Awaited<ReturnType<Client["pages"]["create"]>>) {
  return "url" in page ? page.url : undefined;
}

export async function executeMarkMovie(
  payload: MarkMoviePayload,
  customer: CustomerRecord,
) {
  const env = getServiceEnv();
  const notion = new Client({
    auth: env.NOTION_API_KEY,
  });
  const input = normalizePayload(payload);

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

  const database = await notion.databases.retrieve({
    database_id: env.NOTION_DATABASE_ID,
  });
  const databaseProperties = extractDatabaseProperties(database);

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
      customerId: customer.customerId,
      customerName: customer.customerName,
      tmdbStatus,
      releaseDate,
    }, databaseProperties),
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

  return {
    success: true,
    message: "记录成功！",
    card_image_url: cardImageUrl,
    notion_url: getNotionPageUrl(page),
    customer_id: customer.customerId,
    tmdb_status: tmdbStatus,
  };
}
