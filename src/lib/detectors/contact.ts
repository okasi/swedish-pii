import { regexDetector } from "../internal/regex";
import type { Detector } from "../types";

/** RFC-5322-ish pragmatic email pattern. */
export const emailAddress: Detector = regexDetector(
  "EMAIL_ADDRESS",
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}\b/g
);

/**
 * Swedish phone numbers: +46 / 0046 / 0 prefix, then 7–10 more digits
 * optionally separated by single spaces or hyphens
 * (e.g. +46701234567, 070-123 45 67, 08-123 456 78).
 */
export const phoneNumber: Detector = regexDetector(
  "PHONE_NUMBER",
  /(?<![\d-])(?:\+46|0046|0)[\s-]?[1-9](?:[\s-]?\d){6,9}(?![\d-])/g
);

/**
 * Social media references: @handles and profile URLs
 * (e.g. @annaandersson, https://instagram.com/annaandersson).
 */
export const socialMedia: Detector = regexDetector(
  "SOCIAL_MEDIA",
  /(?<![\w@.])@[A-Za-z0-9_]{2,30}\b|\bhttps?:\/\/(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[A-Za-z0-9_.-]{1,30})?\b/g
);

export const contactDetectors: Detector[] = [
  emailAddress,
  phoneNumber,
  socialMedia,
];
