import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin";
import { normalizeNote } from "@/lib/gallery/types";
import { isUuid } from "@/lib/validation";
import type { Database } from "@/types/database";
import type { RetouchStatus } from "@/types";

type SelectionUpdate = Database["public"]["Tables"]["selections"]["Update"];

const NO_STORE = { "Cache-Control": "no-store" };
const REPLY_MAX_LENGTH = 2000;
const RETOUCH_STATUSES: readonly RetouchStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "declined",
];

type RouteContext = { params: Promise<{ selectionId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await verifyAdmin();
  if (!admin.ok) {
    return errorResponse(
      admin.reason === "unauthenticated" ? "Sign in to manage selections." : "Admin access required.",
      admin.reason === "unauthenticated" ? 401 : 403,
    );
  }

  const { selectionId } = await context.params;
  if (!isUuid(selectionId)) {
    return errorResponse("Unknown selection.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const parsed = parsePatchBody(body);
  if (typeof parsed === "string") {
    return errorResponse(parsed, 400);
  }
  if (parsed.retouchStatus === undefined && parsed.adminReply === undefined) {
    return errorResponse("Provide retouchStatus and/or adminReply.", 400);
  }

  const { data: existing, error: loadError } = await admin.supabase
    .from("selections")
    .select("id, admin_reply")
    .eq("id", selectionId)
    .maybeSingle();

  if (loadError) {
    console.error("Could not load selection:", loadError.message);
    return errorResponse("Could not load the selection.", 500);
  }
  if (!existing) {
    return errorResponse("Selection not found.", 404);
  }

  const update: SelectionUpdate = {};
  if (parsed.retouchStatus !== undefined) {
    update.retouch_status = parsed.retouchStatus;
  }
  if (parsed.adminReply !== undefined) {
    update.admin_reply = parsed.adminReply;
    const previous = normalizeNote(existing.admin_reply);
    const next = normalizeNote(parsed.adminReply);
    if (previous !== next) {
      update.admin_replied_at = new Date().toISOString();
    }
  }

  const { data, error: updateError } = await admin.supabase
    .from("selections")
    .update(update)
    .eq("id", selectionId)
    .select("id, retouch_status, admin_reply, admin_replied_at")
    .maybeSingle();

  if (updateError || !data) {
    console.error("Could not update selection:", updateError?.message);
    return errorResponse("Could not update the selection.", 500);
  }

  return NextResponse.json(
    {
      id: data.id,
      retouchStatus: data.retouch_status,
      adminReply: data.admin_reply,
      adminRepliedAt: data.admin_replied_at,
    },
    { headers: NO_STORE },
  );
}

function parsePatchBody(
  body: unknown,
):
  | { retouchStatus?: RetouchStatus; adminReply?: string | null }
  | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }
  const { retouchStatus, adminReply } = body as Record<string, unknown>;

  const result: { retouchStatus?: RetouchStatus; adminReply?: string | null } = {};

  if (retouchStatus !== undefined) {
    if (typeof retouchStatus !== "string" || !RETOUCH_STATUSES.includes(retouchStatus as RetouchStatus)) {
      return "retouchStatus is invalid.";
    }
    result.retouchStatus = retouchStatus as RetouchStatus;
  }

  if (adminReply !== undefined) {
    if (adminReply !== null && typeof adminReply !== "string") {
      return "adminReply must be a string or null.";
    }
    const normalized = adminReply === null ? null : normalizeNote(adminReply);
    if (normalized && normalized.length > REPLY_MAX_LENGTH) {
      return `Keep replies under ${REPLY_MAX_LENGTH.toLocaleString("en-US")} characters.`;
    }
    result.adminReply = normalized;
  }

  return result;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}