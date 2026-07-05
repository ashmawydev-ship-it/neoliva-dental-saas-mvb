import { getDashboardStats } from "@/app/actions/dashboard";
import { NextResponse } from "next/server";
import { CacheService } from "@/lib/cache/cache-service";

export async function GET() {
  try {
    const data = await CacheService.get(
      ['test-cache-key'],
      async () => {
        return { message: "Hello", date: new Date() };
      },
      ['test-tag'],
      300
    );
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
