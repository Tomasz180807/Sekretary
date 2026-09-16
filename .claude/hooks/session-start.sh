#!/bin/bash
# Stellt markitdown bereit: PDF, docx, pptx, xlsx → Markdown. Gedacht für die
# Facharbeit-Quellen, damit ihr Text zitierbar wird statt als Anhang zu liegen.
#
# Nur für die Web-Sitzungen: lokal installiert Tomasz selbst, und ein Hook, der
# ungefragt auf seinem Rechner installiert, ist übergriffig.
set -uo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

# Ziel von "uv tool install"; nicht in jeder Umgebung von sich aus im PATH.
export PATH="$HOME/.local/bin:$PATH"
[ -n "${CLAUDE_ENV_FILE:-}" ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"

# Schon da? Dann fertig — der Containerzustand wird zwischen Sitzungen gecacht.
command -v markitdown >/dev/null 2>&1 && exit 0

PAKET="markitdown[pdf,docx,pptx,xlsx,outlook]"
if command -v uv >/dev/null 2>&1; then
  uv tool install "$PAKET" >/dev/null 2>&1
else
  pip3 install --user --quiet "$PAKET" >/dev/null 2>&1
fi

# Ein fehlgeschlagener Konverter darf die Sitzung nicht aufhalten: Planen geht
# auch ohne ihn. Deshalb immer 0, aber mit einem Wort, woran man es merkt.
command -v markitdown >/dev/null 2>&1 \
  && echo "markitdown bereit." \
  || echo "markitdown nicht installiert (Netz?) — Planung läuft trotzdem."
exit 0
