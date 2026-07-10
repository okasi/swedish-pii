import { maskPII } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

const MAX_INPUT_LENGTH = 100_000;

/**
 * POST /api/mask
 *
 * Body: `{ "text": string, "strict"?: boolean }`
 * Response: `{ maskedText, maskedData, entities }`
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, strict, scoreThreshold } = (body ?? {}) as {
    text?: unknown;
    strict?: unknown;
    scoreThreshold?: unknown;
  };
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'text' field" },
      { status: 400 }
    );
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `'text' exceeds ${MAX_INPUT_LENGTH} characters` },
      { status: 413 }
    );
  }
  if (
    scoreThreshold !== undefined &&
    (typeof scoreThreshold !== "number" ||
      scoreThreshold < 0 ||
      scoreThreshold > 1)
  ) {
    return NextResponse.json(
      { error: "'scoreThreshold' must be a number between 0 and 1" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    maskPII(text, { strict: strict === true, scoreThreshold })
  );
}
