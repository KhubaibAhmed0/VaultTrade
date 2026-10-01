import { describe, it, expect } from "vitest";
import { sanitizeMessage } from "./sanitize";

describe("sanitizeMessage", () => {
  it("leaves benign gamer chat untouched", () => {
    const input = "Hey bro, let me know when you are ready to trade the Vandal skin.";
    expect(sanitizeMessage(input)).toBe(input);
  });

  it("blocks Pakistani mobile phone numbers in multiple formats", () => {
    expect(sanitizeMessage("Call me on 03001234567")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("My number is +923001234567")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Reach out: 0321-7654321")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Number: 0345 9876543")).toContain("[blocked by VaultTrade]");
  });

  it("blocks email addresses", () => {
    expect(sanitizeMessage("Email me at buyer123@gmail.com please")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Send details to trade@protonmail.com")).toContain("[blocked by VaultTrade]");
  });

  it("blocks external links and URLs", () => {
    expect(sanitizeMessage("Check this link: https://scam-site.com/verify")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Visit www.freeradiantpoints.com now")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Join bit.ly/discord-server")).toContain("[blocked by VaultTrade]");
  });

  it("blocks off-platform communication keywords case-insensitively", () => {
    expect(sanitizeMessage("Let's talk on WhatsApp")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Text me on telegram")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Send money directly via JazzCash")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Pay me on easypaisa")).toContain("[blocked by VaultTrade]");
    expect(sanitizeMessage("Can you DM me on insta?")).toContain("[blocked by VaultTrade]");
  });
});
