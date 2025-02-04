import plurals from "./plurals";
import { MessageContext, Language } from "./typeDefs";

const SPACING_RE = /\s{2,}/g;

const translate = (language: Language) => ({
  /*
   * Get the translated string from the translation.json file generated by easygettext.
   *
   * @param {String} msgid - The translation key
   * @param {Number} n - The number to switch between singular and plural
   * @param {String} context - The translation key context
   * @param {String} defaultPlural - The default plural value (optional)
   * @param {String} language - The language ID (e.g. 'fr_FR' or 'en_US')
   *
   * @return {String} The translated string
   */
  getTranslation: function (
    msgid: string,
    n: number | null = 1,
    context: string | null = null,
    defaultPlural: string | null = null,
    languageKey?: string,
  ) {
    if (languageKey === undefined) {
      languageKey = language.current;
    }

    if (!msgid) {
      return ""; // Allow empty strings.
    }

    const silent = languageKey ? language.silent || language.muted.indexOf(languageKey) !== -1 : false;

    // Default untranslated string, singular or plural.
    const untranslated = defaultPlural && plurals.getTranslationIndex(languageKey, n) > 0 ? defaultPlural : msgid;

    // `easygettext`'s `gettext-compile` generates a JSON version of a .po file based on its `Language` field.
    // But in this field, `ll_CC` combinations denoting a language’s main dialect are abbreviated as `ll`,
    // for example `de` is equivalent to `de_DE` (German as spoken in Germany).
    // See the `Language` section in https://www.gnu.org/software/gettext/manual/html_node/Header-Entry.html
    // So try `ll_CC` first, or the `ll` abbreviation which can be three-letter sometimes:
    // https://www.gnu.org/software/gettext/manual/html_node/Language-Codes.html#Language-Codes
    const pluginTranslations = language.translations;
    let translations = pluginTranslations[languageKey] || pluginTranslations[languageKey.split("_")[0]];

    if (!translations) {
      if (!silent) {
        console.warn(`No translations found for ${languageKey}`);
      }
      return untranslated;
    }

    // Currently easygettext trims entries since it needs to output consistent PO translation content
    // even if a web template designer added spaces between lines (which are ignored in HTML or jade,
    // but are significant in text). See #65.
    // Replicate the same behaviour here.
    msgid = msgid.trim();

    let translated = translations[msgid];

    // TODO: comment is outdated, test behavior with current implementation
    // Sometimes `msgid` may not have the same number of spaces than its translation key.
    // This could happen because we use the private attribute `_renderChildren` to access the raw uninterpolated
    // string to translate in the `created` hook of `component.js`: spaces are not exactly the same between the
    // HTML and the content of `_renderChildren`, e.g. 6 spaces becomes 4 etc. See #15, #38.
    // In such cases, we need to compare the translation keys and `msgid` with the same number of spaces.
    if (!translated && SPACING_RE.test(msgid)) {
      Object.keys(translations).some((key) => {
        if (key.replace(SPACING_RE, " ") === msgid.replace(SPACING_RE, " ")) {
          translated = translations[key];
          return translated;
        }
      });
    }

    if (translated && context) {
      translated = (translated as any as MessageContext)[context];
    }

    if (!translated) {
      if (!silent) {
        let msg = `Untranslated ${languageKey} key found: ${msgid}`;
        if (context) {
          msg += ` (with context: ${context})`;
        }
        console.warn(msg);
      }
      return untranslated;
    }

    // Avoid a crash when a msgid exists with and without a context, see #32.
    if (!(translated instanceof Array) && translated.hasOwnProperty("")) {
      // As things currently stand, the void key means a void context for easygettext.
      translated = (translated as any as MessageContext)[""] as any;
    }

    if (typeof translated === "string") {
      translated = [translated];
    }

    let translationIndex = plurals.getTranslationIndex(languageKey, n);

    // Do not assume that the default value of n is 1 for the singular form of all languages.
    // E.g. Arabic, see #69.
    if (translated.length === 1 && n === 1) {
      translationIndex = 0;
    }

    if (!(translated as string[])[translationIndex]) {
      throw new Error(msgid + " " + translationIndex + " " + language.current + " " + n);
    }
    return (translated as string[])[translationIndex];
  },

  /*
   * Returns a string of the translation of the message.
   * Also makes the string discoverable by gettext-extract.
   *
   * @param {String} msgid - The translation key
   *
   * @return {String} The translated string
   */
  gettext: function (msgid: string) {
    return this.getTranslation(msgid);
  },

  /*
   * Returns a string of the translation for the given context.
   * Also makes the string discoverable by gettext-extract.
   *
   * @param {String} context - The context of the string to translate
   * @param {String} msgid - The translation key
   *
   * @return {String} The translated string
   */
  pgettext: function (context: string, msgid: string) {
    return this.getTranslation(msgid, 1, context);
  },

  /*
   * Returns a string of the translation of either the singular or plural,
   * based on the number.
   * Also makes the string discoverable by gettext-extract.
   *
   * @param {String} msgid - The translation key
   * @param {String} plural - The plural form of the translation key
   * @param {Number} n - The number to switch between singular and plural
   *
   * @return {String} The translated string
   */
  ngettext: function (msgid: string, plural: string, n: number) {
    return this.getTranslation(msgid, n, null, plural);
  },

  /*
   * Returns a string of the translation of either the singular or plural,
   * based on the number, for the given context.
   * Also makes the string discoverable by gettext-extract.
   *
   * @param {String} context - The context of the string to translate
   * @param {String} msgid - The translation key
   * @param {String} plural - The plural form of the translation key
   * @param {Number} n - The number to switch between singular and plural
   *
   * @return {String} The translated string
   */
  npgettext: function (context: string, msgid: string, plural: string, n: number) {
    return this.getTranslation(msgid, n, context, plural);
  },
});

export default translate;
