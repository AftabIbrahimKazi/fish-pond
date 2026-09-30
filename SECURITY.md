# Security policy

## Supported versions

Only the latest release on `main` receives fixes.

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| 0.1.x | No |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: [Security advisories, new report](https://github.com/AftabIbrahimKazi/fish-pond/security/advisories/new).

Include what you found, how to reproduce it, and the impact you expect. You can expect an acknowledgement within a few days and a fix or a clear explanation as soon as practical.

## Scope

Fish Pond is a static, client-side site with no backend, accounts or stored user data. The only data kept is optional scene-settings tuning in your own browser's local storage. Relevant issues are therefore mostly about dependencies, the build, or content injection in the rendered pages.

## Hardening already in place

- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
- No inline user input is rendered; JSON-LD is built from constants and escaped.
- No third-party scripts or trackers.
