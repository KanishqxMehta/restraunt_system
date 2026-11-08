import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

export interface LoyaltySettings {
  earnRupeesPerPoint: number; // ₹ spend to earn 1 point (default: 10)
  redeemPaisePerPoint: number; // paise discount per point redeemed (default: 50 paise = ₹0.50)
  maxRebatePercent: number; // max % of payable total that points can discount (default: 50%)
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  earnRupeesPerPoint: 10,
  redeemPaisePerPoint: 50,
  maxRebatePercent: 50,
};

let inMemorySettings: LoyaltySettings = { ...DEFAULT_LOYALTY_SETTINGS };

const SETTINGS_FILE_PATH = path.join(
  process.cwd(),
  ".gemini",
  "loyalty-settings.json",
);

export function getLoyaltySettingsSync(): LoyaltySettings {
  if (process.env.NODE_ENV === "test") {
    return inMemorySettings;
  }
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const raw = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      inMemorySettings = {
        earnRupeesPerPoint:
          Number(parsed.earnRupeesPerPoint) || DEFAULT_LOYALTY_SETTINGS.earnRupeesPerPoint,
        redeemPaisePerPoint:
          Number(parsed.redeemPaisePerPoint) || DEFAULT_LOYALTY_SETTINGS.redeemPaisePerPoint,
        maxRebatePercent:
          Number(parsed.maxRebatePercent) || DEFAULT_LOYALTY_SETTINGS.maxRebatePercent,
      };
    }
  } catch {
    // Keep in-memory
  }
  return inMemorySettings;
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  if (process.env.NODE_ENV === "test") {
    return inMemorySettings;
  }
  try {
    const raw = await fsp.readFile(SETTINGS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    inMemorySettings = {
      earnRupeesPerPoint:
        Number(parsed.earnRupeesPerPoint) || DEFAULT_LOYALTY_SETTINGS.earnRupeesPerPoint,
      redeemPaisePerPoint:
        Number(parsed.redeemPaisePerPoint) || DEFAULT_LOYALTY_SETTINGS.redeemPaisePerPoint,
      maxRebatePercent:
        Number(parsed.maxRebatePercent) || DEFAULT_LOYALTY_SETTINGS.maxRebatePercent,
    };
  } catch {
    // Keep in-memory
  }
  return inMemorySettings;
}

export async function updateLoyaltySettings(
  patch: Partial<LoyaltySettings>,
): Promise<LoyaltySettings> {
  const current = await getLoyaltySettings();
  const updated: LoyaltySettings = {
    earnRupeesPerPoint: Math.max(
      1,
      Math.min(1000, Number(patch.earnRupeesPerPoint ?? current.earnRupeesPerPoint)),
    ),
    redeemPaisePerPoint: Math.max(
      1,
      Math.min(1000, Number(patch.redeemPaisePerPoint ?? current.redeemPaisePerPoint)),
    ),
    maxRebatePercent: Math.max(
      5,
      Math.min(100, Number(patch.maxRebatePercent ?? current.maxRebatePercent)),
    ),
  };

  inMemorySettings = updated;
  try {
    await fsp.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
    await fsp.writeFile(
      SETTINGS_FILE_PATH,
      JSON.stringify(updated, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.warn("Could not write loyalty-settings.json to disk:", err);
  }
  return updated;
}
