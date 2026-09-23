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
  -v "$ROOT:$ROOT:ro" \
  -p "${PGPORT}:5432" "$IMAGE" >/dev/null

export PGPASSWORD=waffiy
if command -v psql >/dev/null 2>&1; then
  PSQL=(psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d waffiy -v ON_ERROR_STOP=1 --quiet)
else
  # Sur une machine sans client PostgreSQL local, utiliser celui de l'image.
  # Le dépôt est monté au même chemin pour que les appels `-f` restent valides.
  PSQL=(docker exec -i -e PGPASSWORD=waffiy "$CONTAINER" psql -U postgres -d waffiy -v ON_ERROR_STOP=1 --quiet)
fi

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
  [[ "$(basename "$f")" < "20260917120000" ]] || continue
  printf '   %s\n' "$(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done

if [[ -f "$ROOT/supabase/seed.sql" ]]; then
  echo '── Jeu de démonstration'
  "${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null
fi

shopt -s nullglob
tests=("$ROOT"/supabase/tests/10_*.sql)
if (( ${#tests[@]} )); then
  echo '── Tests'
  for f in "${tests[@]}"; do
    printf '   %s\n' "$(basename "$f")"
    "${PSQL[@]}" -f "$f"
  done
fi

# Vérifier la migration d'une base historique puis les règles du solde commun.
echo '── Migration vers les points communs'
for f in "$ROOT"/supabase/migrations/*.sql; do
  [[ "$(basename "$f")" < "20260917120000" ]] && continue
  "${PSQL[@]}" -f "$f" >/dev/null
done
for f in "$ROOT"/supabase/tests/[2-9]*.sql; do
  "${PSQL[@]}" -f "$f"
done

echo
echo 'Suite terminée sans erreur.'
