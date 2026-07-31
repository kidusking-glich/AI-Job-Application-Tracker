/**
 * Telebirr donation phone number shown across the app.
 * Override in production without code changes by setting VITE_TELEBIRR_PHONE
 * in frontend/.env (e.g. VITE_TELEBIRR_PHONE=09XXXXXXXX).
 */
export const TELEBIRR_PHONE: string = import.meta.env.VITE_TELEBIRR_PHONE || '09XX XXX XXX';

export const SUPPORT_MESSAGE =
  'Support this project by sending any amount to the Telebirr number below. የኮንትራት ተንታኙን ለመደገፍ በቴሌብር ማንኛውንም መጠን በዚህ ስልክ ቁጥር ይላኩ።';
