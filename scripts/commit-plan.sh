#!/usr/bin/env bash
# Turns the project into a readable history, one feature per commit.
# Usage:  git init -b main  &&  bash scripts/commit-plan.sh
set -e
c() { msg="$1"; shift; git add -- "$@" 2>/dev/null || true; if git diff --cached --quiet; then echo "skipped: $msg"; else git commit -q -m "$msg"; echo "committed: $msg"; fi; }

c "chore: initialize the Express project" package.json package-lock.json .gitignore .env.example
c "feat: add a cached MongoDB connection with indexes" lib/db.js
c "feat: add book validation helpers" lib/validate.js
c "feat: verify JWTs with verifyJWT and optionalJWT middleware" middleware/auth.js
c "feat: add JSON error and not-found handlers" middleware/error.js
c "feat: add the books routes with ownership checks" routes/books.js
c "feat: add borrow routes with copy counting and a double-borrow guard" routes/borrows.js
c "feat: wire up the app with CORS and routers" index.js
c "feat: add a demo seed script" scripts/seed.js
c "chore: add the Vercel configuration" vercel.json
c "docs: write the README and commit helper" README.md scripts/commit-plan.sh
if [ -n "$(git status --porcelain)" ]; then git add -A && git commit -q -m "chore: final touches" && echo "committed: final touches"; fi
echo; git log --oneline | cat; echo; echo "$(git rev-list --count HEAD) commits"
