#!/usr/bin/env bash
# ============================================================
#  ESS HR — Odoo Module Test Runner
# ============================================================
#
# Usage:
#   bash run_odoo_tests.sh [options]
#
# Options:
#   --odoo PATH    Path to odoo-bin          (default: /opt/odoo/odoo-bin)
#   --db   NAME    Database name to test on  (default: ess-19)
#   --tags TAGS    Comma-separated test tags to run (default: all ess_* tags)
#   --module MOD   Run only one module: client | admin (default: both)
#   --failfast     Stop on first failure
#   --log-level    Odoo log level            (default: test)
#
# Examples:
#   bash run_odoo_tests.sh
#   bash run_odoo_tests.sh --db ess_test --odoo /home/odoo/odoo-bin
#   bash run_odoo_tests.sh --module client --tags ess_auth,ess_attendance
#   bash run_odoo_tests.sh --module admin
#
# Exit codes:
#   0  All tests passed
#   1  One or more tests failed
#   2  Odoo binary not found
# ============================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
ODOO_BIN="/opt/odoo/odoo-bin"
DB="ess-19"
TAGS=""
MODULE="both"
FAILFAST=""
LOG_LEVEL="test"

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --odoo)      ODOO_BIN="$2"; shift 2 ;;
    --db)        DB="$2";       shift 2 ;;
    --tags)      TAGS="$2";     shift 2 ;;
    --module)    MODULE="$2";   shift 2 ;;
    --failfast)  FAILFAST="--stop-after-init"; shift ;;
    --log-level) LOG_LEVEL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Validate odoo-bin ─────────────────────────────────────────────────────────
if [[ ! -f "$ODOO_BIN" ]]; then
  echo "ERROR: odoo-bin not found at '$ODOO_BIN'"
  echo "       Pass the correct path with: --odoo /path/to/odoo-bin"
  exit 2
fi

# ── Resolve modules and tags ──────────────────────────────────────────────────
case "$MODULE" in
  client)
    MODULES="ess_hr_client"
    DEFAULT_TAGS="ess_auth,ess_employee,ess_attendance,ess_leave,ess_payslip,ess_expense,ess_loans,ess_advance,ess_hr_services,ess_notifications,ess_notes,ess_analytics,ess_team,ess_approvals,ess_tasks,ess_stats,ess_api"
    ;;
  admin)
    MODULES="ess_hr_admin"
    DEFAULT_TAGS="ess_admin,ess_admin_validate,ess_admin_license,ess_admin_server,ess_admin_models"
    ;;
  both|*)
    MODULES="ess_hr_client,ess_hr_admin"
    DEFAULT_TAGS="ess_api,ess_admin"
    ;;
esac

[[ -z "$TAGS" ]] && TAGS="$DEFAULT_TAGS"

# ── Build command ─────────────────────────────────────────────────────────────
CMD=(
  "$ODOO_BIN"
  --database      "$DB"
  --test-enable
  --stop-after-init
  --init          "$MODULES"
  --test-tags     "$TAGS"
  --log-level     "$LOG_LEVEL"
  --log-handler   "odoo.tests:INFO"
  --log-handler   "odoo.addons.ess_hr_client.tests:DEBUG"
  --log-handler   "odoo.addons.ess_hr_admin.tests:DEBUG"
)

[[ -n "$FAILFAST" ]] && CMD+=(--failfast)

# ── Print banner ──────────────────────────────────────────────────────────────
echo "============================================================"
echo "  ESS Odoo Test Runner"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Database : $DB"
echo "  Modules  : $MODULES"
echo "  Tags     : $TAGS"
echo "  odoo-bin : $ODOO_BIN"
echo "============================================================"
echo ""

# ── Run ───────────────────────────────────────────────────────────────────────
"${CMD[@]}"
EXIT_CODE=$?

echo ""
echo "============================================================"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "  RESULT: ALL TESTS PASSED"
else
  echo "  RESULT: TESTS FAILED (exit $EXIT_CODE)"
fi
echo "============================================================"

exit $EXIT_CODE
