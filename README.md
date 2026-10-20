# GeoDev — Autonomous Developer Intelligence CLI

> Run one command and understand the health of your development project.


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

GeoDev is a developer-productivity and repository-intelligence CLI.  
It inspects software projects, diagnoses environment problems, analyzes dependencies, inspects Git state, parses source code with Tree-sitter, and produces clean terminal reports — without requiring an internet connection or an AI service.

---

## Features

- **`geodev doctor`** — Audit your development environment (Node, npm, Git, Docker, Python, Java, ports, env files)
- **`geodev inspect`** — Detect project type, language, framework, package manager, CI/CD, Docker
- **`geodev deps`** — Analyze npm/pnpm/yarn dependencies, lockfiles, and counts
- **`geodev git`** — Branch status, staged/unstaged files, recent commits, contributors, remotes
- **`geodev analyze`** — Full repository intelligence: file counts, LoC, language distribution, structure, issues
- **`geodev init`** — Initialize GeoDev configuration in the current repository

---

## Installation

```bash
npm install -g geodev
```

Or use without installing:

```bash
npx geodev doctor
```

**Requirements:** Node.js ≥ 20

---

## Quick Start

```bash
cd my-project

geodev init       # create .geodev/config.json
geodev doctor     # check environment health
geodev inspect    # understand the project
geodev deps       # analyze dependencies
geodev git        # inspect git state
geodev analyze    # full repository report
```

---

## Commands

| Command | Description |
|---------|-------------|
| `geodev init` | Initialize GeoDev configuration |
| `geodev doctor` | Environment health check |
| `geodev inspect` | Project type/framework/language detection |
| `geodev deps` | Dependency analysis |
| `geodev git` | Git repository status and history |
| `geodev analyze` | Full repository analysis |

### Global Options

| Option | Description |
|--------|-------------|
| `--debug` | Show verbose diagnostic output |
| `--version` | Show version |
| `--help` | Show help |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Detected problems / analysis failure |
| `2` | Invalid CLI usage |

---

## Example Output

```
GeoDev Doctor
────────────────────────────────────

✓ Node.js       v20.20.2
✓ npm           v10.8.2
✓ Git           v2.46.0
✓ Docker        v29.1.5
✓ Python        3.10.9
⚠ Environment   Missing DATABASE_URL
⚠ Port 5000     Already in use

────────────────────────────────────
Project Health: 82/100
```

---

## Architecture

```
geodev/
├── src/
│   ├── cli.ts                  # Entry point & Commander setup
│   ├── commands/               # One file per CLI command
│   ├── analyzers/              # Business logic: analyze project/git/deps/code
│   ├── detectors/              # Detect framework, language, package manager, etc.
│   ├── services/               # process-runner, filesystem, git, environment
│   ├── parsers/tree-sitter/    # Tree-sitter AST parsing (JS/TS V1)
│   ├── output/                 # Terminal, tables, progress UI
│   ├── config/                 # Configuration read/write
│   ├── types/                  # TypeScript interfaces & types
│   └── utils/                  # paths, errors, platform helpers
├── tests/                      # Vitest unit + integration tests
└── docs/                       # VitePress documentation
```

---

## Roadmap

| Version | Focus |
|---------|-------|
| **V1** | CLI + diagnostics + repository analysis (current) |
| **V2** | SQLite + Prisma + historical project intelligence |
| **V3** | Ollama + Groq + AI developer assistant |
| **V4** | Plugin ecosystem + advanced language analysis |

---

## Development

```bash
git clone https://github.com/geodev/geodev.git
cd geodev
npm install
npm run typecheck
npm test
npm run build
```

Running from source:

```bash
npm run dev -- doctor
npm run dev -- inspect
```

---

## Testing

```bash
npm test                # run all tests
npm run test:coverage   # with coverage report
npm run test:watch      # watch mode
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes with descriptive messages
4. Run `npm test` and `npm run typecheck`
5. Open a Pull Request

---

## Security

GeoDev is primarily read-only and does not modify user files.  
All external process execution uses argument arrays, not shell string interpolation.  
See [SECURITY.md](./SECURITY.md) for the full security policy.

---

## License

MIT — See [LICENSE](./LICENSE)
