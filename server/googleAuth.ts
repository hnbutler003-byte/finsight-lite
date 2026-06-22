import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!CLIENT_ID) throw new Error("Google sign-in is not configured (missing GOOGLE_CLIENT_ID).");
  if (!client) client = new OAuth2Client(CLIENT_ID);
  return client;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  const c = getClient();
  const ticket = await c.verifyIdToken({ idToken, audience: CLIENT_ID! });
  const p = ticket.getPayload();
  if (!p || !p.email || !p.sub) throw new Error("Invalid Google token, missing email or subject.");
  if (!p.email_verified) throw new Error("Your Google email address has not been verified. Please verify it in your Google account and try again.");
  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    name: p.name ?? p.email,
    givenName: p.given_name ?? "",
    familyName: p.family_name ?? "",
    picture: p.picture ?? "",
  };
}

export function googleEnabled(): boolean {
  return Boolean(CLIENT_ID);
}
