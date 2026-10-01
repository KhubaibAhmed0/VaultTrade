import { describe, it, expect } from "vitest";
import { canTransitionLobby } from "./state-machine";

describe("Lobby State Machine", () => {
  it("allows valid forward transitions", () => {
    expect(canTransitionLobby("open", "awaiting_payment")).toBe(true);
    expect(canTransitionLobby("awaiting_payment", "awaiting_credentials")).toBe(true);
    expect(canTransitionLobby("awaiting_credentials", "inspecting")).toBe(true);
    expect(canTransitionLobby("inspecting", "completed")).toBe(true);
    expect(canTransitionLobby("inspecting", "disputed")).toBe(true);
    expect(canTransitionLobby("disputed", "completed")).toBe(true);
    expect(canTransitionLobby("disputed", "refunded")).toBe(true);
  });

  it("allows cancellation from pre-escrow states", () => {
    expect(canTransitionLobby("open", "cancelled")).toBe(true);
    expect(canTransitionLobby("awaiting_payment", "cancelled")).toBe(true);
  });

  it("strictly forbids illegal transitions", () => {
    // Cannot skip payment to inspecting
    expect(canTransitionLobby("open", "inspecting")).toBe(false);
    // Cannot cancel after payment is confirmed
    expect(canTransitionLobby("awaiting_credentials", "cancelled")).toBe(false);
    // Terminal states cannot transition
    expect(canTransitionLobby("completed", "open")).toBe(false);
    expect(canTransitionLobby("completed", "refunded")).toBe(false);
    expect(canTransitionLobby("refunded", "completed")).toBe(false);
    expect(canTransitionLobby("cancelled", "awaiting_payment")).toBe(false);
  });
});
