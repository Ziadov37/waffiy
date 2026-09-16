#!/usr/bin/env bash
# =============================================================================
# Waffiy — exécution de la suite de tests SQL sur un Postgres jetable
# =============================================================================
# Ne nécessite pas la pile Supabase complète : un conteneur Postgres nu, plus
# l'imitation du schéma auth (00_shim_auth.sql), suffisent à vérifier les
# politiques RLS, les fonctions métier et les sept règles du cahier des charges.
#
# Usage : supabase/tests/run.sh [--keep]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="waffiy-test-db"
IMAGE="postgres:17-alpine"
PGPORT="${WAFFIY_TEST_PORT:-55432}"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

cleanup() { [[ $KEEP -eq 1 ]] || docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=waffiy -e POSTGRES_DB=waffiy \
  -p "${PGPORT}:5432" "$IMAGE" >/dev/null

export PGPASSWORD=waffiy
PSQL=(psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d waffiy -v ON_ERROR_STOP=1 --quiet)

printf 'Démarrage de Postgres'
for _ in $(seq 1 60); do
  if "${PSQL[@]}" -c 'select 1' >/dev/null 2>&1; then break; fi
  printf '.'; sleep 1
done
echo ' prêt.'

echo '── Imitation du schéma auth'
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_shim_auth.sql" >/dev/null

echo '── Migrations'
for f in "$ROOT"/supabase/migrations/*.sql; do
  printf '   %s\n' "$(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done

if [[ -f "$ROOT/supabase/seed.sql" ]]; then
  echo '── Jeu de démonstration'
  "${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
fi

shopt -s nullglob
tests=("$ROOT"/supabase/tests/[1-9]*.sql)
if (( ${#tests[@]} )); then
  echo '── Tests'
  for f in "${tests[@]}"; do
    printf '   %s\n' "$(basename "$f")"
    "${PSQL[@]}" -f "$f"
  done
fi

echo
echo 'Suite terminée sans erreur.'
