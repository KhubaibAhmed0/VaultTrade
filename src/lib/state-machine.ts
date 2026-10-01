/**
 * Lobby State Machine Definitions and Invariant Enforcement
 * Security Invariant 2: Status transitions are server-enforced and must be valid.
 */

export type LobbyStatus =
  | "open"
  | "awaiting_payment"
  | "awaiting_credentials"
  | "inspecting"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";

export const LOBBY_TRANSITIONS: Record<LobbyStatus, LobbyStatus[]> = {
  open: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["awaiting_credentials", "cancelled"],
  awaiting_credentials: ["inspecting"],
  inspecting: ["completed", "disputed"],
  disputed: ["completed", "refunded"],
  // Terminal states
  completed: [],
  refunded: [],
  cancelled: [],
};

/**
 * Checks if a transition between two lobby statuses is legally allowed.
 */
export function canTransitionLobby(
  currentStatus: LobbyStatus,
  targetStatus: LobbyStatus
): boolean {
  const allowed = LOBBY_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}
