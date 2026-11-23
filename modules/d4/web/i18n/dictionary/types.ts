/**
 * Key: the text the code showed before the language toggle (English labels, Indonesian help text).
 * Entry: the other language, or both when the key itself is reworded. A missing language shows the key.
 */
export type Entry = { en?: string; id?: string };
export type Dictionary = Record<string, Entry>;
