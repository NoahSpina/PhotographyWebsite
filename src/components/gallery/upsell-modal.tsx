import { useRef, useState } from "react";
import { useModalDialog } from "@/components/gallery/use-modal-dialog";
import type { UpgradeChoice, UpgradeOptions, UpgradePackage } from "@/lib/gallery/types";

export type UpsellTrigger =
  | { reason: "quota"; limit: number; current: number }
  | { reason: "manual" };

type UpsellModalProps = {
  trigger: UpsellTrigger;
  downloadLimit: number | null;
  options: UpgradeOptions;
  /** Upper bound for the extra-photo stepper. */
  maxExtraPhotos: number;
  onClose: () => void;
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatPrice(cents: number): string {
  return cents % 100 === 0 ? wholeCurrency.format(cents / 100) : currency.format(cents / 100);
}

export function UpsellModal({
  trigger,
  downloadLimit,
  options,
  maxExtraPhotos,
  onClose,
}: UpsellModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { close, dialogProps } = useModalDialog(dialogRef, onClose);
  const [quantity, setQuantity] = useState(1);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const limit = trigger.reason === "quota" ? trigger.limit : downloadLimit;
  const { heading, body } = upsellCopy(trigger, limit);
  const extraPrice = options.extraPhotoPriceCents;
  const hasOffers = options.packages.length > 0 || extraPrice !== null;

  function startCheckout(choice: UpgradeChoice) {
    // TODO(phase-5): POST the album id and this choice to /api/stripe/checkout
    // and redirect to the returned Checkout URL. The new limit is granted only
    // by the verified Stripe webhook, never by the redirect back.
    setCheckoutMessage(
      `Online checkout for ${describeChoice(choice, options.packages)} isn't connected yet. Contact the studio and we'll unlock it for you.`,
    );
  }

  return (
    <dialog
      ref={dialogRef}
      {...dialogProps}
      aria-labelledby="upsell-heading"
      className="m-auto w-[min(34rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-background p-0 text-foreground shadow-xl backdrop:bg-black/60"
    >
      <div className="space-y-5 p-6">
        <div className="space-y-2">
          <h2 id="upsell-heading" className="text-xl font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
        </div>

        {options.packages.length > 0 ? (
          <ul className="space-y-3">
            {options.packages.map((pkg) => (
              <li key={pkg.id}>
                <PackageOffer pkg={pkg} onChoose={() => startCheckout({ kind: "package", packageId: pkg.id })} />
              </li>
            ))}
          </ul>
        ) : null}

        {extraPrice !== null ? (
          <div className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
            <div>
              <p className="font-medium">Add extra photos</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {formatPrice(extraPrice)} per photo, on top of your current package.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label="One fewer photo"
                  className="px-3 py-1.5 enabled:hover:bg-neutral-100 disabled:opacity-40 dark:enabled:hover:bg-neutral-900"
                >
                  −
                </button>
                <span aria-live="polite" className="min-w-10 text-center text-sm tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(maxExtraPhotos, value + 1))}
                  disabled={quantity >= maxExtraPhotos}
                  aria-label="One more photo"
                  className="px-3 py-1.5 enabled:hover:bg-neutral-100 disabled:opacity-40 dark:enabled:hover:bg-neutral-900"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => startCheckout({ kind: "extra_photos", quantity })}
                className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-100 dark:hover:bg-neutral-900"
              >
                Add {quantity} {quantity === 1 ? "photo" : "photos"} · {formatPrice(extraPrice * quantity)}
              </button>
            </div>
          </div>
        ) : null}

        {!hasOffers ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Contact the studio to add more photos to your package.
          </p>
        ) : null}

        {checkoutMessage ? (
          <p
            role="status"
            className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {checkoutMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}

function PackageOffer({ pkg, onChoose }: { pkg: UpgradePackage; onChoose: () => void }) {
  const unlimited = pkg.downloadLimit === null;
  const scope = unlimited ? "Every photo in the gallery" : `${pkg.downloadLimit} photos`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">
          {pkg.name} <span className="text-neutral-500">· {formatPrice(pkg.priceCents)}</span>
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {scope}
          {pkg.includesPrints ? ", with a print credit" : ""}.
        </p>
        {pkg.description ? <p className="text-xs text-neutral-500">{pkg.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onChoose}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {unlimited ? "Unlock full gallery" : `Choose ${pkg.name}`}
      </button>
    </div>
  );
}

function describeChoice(choice: UpgradeChoice, packages: UpgradePackage[]): string {
  if (choice.kind === "extra_photos") {
    return `${choice.quantity} extra ${choice.quantity === 1 ? "photo" : "photos"}`;
  }
  return packages.find((pkg) => pkg.id === choice.packageId)?.name ?? "that package";
}

function upsellCopy(trigger: UpsellTrigger, limit: number | null): { heading: string; body: string } {
  if (limit === null) {
    return {
      heading: "Your gallery is unlimited",
      body: "Every photo in this gallery is already included in your package.",
    };
  }

  if (limit === 0) {
    return {
      heading: "Choose a package to start selecting",
      body: "Your gallery doesn't include any photos yet. Pick a package to select your favorites and unlock high-res downloads.",
    };
  }

  const included = `Your package includes ${limit} ${limit === 1 ? "photo" : "photos"}.`;
  if (trigger.reason === "quota") {
    return {
      heading: `You've selected all ${limit} included ${limit === 1 ? "photo" : "photos"}`,
      body: `${included} Unlock the full gallery, or add extra photos to keep selecting.`,
    };
  }
  return {
    heading: "Upgrade your package",
    body: `${included} Unlock the full gallery, or add extra photos.`,
  };
}
