import { row } from "./lib/rows";
import type { EnvironmentKey, KeyValueRow } from "./types";

export const environments: Record<EnvironmentKey, string> = {
  production: "https://realmofthemadgodhrd.appspot.com",
  testing: "https://rotmghrdtesting.appspot.com",
  currentTesting: "https://rotmgtesting.appspot.com",
  realmTesting2: "https://realmtesting2.appspot.com",
  rotmgTesting3: "https://rotmgtesting3.appspot.com",
  rotmgTesting4: "https://rotmgtesting4.appspot.com",
  rotmgTesting5: "https://rotmgtesting5.appspot.com",
  custom: ""
};

export const environmentOptions: { key: EnvironmentKey; label: string }[] = [
  { key: "production", label: "Production" },
  { key: "testing", label: "Testing" },
  { key: "currentTesting", label: "Current testing" },
  { key: "realmTesting2", label: "Realm testing 2" },
  { key: "rotmgTesting3", label: "RotMG testing 3" },
  { key: "rotmgTesting4", label: "RotMG testing 4" },
  { key: "rotmgTesting5", label: "RotMG testing 5" },
  { key: "custom", label: "Custom" }
];

export const environmentKeys = environmentOptions.map((item) => item.key);

export const choices: Record<string, string[]> = {
  platform: ["standalonewindows64", "standalonewindows", "standaloneosxuniversal"],
  game_net: ["Unity", "rotmg"],
  play_platform: ["Unity"],
  game_net_user_id: ["_empty_"],
  languageType: ["en", "de", "fr", "es", "it", "pt", "ru", "tr"],
  timespan: ["week", "month", "all", "weekly", "monthly"],
  type: ["0", "1", "Unity"],
  /* Invalid = -1, Gold = 0, Fame = 1, GuildFame = 2, FortuneTokens = 3 */
  currency: ["-1", "0", "1", "2", "3"],
  quantity: ["1", "5", "10"],
  version: ["1.0"],
  isAgeVerified: ["1", "0"]
};

export const customEndpointsStorageKey = "rotmg:custom-endpoints";

export const UNITY_HEADERS = {
  "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
  "X-Unity-Version": "2021.3.16f1",
  "Content-Type": "application/x-www-form-urlencoded"
};

export const defaultHeaders: KeyValueRow[] = Object.entries(UNITY_HEADERS).map(([key, value]) => row(key, value));

export const defaultVariables: KeyValueRow[] = [
  row("guid", "", "text"),
  row("password", "", "text"),
  row("accessToken", "", "text"),
  row("clientToken", "auto: MD5(guid + password)", "generated"),
  row("gameClientVersion", "", "text")
];
