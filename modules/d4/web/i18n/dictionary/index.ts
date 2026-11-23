import { competency } from "./competency";
import { daily } from "./daily";
import { dashboard } from "./dashboard";
import { development } from "./development";
import { performance } from "./performance";
import { shared } from "./shared";
import { training } from "./training";
import type { Dictionary } from "./types";

/** One file per feature folder; tests/d4/i18n.test.ts checks that no text is in two of them. */
export const AREAS: Record<string, Dictionary> = { shared, performance, daily, dashboard, development, training, competency };

export const DICTIONARY: Dictionary = Object.assign({}, ...Object.values(AREAS));
