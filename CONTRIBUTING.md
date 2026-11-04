# Contributing

Thank you for considering a contribution to njin admin. Bug reports, fixes, documentation and ideas are all welcome.

## Before you start

- For a bug, search the [issues](https://github.com/njinlabs/njin-admin/issues) first, then open one with the steps to reproduce it.
- For a new feature or a larger change, open an issue to talk it through before you write the code. It saves everyone time.
- The admin works with [njin](https://github.com/njinlabs/njin). A change that needs the server to change too belongs in an issue on that repository as well.

## Setting up

njin admin runs on [Bun](https://bun.sh).

```bash
git clone https://github.com/njinlabs/njin-admin.git
cd njin-admin
bun install
bun run dev
```

Start an njin project on port 3000 for the panel to talk to, then open `http://localhost:5173/_admin/`.

Before you open a pull request, make sure these pass:

```bash
bun test
bun run typecheck
bun run lint
```

## Pull requests

- Branch from `main` and keep the change focused on one thing.
- Add or update tests for the behavior you change.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) style, like the history does (`feat: …`, `fix: …`, `docs: …`). Mark a breaking change with `!` or a `BREAKING CHANGE` note.
- Describe what changed and why in the pull request. For a visual change, add a screenshot.

## Code of conduct

Be respectful and constructive. Harassment or abuse is not tolerated.

## Security

Please do not report security problems in an issue. See the [security policy](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT license](LICENSE).
