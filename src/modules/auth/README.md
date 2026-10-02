# Auth module boundary

Owns global identity, sign-in, invitation activation, password reset, and
session-facing application flows. The auth provider is intentionally unselected;
do not add its route handler, schema, or catch-all endpoint until that decision
and the global user-ID mapping are settled.
