#!/usr/bin/env bash
# =============================================================================
# Waffiy — génération des types TypeScript depuis le schéma Postgres
# =============================================================================
# src/types/database.types.ts n'est JAMAIS écrit à la main. Il est produit ici,
# et un contrôle de dérive échoue si le fichier committé ne correspond plus au
# schéma — c'est ce qui empêche l'application de croire à des colonnes qui
# n'existent plus.
#
#   scripts/generate-types.sh            régénère le fichier
#   scripts/generate-types.sh --check    échoue si le fichier est périmé
#
# Source du schéma, par ordre de préférence :
#   1. SUPABASE_PROJECT_ID  → le projet distant (nécessite supabase login)
#   2. sinon                → une base jetable montée par supabase/tests/run.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/src/types/database.types.ts"
CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

HEADER='// =============================================================================
// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN
// =============================================================================
// Produit par scripts/generate-types.sh à partir des migrations Supabase.
// Toute modification manuelle sera écrasée, et `npm run types:check` échouera.
// Pour faire évoluer ces types : modifier une migration, puis `npm run types:gen`.
'

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "── Schéma distant : projet $SUPABASE_PROJECT_ID"
  npx --yes supabase@latest gen types typescript \
    --project-id "$SUPABASE_PROJECT_ID" --schema public > "$tmp"
else
  echo "── Schéma local : base jetable"
  CONTAINER="waffiy-typegen-db"
  PORT="${WAFFIY_TYPEGEN_PORT:-55433}"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=waffiy -e POSTGRES_DB=waffiy \
    -p "${PORT}:5432" postgres:17-alpine >/dev/null
  trap 'rm -f "$tmp"; docker rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT

  export PGPASSWORD=waffiy
  for _ in $(seq 1 60); do
    psql -h 127.0.0.1 -p "$PORT" -U postgres -d waffiy -c 'select 1' >/dev/null 2>&1 && break
    sleep 1
  done

  psql -h 127.0.0.1 -p "$PORT" -U postgres -d waffiy -v ON_ERROR_STOP=1 --quiet \
    -f "$ROOT/supabase/tests/00_shim_auth.sql" >/dev/null
  for f in "$ROOT"/supabase/migrations/*.sql; do
    psql -h 127.0.0.1 -p "$PORT" -U postgres -d waffiy -v ON_ERROR_STOP=1 --quiet -f "$f" >/dev/null
  done

  npx --yes supabase@latest gen types typescript \
    --db-url "postgresql://postgres:waffiy@127.0.0.1:${PORT}/waffiy" --schema public > "$tmp"
fi

printf '%s\n%s' "$HEADER" "$(cat "$tmp")" > "$tmp.final"

if [[ $CHECK -eq 1 ]]; then
  if ! diff -q "$OUT" "$tmp.final" >/dev/null 2>&1; then
    echo "ÉCHEC : src/types/database.types.ts ne correspond plus au schéma." >&2
    diff "$OUT" "$tmp.final" | head -40 >&2
    exit 1
  fi
  echo "Types à jour."
else
  mv "$tmp.final" "$OUT"
  echo "Types écrits dans src/types/database.types.ts"
fi
