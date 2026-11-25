"use client";

import { useActionState, useEffect, useState } from "react";
import { publishAlbumAndSendLink } from "@/app/(admin)/admin/albums/actions";
import {
  initialPublishAlbumState,
  sendsMagicLinkEmails,
  type MagicLinkDelivery,
} from "@/lib/admin/album-actions-state";
import type { AlbumStatus } from "@/types";

type PublishAlbumButtonProps = {
  albumId: string;
  status: AlbumStatus;
  clientEmail: string | null;
};

export function PublishAlbumButton({ albumId, status, clientEmail }: PublishAlbumButtonProps) {
  const [state, formAction, pending] = useActionState(
    publishAlbumAndSendLink,
    initialPublishAlbumState,
  );
  const [submitted, setSubmitted] = useState<MagicLinkDelivery | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const emailEnabled = sendsMagicLinkEmails();
  const isPublished = status === "published";
  const disabled = pending || !clientEmail;
  const magicLink = state.magicLink;
  const copied = magicLink !== null && copiedLink === magicLink;

  // Best effort: the browser may refuse because the click that started the
  // action is no longer a fresh user gesture. The Copy button covers that.
  useEffect(() => {
    if (!magicLink) return;
    let cancelled = false;
    navigator.clipboard.writeText(magicLink).then(
      () => {
        if (!cancelled) setCopiedLink(magicLink);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [magicLink]);

  async function copyLink() {
    if (!magicLink) return;
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopiedLink(magicLink);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  const linkLabel = isPublished ? "Copy Magic Link" : "Publish & Copy Magic Link";
  const emailLabel = isPublished ? "Resend Magic Link" : "Publish & Send Magic Link";
  const primaryDelivery: MagicLinkDelivery = emailEnabled ? "email" : "link";

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="albumId" value={albumId} />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            name="delivery"
            value={primaryDelivery}
            disabled={disabled}
            onClick={() => setSubmitted(primaryDelivery)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {pending && submitted === primaryDelivery
              ? "Working…"
              : emailEnabled
                ? emailLabel
                : linkLabel}
          </button>
          {emailEnabled ? (
            <button
              type="submit"
              name="delivery"
              value="link"
              disabled={disabled}
              onClick={() => setSubmitted("link")}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-neutral-700"
            >
              {pending && submitted === "link" ? "Working…" : linkLabel}
            </button>
          ) : null}
        </div>

        {!clientEmail ? (
          <p className="text-xs text-neutral-500">Save a client email to enable this.</p>
        ) : emailEnabled ? (
          <p className="text-xs text-neutral-500">
            Email {clientEmail} a sign-in link to this gallery, or copy the link to share it
            yourself.
          </p>
        ) : (
          <p className="text-xs text-neutral-500">
            Development mode: no email is sent. You get a sign-in link for {clientEmail} to
            copy instead.
          </p>
        )}

        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error"
                ? "text-sm text-red-700 dark:text-red-400"
                : "text-sm text-emerald-800 dark:text-emerald-300"
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {magicLink ? (
        <div className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <label className="block text-xs font-medium" htmlFor={`magic-link-${albumId}`}>
            Sign-in link
          </label>
          <input
            id={`magic-link-${albumId}`}
            readOnly
            value={magicLink}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 font-mono text-xs dark:border-neutral-700"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs dark:border-neutral-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {copyFailed ? (
              <span className="text-xs text-red-700 dark:text-red-400">
                Copy failed. Select the link and copy it manually.
              </span>
            ) : null}
          </div>
          <p className="text-xs text-neutral-500">
            Single use, and it expires (1 hour by default). It signs in as the client, so open it
            in a private window to keep your admin session.
          </p>
        </div>
      ) : null}
    </div>
  );
}
