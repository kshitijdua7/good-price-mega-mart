// Real showroom details. Everything here starts empty on purpose: the website
// never shows brands, reviews, opening hours or offers that the store has not
// confirmed. Fill a value in and the matching section appears on the site.

export type Hours = { open: string; close: string; closedDays: number[] };
export type Review = { name: string; text: string; stars: number };
export type Offer = { title: string; detail: string; ends: string; category?: string };

// Brands the showroom stocks, e.g. ['LG', 'Samsung', 'Voltas'].
// While empty, the scrolling strip on the home page shows product categories.
export const brands: string[] = [];

// Genuine customer reviews copied from the Google listing (with permission).
// e.g. { name: 'Harpreet S.', text: 'Helpful staff…', stars: 5 }
export const reviews: Review[] = [];

// Opening hours in 24-hour India time. closedDays uses 0 = Sunday … 6 = Saturday.
// e.g. { open: '10:00', close: '21:00', closedDays: [] }
// While null, the site asks visitors to call and confirm hours.
export const hours = null as Hours | null;

// Live promotions. `ends` is an ISO date-time; an offer hides itself once it has passed.
// e.g. { title: 'Festive exchange week', detail: 'Ask in store for terms.', ends: '2026-11-20T21:00:00+05:30', category: 'refrigerators' }
export const offers: Offer[] = [];
