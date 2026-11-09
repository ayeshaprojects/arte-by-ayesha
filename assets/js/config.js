/*
 * ====== CONFIGURATION - the ONLY file you edit in the frontend ======
 * API_URL : paste your Google Apps Script Web App URL (ends with /exec).
 *           Leave it empty ('') to preview the site with built-in sample data (DEMO mode).
 */
window.ARTE_CONFIG = {
  API_URL: '',                       // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'
  SAMPLE_DATA: 'assets/data/sample.json',
  CACHE_MINUTES: 5                   // browser-side cache; the server also caches (Code.gs CONFIG.CACHE_SECONDS)
};
