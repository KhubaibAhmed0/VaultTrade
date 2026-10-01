/**
 * Mock data for demo & local preview mode (no Supabase setup required).
 */

export interface MockUser {
  id: string;
  display_name: string;
  phone: string;
  facebook_url: string;
  completed_deals: number;
  is_admin: boolean;
}

export interface MockLobby {
  id: string;
  riot_id: string;
  puuid?: string | null;
  account_region?: string | null;
  is_ap_shard?: boolean | null;
  account_rank?: string | null;
  account_level?: number | null;
  snapshot_hash?: string | null;
  amount: number;
  platform_fee: number;
  status: string;
  release_code_hash?: string;
  auto_release_at?: string | null;
  payout_at?: string | null;
  evidence_deadline?: string | null;
  seller_id: string;
  buyer_id?: string | null;
  created_at: string;
  seller: MockUser;
  buyer?: MockUser | null;
}

export const MOCK_USERS: Record<string, MockUser> = {
  seller: {
    id: "user-seller-001",
    display_name: "HamzaTrades_PK",
    phone: "03001234567",
    facebook_url: "https://facebook.com/hamza.trades.pk",
    completed_deals: 14,
    is_admin: false,
  },
  buyer: {
    id: "user-buyer-002",
    display_name: "AliValorant",
    phone: "03219876543",
    facebook_url: "https://facebook.com/ali.val.pk",
    completed_deals: 6,
    is_admin: false,
  },
  admin: {
    id: "user-admin-003",
    display_name: "VaultTrade Admin",
    phone: "03450000000",
    facebook_url: "https://facebook.com/vaulttrade.pk",
    completed_deals: 89,
    is_admin: true,
  },
};

export const MOCK_LOBBIES: MockLobby[] = [
  {
    id: "demo-lobby-1",
    riot_id: "Reyna#KUR",
    puuid: "puuid-d41d8cd98f00b204e9800998ecf8427e",
    account_region: "ap",
    is_ap_shard: true,
    account_rank: "Diamond 3",
    account_level: 142,
    snapshot_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    amount: 14500,
    platform_fee: 200,
    status: "inspecting",
    auto_release_at: new Date(Date.now() + 5 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString(),
    payout_at: null,
    evidence_deadline: null,
    seller_id: "user-seller-001",
    buyer_id: "user-buyer-002",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    seller: MOCK_USERS.seller,
    buyer: MOCK_USERS.buyer,
  },
  {
    id: "demo-lobby-2",
    riot_id: "TenZ#NA1",
    puuid: "puuid-c4ca4238a0b923820dcc509a6f75849b",
    account_region: "na",
    is_ap_shard: false,
    account_rank: "Radiant",
    account_level: 289,
    snapshot_hash: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    amount: 35000,
    platform_fee: 500,
    status: "awaiting_payment",
    auto_release_at: null,
    payout_at: null,
    evidence_deadline: null,
    seller_id: "user-seller-001",
    buyer_id: "user-buyer-002",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    seller: MOCK_USERS.seller,
    buyer: MOCK_USERS.buyer,
  },
  {
    id: "demo-lobby-3",
    riot_id: "ScreaM#EDit",
    puuid: "puuid-c81e728d9d4c2f636f067f89cc14862c",
    account_region: "eu",
    is_ap_shard: false,
    account_rank: "Immortal 1",
    account_level: 210,
    snapshot_hash: "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
    amount: 8000,
    platform_fee: 200,
    status: "completed",
    auto_release_at: null,
    payout_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    evidence_deadline: null,
    seller_id: "user-seller-001",
    buyer_id: "user-buyer-002",
    created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    seller: MOCK_USERS.seller,
    buyer: MOCK_USERS.buyer,
  },
];

export const MOCK_CREDENTIALS = {
  riot_email: "reyna_pk_trader@gmail.com",
  riot_password: "PrimeVandal2026!#",
  first_email: "hamza_original_2021@gmail.com",
  date_of_birth: "14/08/2003",
  social_logins: "Google account unlinked, Riot ID name change available",
  notes: "Includes Prime Vandal (Max level), Reaver Operator, and Champions 2024 Kunai. Peak Diamond 3.",
};

export const MOCK_MESSAGES = [
  {
    id: "msg-1",
    sender_id: "user-seller-001",
    content: "Assalam o Alaikum bro! I have submitted the account details and First Email (FE).",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-2",
    sender_id: "user-buyer-002",
    content: "Walaikum Assalam, checking the skins and changing the email now.",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-3",
    sender_id: "user-buyer-002",
    content: "Everything looks clean. Preparing to release the 4-digit code.",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];
