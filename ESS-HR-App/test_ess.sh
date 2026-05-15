#!/bin/bash
BASE="http://localhost:8055"
TOKEN="7ro7Zv3GvbtdQUiIPKcVy3hB-JLebNEWHqd-hOfT3B0"
EMP_ID=6
COMP_ID=1
LICENSE="111"
SERVER_URL="ser1"

H_AUTH="Authorization: Bearer $TOKEN"
H_LIC="X-ESS-License-Key: $LICENSE"
H_COMP="X-ESS-Company-ID: $COMP_ID"
H_EMP="X-ESS-Employee-ID: $EMP_ID"
H_MODE="X-ESS-Login-Mode: badge"
H_IDENT="X-ESS-Login-Identifier: 001"
H_SRV="X-ESS-Server-URL: $SERVER_URL"
H_JSON="Content-Type: application/json"

call() {
  local label="$1"
  local method="$2"
  local url="$3"
  local body="$4"

  if [ -n "$body" ]; then
    result=$(curl -s -X "$method" "$BASE$url" \
      -H "$H_AUTH" -H "$H_LIC" -H "$H_COMP" -H "$H_EMP" \
      -H "$H_MODE" -H "$H_IDENT" -H "$H_SRV" -H "$H_JSON" \
      -d "$body" 2>&1)
  else
    result=$(curl -s -X "$method" "$BASE$url" \
      -H "$H_AUTH" -H "$H_LIC" -H "$H_COMP" -H "$H_EMP" \
      -H "$H_MODE" -H "$H_IDENT" -H "$H_SRV" -H "$H_JSON" 2>&1)
  fi

  ok=$(echo "$result" | grep -o '"success": true' || true)
  err=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('error',{}); print(e.get('code','?') + ' | ' + e.get('message','?')[:120])" 2>/dev/null || echo "parse-err")

  echo "### $label"
  echo "  $method $url"
  if [ -n "$ok" ]; then
    preview=$(echo "$result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data')
if isinstance(data, list):
    print(f'[{len(data)} items]  first=' + str(data[0])[:200] if data else '[]')
elif isinstance(data, dict):
    keys=list(data.keys())
    print('keys=' + str(keys[:10]) + '  preview=' + str(data)[:200])
else:
    print(str(data)[:200])
" 2>/dev/null || echo "$result" | head -c 200)
    echo "  OK  | $preview"
  else
    echo "  ERR | $err"
    echo "       RAW: $(echo "$result" | head -c 400)"
  fi
  echo ""
}

echo "============================================================"
echo "  ESS API ENDPOINT TEST  $(date)"
echo "  Server: $BASE  Employee: $EMP_ID  Company: $COMP_ID"
echo "============================================================"
echo ""

echo "## AUTH"
call "validate-license"  POST /ess/api/auth/validate-license  '{"license_key":"111","server_url":"ser1"}'
call "companies"         POST /ess/api/auth/companies          '{"license_key":"111"}'
call "login-badge"       POST /ess/api/auth/login              '{"badge_id":"001","pin":"1234","company_id":1}'
call "refresh"           POST /ess/api/auth/refresh            '{"refresh_token":"la2pQHWpCNQSiJ2q7eOkICWajzD35OlrICwIP-6yVAo"}'
call "by-user"           POST /ess/api/auth/by-user            '{"user_id":2}'
call "reset-pin"         POST /ess/api/auth/reset-pin          '{"employee_id":6,"new_pin":"1234"}'
call "logout"            POST /ess/api/auth/logout             '{}'

echo "## EMPLOYEE"
call "profile"    GET /ess/api/profile          ''
call "contract"   GET /ess/api/profile/contract ''
call "directory"  GET /ess/api/employees        ''

echo "## ATTENDANCE"
call "summary"       GET  /ess/api/attendance/summary       ''
call "check-in"      POST /ess/api/attendance/check-in      '{"employee_id":6,"latitude":30.0,"longitude":31.0}'
call "history"       GET  /ess/api/attendance/history       ''
call "daily-sheet"   GET  /ess/api/attendance/daily-sheet   ''
call "monthly-sheet" GET  /ess/api/attendance/monthly-sheet ''
call "team"          POST /ess/api/attendance/team          '{"employee_id":6}'
call "manual"        POST /ess/api/attendance/manual        '{"employee_id":6,"check_in":"2026-03-28 08:00:00","check_out":"2026-03-28 17:00:00"}'
call "check-out"     POST /ess/api/attendance/check-out     '{"employee_id":6}'

echo "## LEAVE"
call "leave-types"    GET  /ess/api/leave/types         ''
call "leave-balances" GET  /ess/api/leave/balances      ''
call "team-balances"  GET  /ess/api/leave/team-balances ''
call "leave-list"     GET  /ess/api/leave/requests      ''
call "leave-create"   POST /ess/api/leave/requests      '{"employee_id":6,"holiday_status_id":1,"date_from":"2026-04-10","date_to":"2026-04-11","name":"Test"}'
call "leave-get-1"    GET  /ess/api/leave/requests/1    ''
call "leave-approve"  POST /ess/api/leave/approve       '{"leave_id":1}'
call "leave-refuse"   POST /ess/api/leave/refuse        '{"leave_id":1}'
call "leave-reset"    POST /ess/api/leave/reset         '{"leave_id":1}'
call "leave-validate" POST /ess/api/leave/validate      '{"leave_id":1}'

echo "## PAYSLIP"
call "payslip-list"  GET  /ess/api/payslip     ''
call "payslip-get-1" GET  /ess/api/payslip/1   ''
call "payslip-pdf"   POST /ess/api/payslip/pdf '{"payslip_id":1}'

echo "## EXPENSE"
call "categories"     GET  /ess/api/expenses/categories ''
call "currencies"     GET  /ess/api/expenses/currencies ''
call "taxes"          GET  /ess/api/expenses/taxes      ''
call "expense-list"   GET  /ess/api/expenses            ''
call "expense-create" POST /ess/api/expenses            '{"employee_id":6,"name":"Test Expense","product_id":1,"total_amount":100,"currency_id":1}'
call "expense-get-1"  GET  /ess/api/expenses/1          ''
call "expense-submit" POST /ess/api/expenses/submit     '{"expense_id":1}'
call "expense-attach" POST /ess/api/expenses/attach     '{"expense_id":1,"filename":"test.pdf","data":"dGVzdA=="}'

echo "## LOANS"
call "loan-rules"   GET  /ess/api/loans/rules   ''
call "loan-list"    GET  /ess/api/loans          ''
call "loan-create"  POST /ess/api/loans          '{"employee_id":6,"loan_amount":1000,"loan_reason":"Test loan"}'
call "loan-get-1"   GET  /ess/api/loans/1        ''
call "loan-approve" POST /ess/api/loans/approve  '{"loan_id":1}'
call "loan-refuse"  POST /ess/api/loans/refuse   '{"loan_id":1}'

echo "## ADVANCE SALARY"
call "advance-info"    GET  /ess/api/advance-salary/info    ''
call "advance-list"    GET  /ess/api/advance-salary         ''
call "advance-create"  POST /ess/api/advance-salary         '{"employee_id":6,"advance_amount":500}'
call "advance-get-1"   GET  /ess/api/advance-salary/1       ''
call "advance-approve" POST /ess/api/advance-salary/approve '{"advance_id":1}'
call "advance-refuse"  POST /ess/api/advance-salary/refuse  '{"advance_id":1}'
call "advance-reset"   POST /ess/api/advance-salary/reset   '{"advance_id":1}'

echo "## HR LETTERS"
call "letter-list"    GET  /ess/api/hr-letters         ''
call "letter-create"  POST /ess/api/hr-letters         '{"employee_id":6,"letter_type":"experience","purpose":"Job application"}'
call "letter-get-1"   GET  /ess/api/hr-letters/1       ''
call "letter-approve" POST /ess/api/hr-letters/approve '{"letter_id":1}'
call "letter-refuse"  POST /ess/api/hr-letters/refuse  '{"letter_id":1}'
call "letter-reset"   POST /ess/api/hr-letters/reset   '{"letter_id":1}'

echo "## DOCUMENT REQUESTS"
call "doc-types"   GET  /ess/api/document-requests/types   ''
call "doc-list"    GET  /ess/api/document-requests         ''
call "doc-create"  POST /ess/api/document-requests         '{"employee_id":6,"document_type":"Passport","purpose":"Travel"}'
call "doc-get-1"   GET  /ess/api/document-requests/1       ''
call "doc-approve" POST /ess/api/document-requests/approve '{"doc_id":1}'
call "doc-refuse"  POST /ess/api/document-requests/refuse  '{"doc_id":1}'
call "doc-reset"   POST /ess/api/document-requests/reset   '{"doc_id":1}'

echo "## EXPERIENCE CERTIFICATES"
call "cert-list"    GET  /ess/api/experience-certificates         ''
call "cert-create"  POST /ess/api/experience-certificates         '{"employee_id":6,"purpose":"New job"}'
call "cert-get-1"   GET  /ess/api/experience-certificates/1       ''
call "cert-approve" POST /ess/api/experience-certificates/approve '{"cert_id":1}'
call "cert-refuse"  POST /ess/api/experience-certificates/refuse  '{"cert_id":1}'
call "cert-reset"   POST /ess/api/experience-certificates/reset   '{"cert_id":1}'

echo "## BUSINESS SERVICES"
call "biz-types"   GET  /ess/api/business-services/types   ''
call "biz-list"    GET  /ess/api/business-services         ''
call "biz-create"  POST /ess/api/business-services         '{"employee_id":6,"service_type_id":1,"details":"Test"}'
call "biz-get-1"   GET  /ess/api/business-services/1       ''
call "biz-approve" POST /ess/api/business-services/approve '{"service_id":1}'
call "biz-refuse"  POST /ess/api/business-services/refuse  '{"service_id":1}'
call "biz-reset"   POST /ess/api/business-services/reset   '{"service_id":1}'

echo "## TASKS AND TIMESHEETS"
call "task-list"        GET   /ess/api/tasks               ''
call "task-get-1"       GET   /ess/api/tasks/1             ''
call "task-update"      PATCH /ess/api/tasks/1             '{"vals":{"stage_id":1}}'
call "task-attachments" GET   /ess/api/tasks/1/attachments ''
call "timesheet-list"   GET   /ess/api/timesheets          ''
call "timesheet-get-1"  GET   /ess/api/timesheets/1        ''
call "timesheet-daily"  GET   /ess/api/timesheets/daily    ''
call "timesheet-weekly" GET   /ess/api/timesheets/weekly   ''

echo "## TEAM HOURS"
call "team-hours"  GET /ess/api/team-hours ''

echo "## PENDING APPROVALS"
call "pending-list"   GET  /ess/api/pending-approvals          ''
call "pending-action" POST /ess/api/pending-approvals/1/action '{"action":"approve"}'

echo "## NOTIFICATIONS"
call "notif-list"     GET  /ess/api/notifications            ''
call "notif-read-1"   POST /ess/api/notifications/1/read     '{}'
call "notif-read-all" POST /ess/api/notifications/read-all   '{}'

echo "## ANNOUNCEMENTS"
call "announcements" GET /ess/api/announcements ''

echo "## PERSONAL NOTES"
call "notes-list"    GET    /ess/api/personal-notes   ''
call "notes-create"  POST   /ess/api/personal-notes   '{"employee_id":6,"title":"Test Note","body":"Hello world","color":1}'
call "notes-get-1"   GET    /ess/api/personal-notes/1 ''
call "notes-patch-1" PATCH  /ess/api/personal-notes/1 '{"employee_id":6,"vals":{"title":"Updated Title"}}'
call "notes-delete-1" DELETE /ess/api/personal-notes/1 ''

echo "## ANALYTICS"
call "analytics-summary"  GET  /ess/api/analytics                     ''
call "analytics-modules"  POST /ess/api/analytics/module-stats        '{}'
call "analytics-activity" POST /ess/api/analytics/employee-activity   '{}'
call "analytics-hourly"   POST /ess/api/analytics/hourly-distribution '{}'
call "analytics-errors"   POST /ess/api/analytics/error-summary       '{}'
call "analytics-daily"    POST /ess/api/analytics/daily-totals        '{}'

echo "============================================================"
echo "  TEST COMPLETE"
echo "============================================================"
