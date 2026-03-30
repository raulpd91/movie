import { NextRequest, NextResponse } from "next/server";
import { hashInstallToken } from "@/lib/auth";
import { executeMarkMovie, type CustomerRecord, type MarkMoviePayload } from "@/lib/mark-movie";
import { redis } from "@/lib/redis";

function getInstallToken(request: NextRequest) {
  const token = request.headers.get("x-install-token")?.trim();

  if (!token) {
    return null;
  }

  return token;
}

function isCustomerRecord(value: unknown): value is CustomerRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CustomerRecord>;

  return (
    typeof candidate.customerId === "string" &&
    typeof candidate.customerName === "string" &&
    typeof candidate.status === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const installToken = getInstallToken(request);
    if (!installToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing install token.",
        },
        { status: 401 },
      );
    }

    const hashedInstallToken = hashInstallToken(installToken);
    const customerRecord = await redis.get(`installtoken:${hashedInstallToken}`);

    if (!isCustomerRecord(customerRecord)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid install token.",
        },
        { status: 401 },
      );
    }

    if (customerRecord.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Install token is inactive.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as MarkMoviePayload;
    const result = await executeMarkMovie(body, customerRecord);

    return NextResponse.json(result);
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

