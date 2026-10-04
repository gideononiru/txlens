# Contributing to txlens

Thanks for helping improve txlens: a library and CLI that explains Stellar transactions and flags risky operations.

## Getting set up

You'll need:

- Node.js 22 (see `.nvmrc`; `nvm use` picks it up)

```bash
git clone https://github.com/gideononiru/txlens.git
cd txlens
```

The [README](./README.md) explains what the project does, and
[`docs/`](./docs) covers the design in more depth.

## Before opening a pull request

Run the same checks CI runs (`.github/workflows/ci.yml`):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- **Add a test** for any new behavior or bug fix, ideally one that fails
  without your change.
- **Keep pull requests focused** on one logical change.
- **Explain the why** in commit messages, not just the what.
- Reference the issue you're fixing with `Closes #123`.

## Reporting bugs and requesting features

Use the issue templates under **New issue**. For security problems, follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
