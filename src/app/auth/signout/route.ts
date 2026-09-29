import { NextResponse, type NextRequest } from "next/server";
import { DEMO_MODE } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!DEMO_MODE) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
