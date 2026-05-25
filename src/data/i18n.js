/**
 * i18n strings — ported from poc/i18n.js. Full dictionary lives there;
 * this file only ships the common helpers. Add new keys to BOTH ar+en.
 *
 * To translate a number to its spoken word use `tSpoken('key.n', { n: 25 })`
 * which expands 25 → "خمسة وعشرون" / "twenty five".
 */
export { I18N, t, tSpoken } from '../../poc/i18n.js'; // re-export the POC dict during migration
