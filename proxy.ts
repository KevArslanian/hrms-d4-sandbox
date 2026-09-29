import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ufjbbwqaztgkqmpdmcyv.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_0GFbshHOM6k80Wxde_iZVQ_v6DpVj1D";

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development" && request.nextUrl.pathname === "/qa-preview") return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  // API routes answer 401 JSON themselves instead of redirecting to the login page.
  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  const isLogin = request.nextUrl.pathname === "/login";
  if (!user && !isLogin) {
    const destination = new URL("/login", request.url);
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach(({ name, value, ...options }) => redirect.cookies.set(name, value, options));
    return redirect;
  }
  if (user && isLogin) {
    const redirect = NextResponse.redirect(new URL("/live", request.url));
    response.cookies.getAll().forEach(({ name, value, ...options }) => redirect.cookies.set(name, value, options));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)"],
};
