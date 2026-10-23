import "server-only";

type PlatformAdminIdentity = Readonly<{ email?: string | null; emailVerified?: boolean | null }>;

const platformAdminEmails = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isPlatformAdminIdentity(identity: PlatformAdminIdentity | null | undefined) {
  return Boolean(
    identity?.email &&
    identity.emailVerified === true &&
    platformAdminEmails.has(identity.email.trim().toLowerCase()),
  );
}
