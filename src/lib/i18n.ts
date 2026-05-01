import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cs } from "@/locales/cs";
import { en, type LocaleMessages } from "@/locales/en";
import { sk } from "@/locales/sk";

export type Locale = "en" | "cs" | "sk";

const CATALOGS: Record<Locale, LocaleMessages> = { en, cs, sk };

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "cs", label: "Čeština" },
  { code: "sk", label: "Slovenčina" },
];

function detectLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  if (tag === "cs") return "cs";
  if (tag === "sk") return "sk";
  return "en";
}

interface LocaleState {
  locale: Locale;
  // `null` means "use device locale". The setter writes the explicit choice
  // so a later device-locale change is overridden by the user's pick.
  override: Locale | null;
  setLocale: (next: Locale) => void;
  clearOverride: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      override: null,
      setLocale: (next) => set({ locale: next, override: next }),
      clearOverride: () => set({ override: null, locale: detectLocale() }),
    }),
    {
      name: "cleaningorg/locale.v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ---------------- Path-based key lookup ----------------

type Primitive = string | number;

// Builds a union of dot-separated key paths whose leaf is a string. The
// `LocaleMessages` shape is statically known, so `t("home.greeting")` is
// type-checked at compile time and IDEs offer autocomplete.
type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends Record<string, unknown>
      ? LeafPaths<T[K], `${Prefix}${K}.`>
      : never;
}[keyof T & string];

export type MessageKey = LeafPaths<LocaleMessages>;

function resolve(
  catalog: LocaleMessages,
  path: string
): string | undefined {
  const segments = path.split(".");
  let cur: unknown = catalog;
  for (const seg of segments) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === "string" ? cur : undefined;
}

function format(template: string, vars?: Record<string, Primitive>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const v = vars[key];
    return v === undefined ? match : String(v);
  });
}

// ---------------- Hook used in components ----------------

export function useT(): (key: MessageKey, vars?: Record<string, Primitive>) => string {
  const locale = useLocaleStore((s) => s.locale);
  const catalog = CATALOGS[locale];
  return (key, vars) => {
    const msg = resolve(catalog, key) ?? resolve(en, key) ?? key;
    return format(msg, vars);
  };
}

// Read-only export for non-component code paths (e.g. store actions firing
// toasts). Reads the current locale once when called; callers in React
// should prefer `useT` so they re-render on locale change.
export function t(key: MessageKey, vars?: Record<string, Primitive>): string {
  const locale = useLocaleStore.getState().locale;
  const msg = resolve(CATALOGS[locale], key) ?? resolve(en, key) ?? key;
  return format(msg, vars);
}
