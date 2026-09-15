export type HomepageOffer = {
  title: string;
  description: string;
  percent: number;
  enabled: boolean;
};

export type ActiveOffer = HomepageOffer & {
  activatedAt: string;
  consumed: boolean;
};

const OFFER_KEY = "poulix_homepage_offer";
const ACTIVE_OFFER_KEY = "poulix_active_offer";
const CLAIMED_OFFERS_KEY = "poulix_claimed_offers";
export const OFFER_CHANGED_EVENT = "poulix:offer-changed";

export const DEFAULT_HOMEPAGE_OFFER: HomepageOffer = {
  title: "Special Offer for Today's Top Up",
  description: "Get up to 20% bonus cashback on your next wallet top up.",
  percent: 20,
  enabled: true,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function dispatchOfferChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OFFER_CHANGED_EVENT));
}

export function offerFingerprint(offer: HomepageOffer): string {
  const normalized = getNormalizedOffer(offer);
  return `homepage:${normalized.percent}`;
}

function readClaimedOffers(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(CLAIMED_OFFERS_KEY) ?? {};
}

export function isOfferClaimed(
  userId: string | undefined,
  offer: HomepageOffer,
): boolean {
  if (!userId) return false;
  const claimed = readClaimedOffers()[userId] ?? [];
  return claimed.includes(offerFingerprint(offer));
}

export function getHomepageOffer(): HomepageOffer {
  const stored = readJson<HomepageOffer>(OFFER_KEY);
  if (!stored) return DEFAULT_HOMEPAGE_OFFER;
  return {
    title: stored.title?.trim() || DEFAULT_HOMEPAGE_OFFER.title,
    description:
      stored.description?.trim() || DEFAULT_HOMEPAGE_OFFER.description,
    percent: Number.isFinite(stored.percent)
      ? Math.min(100, Math.max(1, Math.round(stored.percent)))
      : DEFAULT_HOMEPAGE_OFFER.percent,
    enabled: stored.enabled !== false,
  };
}

export function saveHomepageOffer(offer: HomepageOffer) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    OFFER_KEY,
    JSON.stringify(getNormalizedOffer(offer)),
  );
}

export function getNormalizedOffer(offer: HomepageOffer): HomepageOffer {
  return {
    title: offer.title.trim() || DEFAULT_HOMEPAGE_OFFER.title,
    description: offer.description.trim() || DEFAULT_HOMEPAGE_OFFER.description,
    percent: Math.min(
      100,
      Math.max(1, Math.round(Number(offer.percent) || 20)),
    ),
    enabled: offer.enabled !== false,
  };
}

export function localizeOfferCopy(
  offer: HomepageOffer,
  copy: { specialOffer: string; specialOfferDesc: string },
): HomepageOffer {
  const titleIsDefault =
    !offer.title.trim() || offer.title.trim() === DEFAULT_HOMEPAGE_OFFER.title;
  const descriptionIsDefault =
    !offer.description.trim() ||
    offer.description.trim() === DEFAULT_HOMEPAGE_OFFER.description;
  return {
    ...offer,
    title: titleIsDefault ? copy.specialOffer : offer.title,
    description: descriptionIsDefault
      ? copy.specialOfferDesc
      : offer.description,
  };
}

export function activateHomepageOffer(
  offer = getHomepageOffer(),
  userId?: string,
) {
  if (typeof window === "undefined" || !offer.enabled) return;
  if (isOfferClaimed(userId, offer)) return;
  const active: ActiveOffer = {
    ...getNormalizedOffer(offer),
    activatedAt: new Date().toISOString(),
    consumed: false,
  };
  window.localStorage.setItem(ACTIVE_OFFER_KEY, JSON.stringify(active));
  dispatchOfferChanged();
}

export function getActiveOffer(): ActiveOffer | null {
  const stored = readJson<ActiveOffer>(ACTIVE_OFFER_KEY);
  if (!stored || stored.consumed || stored.enabled === false) return null;
  return stored;
}

export function consumeActiveOffer() {
  const stored = readJson<ActiveOffer>(ACTIVE_OFFER_KEY);
  if (!stored || typeof window === "undefined") return;
  window.localStorage.setItem(
    ACTIVE_OFFER_KEY,
    JSON.stringify({ ...stored, consumed: true }),
  );
  dispatchOfferChanged();
}

export function claimHomepageOffer(
  userId: string | undefined,
  offer?: HomepageOffer | null,
) {
  if (typeof window === "undefined") return;
  const source = offer ?? readJson<ActiveOffer>(ACTIVE_OFFER_KEY);
  if (userId && source) {
    const claimed = readClaimedOffers();
    const next = new Set(claimed[userId] ?? []);
    next.add(offerFingerprint(source));
    claimed[userId] = [...next];
    window.localStorage.setItem(CLAIMED_OFFERS_KEY, JSON.stringify(claimed));
  }
  consumeActiveOffer();
}

export function applyOfferPercent(amount: number, percent: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount * percent) / 100);
}
