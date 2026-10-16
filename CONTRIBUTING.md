# 🤝 Contributing to PocketCloud

Thank you for your interest in contributing to **PocketCloud**! We welcome contributions from developers, DevOps practitioners, and systems engineers of all experience levels.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or higher (`nvm use 22`)
- **Rust Toolchain**: `v1.80+` (`rustup update stable`)
- **Docker Engine**: Installed and running locally
- **Linux Packages** (Ubuntu/Debian):
  ```bash
  sudo apt update && sudo apt install -y build-essential libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

### 2. Fork & Clone
```bash
git clone https://github.com/<your-username>/PocketCloud.git
cd PocketCloud
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run in Development Mode
```bash
npm run tauri dev
```
This runs the Vite dev server on port `1420` and compiles the Rust backend binary with live reloading.

---

## 🎯 How to Contribute

### 1. Pick an Issue
Look for open issues labeled:
- [`good first issue`](https://github.com/IamFreak10/PocketCloud/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — Great for beginners or quick wins.
- [`help wanted`](https://github.com/IamFreak10/PocketCloud/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) — Priority items where community expertise is needed.
- See our curated [ROADMAP_AND_ISSUES.md](ROADMAP_AND_ISSUES.md) for detailed blueprints.

### 2. Create a Feature Branch
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Follow Code Guidelines
- **Rust**:
  - Run `cargo check --manifest-path src-tauri/Cargo.toml`
  - Run `cargo fmt` to adhere to standard Rust formatting.
- **TypeScript & React**:
  - Run `npm run build` to verify type safety and bundler compilation.
  - Maintain clean Tailwind CSS styling and keep components modular.

### 4. Commit Message Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(...)`: A new feature
- `fix(...)`: A bug fix
- `docs(...)`: Documentation changes
- `refactor(...)`: Code change that neither fixes a bug nor adds a feature
- `perf(...)`: A code change that improves performance

### 5. Submit a Pull Request
1. Push your branch:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against `master` on GitHub.
3. Fill out the PR template with details of what was changed and verified.

---

## 💬 Community & Questions
Have questions, suggestions, or need help getting started?
- Open a discussion or an issue on GitHub.
- Reach out to [@IamFreak10](https://github.com/IamFreak10).
