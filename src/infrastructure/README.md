# Infrastructure boundary

Infrastructure adapters implement module ports for Prisma/MySQL, private S3,
transactional email, PDF generation, logging, and Vercel Cron. Adapters may
depend on their provider SDKs; domain and application rules may not.

Keep one server-side Prisma Client entry point under `db/` after the generated
client and MySQL adapter configuration are ready. Repositories are the only
business-layer consumers of that entry point.
