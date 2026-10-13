# Authentication routes

Place sign-in, password recovery, and invitation acceptance pages in this route
group. Better Auth is configured in `src/infrastructure/auth/`; its catch-all
route lives under `src/app/api/auth/`. Password reset uses Better Auth's
single-use one-hour token and sends through Gmail SMTP when `GMAIL_SMTP_USER`
and `GMAIL_SMTP_APP_PASSWORD` are configured. Reset requests return the same response whether an
account exists or not, and a successful reset revokes active sessions. Manager
invitation acceptance uses a hashed, expiring token
and requires the signed-in account email to match the invited address. Manager
and resident invitations share the acceptance page; a resident invitation is
linked to the exact resident profile and directs the user to that organization's
resident portal. Resending replaces the previous token. If acceptance has no
session, direct the invitee to sign in with the invited email rather than
reporting the link as expired.
