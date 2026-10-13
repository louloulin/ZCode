import type { UiLocale, SupportedLocale } from "@lumos/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { LumosCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, LumosCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, LumosCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getLumosCopy(locale?: UiLocale | string, detected?: string | null): LumosCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
