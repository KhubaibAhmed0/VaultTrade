import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MOCK_USERS, MOCK_LOBBIES, MOCK_CREDENTIALS, MockUser } from "@/lib/mock-data";

export async function createClient() {
  const cookieStore = await cookies();
  const demoCookie = cookieStore.get("vt_demo_user");
  const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored from Server Components
          }
        },
      },
    }
  );

  // If in demo mode (either demo cookie exists or placeholder URL is configured)
  if (demoCookie?.value || isPlaceholder) {
    let demoUser: MockUser = MOCK_USERS.seller;
    if (demoCookie?.value) {
      try {
        demoUser = JSON.parse(demoCookie.value);
      } catch {
        demoUser = MOCK_USERS.seller;
      }
    }

    return new Proxy(supabase, {
      get(target, prop) {
        if (prop === "auth") {
          return {
            getUser: async () => ({
              data: {
                user: {
                  id: demoUser.id,
                  phone: demoUser.phone,
                  email: `${demoUser.display_name.toLowerCase()}@vaulttrade.local`,
                  user_metadata: { display_name: demoUser.display_name },
                },
              },
              error: null,
            }),
            signOut: async () => {
              cookieStore.delete("vt_demo_user");
              return { error: null };
            },
          };
        }

        if (prop === "from") {
          return (tableName: string) => {
            let targetId: string | null = null;
            let checkExistingActive = false;
            let insertedItem: Record<string, unknown> | null = null;
            let isSingle = false;

            const resolveResult = () => {
              if (checkExistingActive) {
                // When checking for existing active duplicate lobby, return null so creation passes
                return { data: null, error: null };
              }

              if (tableName === "profiles") {
                const found =
                  Object.values(MOCK_USERS).find((u) => u.id === targetId) || demoUser;
                return { data: isSingle ? found : [found], error: null };
              }

              if (tableName === "lobbies") {
                if (insertedItem) {
                  return { data: isSingle ? insertedItem : [insertedItem], error: null };
                }
                const found = MOCK_LOBBIES.find((l) => l.id === targetId);
                if (targetId && isSingle) {
                  return { data: found || MOCK_LOBBIES[0], error: null };
                }
                return { data: isSingle ? (found || MOCK_LOBBIES[0]) : MOCK_LOBBIES, error: null };
              }

              if (tableName === "credentials") {
                return { data: isSingle ? MOCK_CREDENTIALS : [MOCK_CREDENTIALS], error: null };
              }

              if (tableName === "transactions") {
                return { data: isSingle ? null : [], error: null };
              }

              if (tableName === "disputes") {
                return { data: isSingle ? null : [], error: null };
              }

              if (tableName === "handover_protocols") {
                const mockProtocol = {
                  id: "demo-handover-1",
                  lobby_id: targetId || "demo-lobby-1",
                  target_email: "alivalorant_buyer@gmail.com",
                  riot_otp: "749201",
                  otp_requested_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                  otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                  google_unlinked: true,
                  xbox_unlinked: true,
                  psn_unlinked: false,
                  twitch_unlinked: true,
                  status: "otp_relayed",
                  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                };
                return { data: isSingle ? mockProtocol : [mockProtocol], error: null };
              }

              return { data: isSingle ? null : [], error: null };
            };

            const builder: Record<string, unknown> = {
              then(onfulfilled: (res: unknown) => unknown, onrejected: (err: unknown) => unknown) {
                const res = resolveResult();
                return Promise.resolve(res).then(onfulfilled, onrejected);
              },
              select() {
                return builder;
              },
              insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
                const raw = Array.isArray(payload) ? payload[0] : payload;
                if (tableName === "lobbies" && raw) {
                  const newLobby = {
                    id: (raw.id as string) || `lobby-${Date.now().toString(36)}`,
                    riot_id: (raw.riot_id as string) || "Reyna#123",
                    amount: (raw.amount as number) || 5000,
                    platform_fee: (raw.platform_fee as number) || 200,
                    status: (raw.status as string) || "open",
                    release_code_hash: (raw.release_code_hash as string) || "mock-hash",
                    auto_release_at: null,
                    payout_at: null,
                    evidence_deadline: null,
                    seller_id: (raw.seller_id as string) || demoUser.id,
                    buyer_id: null,
                    created_at: new Date().toISOString(),
                    seller: demoUser,
                    buyer: null,
                  };
                  MOCK_LOBBIES.unshift(newLobby);
                  insertedItem = newLobby;
                } else {
                  insertedItem = raw;
                }
                return builder;
              },
              update(payload: Record<string, unknown>) {
                if (tableName === "lobbies" && targetId) {
                  const idx = MOCK_LOBBIES.findIndex((l) => l.id === targetId);
                  if (idx !== -1) {
                    MOCK_LOBBIES[idx] = { ...MOCK_LOBBIES[idx], ...payload };
                  }
                }
                return builder;
              },
              upsert() {
                return builder;
              },
              eq(col: string, val: unknown) {
                if (col === "id" || col === "lobby_id") {
                  targetId = String(val);
                }
                return builder;
              },
              neq() {
                return builder;
              },
              not() {
                checkExistingActive = true;
                return builder;
              },
              or() {
                return builder;
              },
              in() {
                return builder;
              },
              order() {
                return builder;
              },
              single() {
                isSingle = true;
                return builder;
              },
              maybeSingle() {
                isSingle = true;
                return builder;
              },
            };

            return builder;
          };
        }

        const val = Reflect.get(target, prop);
        return typeof val === "function" ? val.bind(target) : val;
      },
    });
  }

  return supabase;
}
