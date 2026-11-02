import * as SecureStore from "expo-secure-store";

import { tours, type TourId } from "./tours";

// SecureStore rather than kv-store, like the deck tutorial: a sign-out clears
// kv-store, and someone who saw the tour should not see it again after
// signing back in. Reset aplikasi clears these.
export const TOUR_SEEN_KEYS = (Object.keys(tours) as TourId[]).map(seenKey);

function seenKey(id: TourId) {
  return `hakgyo.tour.${id}.seen`;
}

/** Whether the learner finished or skipped this version of the tour. */
export function hasSeenTour(id: TourId) {
  return SecureStore.getItem(seenKey(id)) === String(tours[id].version);
}

export function markTourSeen(id: TourId) {
  SecureStore.setItem(seenKey(id), String(tours[id].version));
}

/** "Lihat tur aplikasi": every tour shows again on its screen. */
export async function forgetSeenTours() {
  for (const key of TOUR_SEEN_KEYS) await SecureStore.deleteItemAsync(key);
}
