import type { SystemSettings } from "@/hooks/use-settings";
import countryPresetsJson from "@/data/country-presets.json";

export type CountryPreset = {
  countryCode: string;
  localeRecommendation: string;
  recommendedStack: {
    chat: string;
    delivery: string;
    payment: string;
    tax: string;
  };
  settings: Partial<SystemSettings>;
};
const COUNTRY_PRESET_MAP: Record<string, CountryPreset> = countryPresetsJson as Record<string, CountryPreset>;

export type PresetApplyMode = "smart-merge" | "force-replace";

type ApplyOptions = {
  mode?: PresetApplyMode;
  defaults: SystemSettings;
  forceKeys?: Array<keyof SystemSettings>;
};

export type CountryPresetDiffItem = {
  key: keyof SystemSettings;
  before: SystemSettings[keyof SystemSettings];
  after: SystemSettings[keyof SystemSettings];
};

export function getCountryPreset(countryCode: string) {
  return COUNTRY_PRESET_MAP[countryCode];
}

function isEqualValue(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

export function applyCountryPreset(
  current: SystemSettings,
  countryCode: string,
  options: ApplyOptions
): SystemSettings {
  const preset = getCountryPreset(countryCode);
  if (!preset) {
    return current;
  }

  const mode = options.mode ?? "smart-merge";
  const forceKeys = new Set<keyof SystemSettings>(options.forceKeys ?? ["country", "currency"]);
  const next: SystemSettings = { ...current, country: countryCode };
  const assignSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    next[key] = value;
  };

  for (const key of Object.keys(preset.settings) as Array<keyof SystemSettings>) {
    const presetValue = preset.settings[key];
    if (presetValue === undefined) continue;
    if (forceKeys.has(key)) {
      assignSetting(key, presetValue as SystemSettings[typeof key]);
      continue;
    }
    if (mode === "force-replace") {
      assignSetting(key, presetValue as SystemSettings[typeof key]);
      continue;
    }
    const currentValue = current[key];
    const defaultValue = options.defaults[key];
    if (isEqualValue(currentValue, defaultValue)) {
      assignSetting(key, presetValue as SystemSettings[typeof key]);
    }
  }

  return next;
}

export function getCountryPresetDiff(
  current: SystemSettings,
  countryCode: string,
  options: ApplyOptions
): CountryPresetDiffItem[] {
  const presetApplied = applyCountryPreset(current, countryCode, options);
  const changedKeys = Object.keys(presetApplied).filter((key) => {
    const typedKey = key as keyof SystemSettings;
    return !isEqualValue(current[typedKey], presetApplied[typedKey]);
  }) as Array<keyof SystemSettings>;

  return changedKeys.map((key) => ({
    key,
    before: current[key],
    after: presetApplied[key],
  }));
}
