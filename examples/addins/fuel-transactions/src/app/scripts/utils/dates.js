/**
 * Get the start of the current week (Monday 00:00:00 local time) as ISO string.
 */
export const getThisWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday.toISOString();
};

/**
 * Get the end of today (23:59:59.999 local time) as ISO string.
 */
export const getTodayEnd = () => {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return endOfDay.toISOString();
};

/**
 * Format an ISO date string to local date/time string for display.
 * @param {string} isoString - UTC ISO date string
 * @param {string} language - locale ('en' or 'fr')
 * @returns {string} formatted local date/time
 */
export const formatLocalDateTime = (isoString, language) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: language !== 'fr'
  }).format(date);
};

/**
 * Format a Date object to YYYY-MM-DD for input[type=date].
 */
export const toDateInputValue = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
