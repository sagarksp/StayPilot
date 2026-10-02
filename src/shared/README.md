# Shared code

Only framework-independent, cross-module helpers belong here: common errors,
validation primitives, integer-money helpers, and date/time primitives. Keep
business policy in the module that owns it; avoid turning this into a general
utility bucket.
