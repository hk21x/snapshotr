import { NextResponse } from "next/server";

export async function POST() {
  // If this endpoint is reached, the middleware already validated the token
  return NextResponse.json({ valid: true });
}
