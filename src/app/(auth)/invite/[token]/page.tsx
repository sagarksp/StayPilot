import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { managerInvitationUseCases } from "@/infrastructure/auth/prisma-manager-invitations";
import { InvitationAcceptance } from "@/modules/auth/ui/invitation-acceptance";

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function InvitationPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const [{ token }, session] = await Promise.all([params, auth.api.getSession({ headers: await headers() })]);
  const invitation = await managerInvitationUseCases.getInvitation(token);
  if (!invitation) {
    return <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12"><section className="surface-card w-full p-8"><p className="text-sm font-semibold text-[#176e61]">StayPilot</p><h1 className="mt-4 text-2xl font-semibold">Invitation unavailable</h1><p className="muted mt-3 leading-6">This link may have expired, already been used, or been replaced when the owner resent the invitation. Ask the organization owner for the current link.</p><Link className="mt-5 inline-block font-semibold text-[#176e61] underline" href="/login">Go to sign in</Link></section></main>;
  }

  return <InvitationAcceptance token={token} email={invitation.email} organizationName={invitation.organizationName} propertyNames={invitation.propertyNames} roleCode={invitation.roleCode} residentName={invitation.residentName} signedInEmail={session?.user.email ?? null} />;
}
