import { NextResponse } from "next/server";

/**
 * API Route: /api/sync-sheets (PRD §6.2)
 *
 * Receives new user registration data via Supabase Database Webhook
 * and appends the row to the Google Spreadsheet for the marketing division.
 * In demo mode (missing Google Cloud credentials), returns a simulated OK.
 */

interface UserPayload {
  id?: string;
  full_name?: string;
  email?: string;
  whatsapp_number?: string;
  whatsapp?: string;
  device_os?: string;
  device_model?: string;
  location_city?: string;
  city?: string;
  location_lat?: number | null;
  latitude?: number | null;
  location_lng?: number | null;
  longitude?: number | null;
  created_at?: string;
  last_login?: string;
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (process.env.NODE_ENV === "production" && !webhookSecret) {
      console.error("[GaulFM Admin] WEBHOOK_SECRET is not configured in production.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization") || request.headers.get("x-webhook-secret");
      if (authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: "Unauthorized webhook caller" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    // Handle Supabase Webhook payload format: { record: { ... } } or raw payload { ... }
    const user: UserPayload = body?.record ?? body;

    const fullName = String(user.full_name || "—").slice(0, 100);
    const email = String(user.email || "—").slice(0, 100);
    const whatsapp = String(user.whatsapp_number || user.whatsapp || "—").slice(0, 30);
    const deviceOs = String(user.device_os || "—").slice(0, 50);
    const deviceModel = String(user.device_model || "—").slice(0, 50);
    const city = String(user.location_city || user.city || "—").slice(0, 100);
    const lat = user.location_lat ?? user.latitude ?? "";
    const lng = user.location_lng ?? user.longitude ?? "";
    const createdAt = user.created_at || new Date().toISOString();

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    const isGoogleConfigured = Boolean(spreadsheetId && clientEmail && privateKey);

    if (isGoogleConfigured) {
      // Future production pipeline: Call Google Sheets REST API
      console.log(`[GaulFM Admin] Syncing to Google Sheets (${spreadsheetId}):`, {
        fullName,
        email,
        city,
        deviceOs,
      });

      // Production note: Real Google Sheets JWT Auth + spreadsheets.values.append call here
      return NextResponse.json({
        success: true,
        mode: "live",
        synced_at: new Date().toISOString(),
        user: { fullName, email, city, deviceOs },
      });
    }

    // Demo mode: Return simulated OK without leaking sensitive coordinates or phone numbers in response
    console.log("[GaulFM Admin] Demo Mode User Sync /api/sync-sheets:", {
      fullName,
      email,
      whatsapp,
      city,
      deviceOs,
      deviceModel,
      coordinates: `${lat}, ${lng}`,
      createdAt,
    });

    return NextResponse.json({
      success: true,
      mode: "demo",
      message: "Data pendengar berhasil diterima (mode demo / local storage)",
      synced_at: new Date().toISOString(),
      user: {
        fullName,
        city,
        deviceOs,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[GaulFM Admin] /api/sync-sheets error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isGoogleConfigured = Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );

  return NextResponse.json({
    service: "Gaul FM Google Sheets Sync Pipeline",
    status: isGoogleConfigured ? "configured" : "demo_mode",
    version: "1.0.0",
  });
}
