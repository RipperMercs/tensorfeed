# Security Policy

TensorFeed and the AFTA (Agent Fair-Trade Agreement) reference implementation take security seriously. This document describes how to report vulnerabilities, what we treat as in scope, and our public commitments.

## Reporting a Vulnerability

Please report security issues privately by email to **security@tensorfeed.ai** before opening a public issue or pull request. We will:

- Acknowledge receipt within 72 hours.
- Confirm whether the report is in scope within 7 days.
- Provide a fix or detailed mitigation timeline within 30 days for HIGH and CRITICAL severity issues.
- Credit you in the eventual disclosure (with your permission).

If a CVE-class issue is being actively exploited, please mark the email subject with `[ACTIVE]` and we will route it to the on-call response team.

For non-security bugs, please open a regular GitHub issue.

## Scope

In scope:

- The TensorFeed Cloudflare Worker at `worker/src/`, particularly the AFTA payment, receipt, and federation core (`payments.ts`, `receipts.ts`, `spend-cap.ts`, `rate-limit.ts`, `routing.ts`).
- The Python SDK at `sdk/python/`.
- The TypeScript / JavaScript SDK at `sdk/javascript/`.
- The MCP server at `mcp-server/`.
- Public TensorFeed-hosted endpoints under `tensorfeed.ai/api/*`.
- Published `tensorfeed` packages on PyPI and npm.

Out of scope:

- Denial-of-service vectors that depend on outsized request volumes from a single client; please report to Cloudflare instead.
- Issues that require a malicious or compromised maintainer (we trust our own commit history; the AFTA core is auditable in git).
- Vulnerabilities in the underlying chain (Base mainnet) or the USDC contract itself.
- Findings that only apply to documentation or marketing pages.

## What We Consider HIGH or CRITICAL

- Signature verification flaws on AFTA receipts.
- Replay attacks on signed receipts, charges, or transaction hashes.
- Cross-network or cross-chain confusion that lets a testnet receipt be redeemed on mainnet (or vice versa).
- Amount or precision tampering that lets an attacker mint credits without paying the equivalent on-chain value.
- No-charge enforcement bypass that bills an agent for an error class AFTA promises is free.
- Spend cap bypass that exceeds an agent's configured daily limit.
- Authentication bypass on receipt verification or reservation consumption.
- Sensitive material (private keys, raw signatures, full receipts) leaked to logs, KV, or external endpoints.

## Public Commitments

- The AFTA payment core (`worker/src/payments.ts`, `worker/src/receipts.ts`, `worker/src/spend-cap.ts`, `worker/src/rate-limit.ts`, `worker/src/routing.ts`) is open source and auditable on `main` at any time.
- All AFTA security patches ship with a `security(afta):` commit prefix and are reviewable in `git log`.
- We welcome pull requests for additional test coverage on the AFTA core. Coverage gaps are tracked in GitHub Issues with the `security` and `tests` labels.
- We invite community red-team submissions on the AFTA codebase. Responsibly disclosed findings that lead to a patch will be credited in the commit message and in the AFTA whitepaper acknowledgments.

## Pre-publication review

Before publishing v1.0 of the AFTA standard, the worker-side reference implementation went through internal code review and AI-assisted multi-model code analysis. Findings identified during this process were patched before the whitepaper went live; the commit history in this repository carries every security-relevant change under the `security(afta):` prefix and is the authoritative record of what was patched and when.

A third-party human security audit will be commissioned when revenue and traffic justify the cost. Audit reports will be published here as they land.

## Supported Versions

The AFTA reference implementation runs on the live worker at `tensorfeed.ai/api/*`. Earlier git revisions of the worker are not supported and may contain known vulnerabilities that have since been patched. Check `git log` for security commits before deploying any fork.

The published SDKs:

- Python `tensorfeed` >= the latest published PyPI release.
- TypeScript `tensorfeed` >= the latest published npm release.

If you are running a fork or older release, please consult the latest `worker/src/payments.ts` to determine whether your deployment carries a known vulnerability.
