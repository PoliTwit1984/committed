import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/env";

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Commit Baseball Admin", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return new NextResponse(
      "ADMIN_PASSWORD_COMMIT is missing. Set it in environment variables.",
      {
        status: 500,
      },
    );
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  const token = header.slice(6);
  let decoded = "";

  try {
    decoded = atob(token);
  } catch {
    return unauthorized();
  }

  const [username, password] = decoded.split(":");
  if (username !== "admin" || password !== adminPassword) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
