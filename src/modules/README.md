# Business modules

Add a module when its milestone starts; do not pre-create future module
directories. A module owns its domain rules, application use cases, input/output
schemas, repository contract, and business-specific UI/forms. Domain code must
not depend on React, Next.js, Prisma, or external providers.

Application use cases coordinate cross-module workflows through published
contracts. Prisma-backed repository adapters implement module-owned ports.
