import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ error: "Not Implemented" }, { status: 501 });
}
