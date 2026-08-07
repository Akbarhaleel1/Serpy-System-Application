// Support-period maths, shared by the initial purchase and yearly renewals.

/** One year on from `from`. */
function addYear(from) {
  const date = new Date(from);
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

/**
 * Where the support period lands after paying for another year.
 *
 * Extends from whichever is later, the current expiry or today. Renewing early
 * therefore keeps the time already paid for instead of throwing it away, and
 * renewing after a lapse does not bill for the months spent without support.
 */
function nextExpiry(currentExpiry) {
  const now = new Date();
  const current = currentExpiry ? new Date(currentExpiry) : null;
  const base = current && current > now ? current : now;

  return addYear(base);
}

module.exports = { addYear, nextExpiry };
