import { NextRequest, NextResponse } from "next/server";
import { MOCK_USERS } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  // Prevent demo login spoofing in production environments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Demo authentication is disabled in production" },
      { status: 403 }
    );
  }

  try {
    const { role } = await req.json();
    const mockUser = MOCK_USERS[role] || MOCK_USERS.seller;

    const response = NextResponse.json({ success: true, user: mockUser });

    response.cookies.set("vt_demo_user", JSON.stringify(mockUser), {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to set demo session" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Demo authentication is disabled in production" },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const role = searchParams.get("role") || "seller";
  const mockUser = MOCK_USERS[role] || MOCK_USERS.seller;

  const redirectUrl = new URL("/dashboard", req.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("vt_demo_user", JSON.stringify(mockUser), {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
