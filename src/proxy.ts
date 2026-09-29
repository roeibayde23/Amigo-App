import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEMO_MODE } from "./lib/env";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Demo mode: no Supabase configured – everything is public and runs on mock data.
  if (DEMO_MODE) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|m4a|wav)$).*)"],
};
