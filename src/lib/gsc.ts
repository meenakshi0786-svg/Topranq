import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/gsc/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(domainId: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: domainId, // Pass domainId through OAuth state
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export function getAuthenticatedClient(refreshToken: string) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export interface SearchAnalyticsRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function fetchSearchAnalytics(
  refreshToken: string,
  siteUrl: string,
  options: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  }
): Promise<SearchAnalyticsRow[]> {
  const auth = getAuthenticatedClient(refreshToken);
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: options.dimensions || ["query", "page"],
      rowLimit: options.rowLimit || 1000,
      dataState: "final",
    },
  });

  return (response.data.rows || []).map((row) => ({
    query: row.keys?.[0] || "",
    page: row.keys?.[1] || "",
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// Permission levels that can query searchAnalytics. "siteUnverifiedUser" cannot.
const QUERYABLE_PERMISSIONS = new Set(["siteOwner", "siteFullUser", "siteRestrictedUser"]);

export async function fetchSiteList(refreshToken: string): Promise<string[]> {
  const auth = getAuthenticatedClient(refreshToken);
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const response = await searchconsole.sites.list();
  return (response.data.siteEntry || [])
    .filter((site) => site.siteUrl && QUERYABLE_PERMISSIONS.has(site.permissionLevel || ""))
    .map((site) => site.siteUrl!)
    .filter(Boolean);
}
