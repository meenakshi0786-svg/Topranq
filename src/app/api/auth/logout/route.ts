import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ranqapex.com";

export async function GET() {
  const response = NextResponse.redirect(APP_URL);
  response.cookies.set("user_id", "", { maxAge: 0, path: "/" });
  response.cookies.set("logged_in", "", { maxAge: 0, path: "/" });
  return response;
}
