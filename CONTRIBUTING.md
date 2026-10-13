# Contributing

Thanks for taking the time to improve `@ts-76/inertia-hono-jsx`.

This package is experimental and community-scoped. Keep changes small, focused, and easy to review.

## Development

Install dependencies:

```sh
pnpm install
```

Build the package:

```sh
pnpm build
```

The sample app is included for local integration checks. If you change sample behavior, run the
sample project as part of your verification.

## Pull Requests

Before opening a pull request:

- Keep the scope focused on one bug fix, feature, or documentation change.
- Run `pnpm build`.
- Run `pnpm test:ssr`, `pnpm test:typecheck`, and `pnpm test:browser` for adapter changes.
  Install Chromium first with `pnpm exec playwright install chromium`.
- Update documentation when behavior, public APIs, or setup steps change.
- Include a clear summary of the behavior change and the validation you ran.

## Commit Messages

This repository uses release-please, so commit messages should follow Conventional Commits when the
change should appear in release notes:

```text
fix: correct SSR JSX runtime imports
feat: add a new adapter option
docs: clarify SSR limitations
chore: update release workflow
```

Use `fix:` for patches and `feat:` for minor releases. Breaking changes should include a
`BREAKING CHANGE:` footer.

## Releases

Releases are managed by release-please on `main`.

1. Merge normal pull requests into `main`.
2. release-please creates or updates a release pull request with the next version and changelog.
3. Review and merge the release pull request.
4. GitHub Actions builds the package and publishes it to npm using Trusted Publishing.

Do not publish manually unless the automated release workflow is unavailable.
