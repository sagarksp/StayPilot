# Auth module boundary

Owns global identity, sign-in, password recovery, manager and resident invitation activation,
and session-facing application flows. Better Auth provides email/password
sessions and stores global auth identities separately from organization user
records. Invitation activation links the authenticated global identity to an
organization membership only after validating the invited email and single-use
token. After acceptance, the invitee is sent directly to the organization named
in the invitation, so memberships in other organizations do not change the
destination. Resident invitations are bound to one resident profile and create
or attach the organization's resident membership on acceptance. Configure
`APP_URL` to match the browser origin; switching between `localhost` and
`127.0.0.1` loses the host-scoped sign-in cookie. Password reset emails use
Gmail SMTP when configured; reset tokens expire after one hour and password changes
revoke existing sessions. Organization owners can enable or disable owner and manager memberships;
the final active owner is protected inside the membership update transaction.
Resending an invitation replaces its token, so only the most recently issued
link remains valid. Acceptance distinguishes an unauthenticated request from an
unavailable token so invitees are directed to sign in instead of being told the
invitation expired. Manager membership creation and the selected property
assignments are committed in the same transaction; nested assignments inherit
the organization scope from their newly created membership.
