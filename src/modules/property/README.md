# Property inventory module

This module defines the first inventory workflows for PG properties, floors,
rooms, and beds. Inputs are validated at the application boundary, and every
repository method carries the organization scope explicitly.

The server must build `OrganizationActor` from a validated session and active
organization membership. Never accept its roles, organization ID, or manager
PG assignments from form data or request JSON. The Prisma repository and route
handlers are added once the authentication adapter and tenant session boundary
are wired.
