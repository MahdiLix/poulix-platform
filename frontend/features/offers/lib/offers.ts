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
  window.localStorage.setItem(OFFER_KEY, JSON.stringify(getNormalizedOffer(offer)));
}

export function getNormalizedOffer(offer: HomepageOffer): HomepageOffer {
  return {
    title: offer.title.trim() || DEFAULT_HOMEPAGE_OFFER.title,
    description: offer.description.trim() || DEFAULT_HOMEPAGE_OFFER.description,
    percent: Math.min(100, Math.max(1, Math.round(Number(offer.percent) || 20))),
    enabled: offer.enabled !== false,
  };
}

export function activateHomepageOffer(offer = getHomepageOffer()) {
  if (typeof window === "undefined" || !offer.enabled) return;
  const active: ActiveOffer = {
    ...getNormalizedOffer(offer),
    activatedAt: new Date().toISOString(),
    consumed: false,
  };
  window.localStorage.setItem(ACTIVE_OFFER_KEY, JSON.stringify(active));
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
}

export function applyOfferPercent(amount: number, percent: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount * percent) / 100);
}
