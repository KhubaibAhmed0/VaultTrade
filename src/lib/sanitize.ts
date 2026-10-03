/**
 * Message Sanitizer for VaultTrade
 * Invariant: Prevents out-of-band communication migration (WhatsApp, direct calls, external links).
 */

const BLOCKED_REPLACEMENT = "[blocked by VaultTrade]";

// Pakistani phone regex: 03XX-XXXXXXX, +923XXXXXXXXX, 03XX XXXXXXX, 03XXXXXXXXX
const PK_PHONE_REGEX = /(?:\+?92\s?|0)3[0-9]{2}[\s\-]?[0-9]{7}/gi;

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// URL / Web link regex
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
const SHORT_URL_REGEX = /\b(?:bit\.ly|t\.co|tinyurl\.com|cutt\.ly)\/[^\s]*/gi;

// Keyword blocklist for off-platform evasion
const BLOCKED_KEYWORDS = [
  "whatsapp",
  "waatsap",
  "watsap",
  "watsp",
  "whtsapp",
  "wapp",
  "telegram",
  "signal",
  "jazzcash",
  "easypaisa",
  "zelle",
  "cashapp",
  "text me",
  "call me",
  "dm me",
  "contact me on",
  "message me on",
  "dm kro",
  "call kro",
  "rabta kro",
  "rabta karo",
];

const KEYWORD_REGEX = new RegExp(
  `\\b(${BLOCKED_KEYWORDS.map((k) => k.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "gi"
);

// Regex detecting sequences of 4 or more Roman Urdu spelled-out numbers or mixed digits
const ROMAN_URDU_DIGIT_PATTERN =
  "(?:zero|sifar|shunya|aik|ek|ik|do|dou|teen|tin|chaar|char|panch|paanch|chhay|che|chhe|saat|sat|aath|ath|nau|nou|[0-9])";
const ROMAN_URDU_SEQUENCE_REGEX = new RegExp(
  `(?:\\b${ROMAN_URDU_DIGIT_PATTERN}\\b[\\s,.-]*){4,}`,
  "gi"
);

export function sanitizeMessage(content: string): string {
  if (!content) return "";

  let sanitized = content;

  // 1. Redact phone numbers (numeric & Roman Urdu phonetic digit sequences)
  sanitized = sanitized.replace(PK_PHONE_REGEX, BLOCKED_REPLACEMENT);
  sanitized = sanitized.replace(ROMAN_URDU_SEQUENCE_REGEX, BLOCKED_REPLACEMENT);


  // 2. Redact email addresses
  sanitized = sanitized.replace(EMAIL_REGEX, BLOCKED_REPLACEMENT);

  // 3. Redact URLs
  sanitized = sanitized.replace(URL_REGEX, BLOCKED_REPLACEMENT);
  sanitized = sanitized.replace(SHORT_URL_REGEX, BLOCKED_REPLACEMENT);

  // 4. Redact off-platform keywords
  sanitized = sanitized.replace(KEYWORD_REGEX, BLOCKED_REPLACEMENT);

  return sanitized;
}
