import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

function buildStars(rating: number) {
  const normalized = Math.max(1, Math.min(5, Number.isFinite(rating) ? rating : 0));
  return "★".repeat(normalized);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Untitled Movie";
  const poster = searchParams.get("poster");
  const comment = searchParams.get("comment") || "没有留下短评，但这部电影值得被记住。";
  const releaseDate = searchParams.get("releaseDate") || "";
  const rating = Number(searchParams.get("rating") || "0");

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col bg-zinc-900 text-white"
        style={{
          background:
            "radial-gradient(circle at top, rgba(251,146,60,0.18), transparent 30%), linear-gradient(180deg, #0a0a0a, #18181b 55%, #09090b)",
        }}
      >
        <div tw="flex flex-1 flex-col p-10">
          <div tw="flex flex-1 flex-col overflow-hidden rounded-[36px] border border-white/10 bg-zinc-950 shadow-2xl">
            <div tw="relative flex-[7] bg-zinc-800">
              {poster ? (
                <img
                  src={poster}
                  alt={title}
                  tw="h-full w-full object-cover"
                />
              ) : (
                <div
                  tw="flex h-full w-full items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(39,39,42,1), rgba(24,24,27,1), rgba(63,63,70,1))",
                  }}
                >
                  <div tw="flex flex-col items-center justify-center text-center">
                    <div tw="text-2xl uppercase tracking-[0.4em] text-orange-300">
                      Movie Tracker
                    </div>
                    <div tw="mt-5 max-w-[70%] text-6xl font-bold leading-[1.05]">
                      {title}
                    </div>
                  </div>
                </div>
              )}
              <div
                tw="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.65))",
                }}
              />
            </div>

            <div tw="flex flex-[3] flex-col justify-between bg-zinc-50 px-10 py-9 text-zinc-900">
              <div tw="flex flex-col">
                <div tw="text-[18px] uppercase tracking-[0.36em] text-zinc-500">
                  Watched & logged
                </div>
                <div tw="mt-4 text-5xl font-bold leading-[1.08]">{title}</div>
                <div tw="mt-5 text-[30px] tracking-[0.24em] text-amber-500">
                  {buildStars(rating)}
                </div>
                <div tw="mt-5 text-[28px] leading-[1.45] text-zinc-700">
                  {comment}
                </div>
              </div>

              <div tw="mt-6 flex items-center justify-between text-[20px] text-zinc-500">
                <div>{releaseDate ? `上映年份 ${releaseDate.slice(0, 4)}` : "TMDB metadata ready"}</div>
                <div tw="uppercase tracking-[0.3em]">Movie Tracker Skill</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 1000,
    },
  );
}
