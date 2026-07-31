/**
 * GitHub profile of the developer behind this project.
 */
export const GITHUB_URL = 'https://github.com/kidusking-glich';

/**
 * Telebirr donation phone number shown across the app.
 * Override in production without code changes by setting VITE_TELEBIRR_PHONE
 * in frontend/.env (e.g. VITE_TELEBIRR_PHONE=09XXXXXXXX).
 */
export const TELEBIRR_PHONE: string = import.meta.env.VITE_TELEBIRR_PHONE || '09XX XXX XXX';

/** True while the number is still the "09XX XXX XXX" placeholder (not yet configured). */
export const isTelebirrPlaceholder: boolean = /[Xx]/.test(TELEBIRR_PHONE);

export const SUPPORT_MESSAGE =
  'Support this project by sending any amount to the Telebirr number below. የኮንትራት ተንታኙን ለመደገፍ በቴሌብር ማንኛውንም መጠን በዚህ ስልክ ቁጥር ይላኩ።';
