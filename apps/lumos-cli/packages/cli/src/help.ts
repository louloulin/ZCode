import { getLumosCopy, type SupportedLocale, type UiLocale } from "@lumos/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getLumosCopy(locale, detectedLocale).cli.help(version);
}
