#!/usr/bin/env bash
# Verifies the local toolchain matches CLAUDE.md "Verified stack".
ok=1
check() { if command -v "$1" >/dev/null; then echo "✓ $1: $($2)"; else echo "✗ $1 missing — $3"; ok=0; fi; }
check node "node -v" "brew install node (Angular 22 needs ^22.22.3 || ^24.15.0 || >=26)"
check npm  "npm -v"  "comes with Node"
check go   "go version" "brew install go (anthropic-sdk-go needs >= 1.24)"
check git  "git --version" ""
check aidlc "aidlc --version" "curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh ; add ~/.local/bin to PATH"
if command -v node >/dev/null; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  case "$major" in 22|24|26|27|28) ;; *) echo "  ⚠ Node $major may not satisfy Angular 22's engines range";; esac
fi
[ -n "$ANTHROPIC_API_KEY" ] && echo "✓ ANTHROPIC_API_KEY set" || echo "· ANTHROPIC_API_KEY not set (agent will use fallback; fine for Day 1)"
curl -sf -o /dev/null localhost:8090 && echo "✓ FDC3 Sail reachable on :8090" || echo "· FDC3 Sail not running on :8090"
[ -d "$(dirname "$0")/../../FDC3-Sail" ] && echo "✓ FDC3 Sail cloned at ../FDC3-Sail" || echo "· FDC3 Sail not cloned (git clone https://github.com/finos/FDC3-Sail ../FDC3-Sail)"
[ $ok = 1 ] && echo "Toolchain OK" || { echo "Toolchain incomplete"; exit 1; }
