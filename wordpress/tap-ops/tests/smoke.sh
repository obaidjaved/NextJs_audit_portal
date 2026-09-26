#!/usr/bin/env bash
# Smoke test for the tap-ops REST API.
#   BASE_URL=http://127.0.0.1:9400 KEY=test-key-123 bash tests/smoke.sh
# Needs the site to have TAP_API_KEY = $KEY and TAP_ALLOW_DEV_SEED = true (see playground-blueprint.json).
# (The 503 "not_configured" case cannot be exercised here because it needs the constant to be absent.)

BASE_URL="${BASE_URL:-http://127.0.0.1:9400}"
KEY="${KEY:-test-key-123}"
API="$BASE_URL/wp-json/tap/v1"
TMP="$(mktemp)"
PASS=0
FAIL=0
RUN="$(date +%s)$RANDOM"
ADMIN=""
INSP=""

# call METHOD PATH [BODY] [USER_ID] [KEY]   (omit USER/KEY to use ADMIN/KEY; pass "" for none)
call() {
  local m="$1" p="$2" d="${3:-}" u="${4-$ADMIN}" k="${5-$KEY}"
  local args=(-s -o "$TMP" -w '%{http_code}' -X "$m" "$API$p" -H 'Content-Type: application/json')
  [ -n "$k" ] && args+=(-H "X-TAP-Key: $k")
  [ -n "$u" ] && args+=(-H "X-TAP-User: $u")
  [ -n "$d" ] && args+=(--data "$d")
  STATUS="$(curl "${args[@]}")"
  BODY="$(cat "$TMP")"
}

# ok LABEL STATUS [SUBSTRING]   substring must appear in BODY
ok() {
  local label="$1" want="$2" sub="${3:-}"
  if [ "$STATUS" = "$want" ] && { [ -z "$sub" ] || printf '%s' "$BODY" | grep -qF -- "$sub"; }; then
    PASS=$((PASS + 1)); echo "  ok   $label"
  else
    FAIL=$((FAIL + 1)); echo "  FAIL $label (got $STATUS, want $want${sub:+, body containing $sub})"; echo "       $BODY" | cut -c1-300
  fi
}

# nok LABEL SUBSTRING   substring must NOT appear in BODY
nok() {
  if printf '%s' "$BODY" | grep -qF -- "$2"; then
    FAIL=$((FAIL + 1)); echo "  FAIL $1 (body unexpectedly contains $2)"
  else
    PASS=$((PASS + 1)); echo "  ok   $1"
  fi
}

# first numeric "id" in BODY
firstid() { printf '%s' "$BODY" | grep -o '"id":"[0-9]*"' | head -1 | grep -o '[0-9]*'; }
# value of a string/number key (first match)
jstr() { printf '%s' "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | sed 's/^[^:]*:"//; s/"$//'; }

echo "== auth: key handling"
call GET /customers "" "" "";              ok "no key -> 401"            401 '"code":"bad_key"'
call GET /customers "" "$ADMIN" "wrong";   ok "wrong key -> 401"         401 '"code":"bad_key"'

echo "== dev seed (idempotent)"
call POST /dev/seed "" "";  ok "seed" 200 '"ok":true'
call POST /dev/seed "" "";  ok "seed again" 200 '"ok":true'

echo "== login"
call POST /auth/login '{"email":"admin@tapsvs.com","password":"changeme123"}' ""
ok "admin login" 200 '"role":"ADMIN"'; ADMIN="$(firstid)"
call POST /auth/login '{"email":"inspector@tapsvs.com","password":"changeme123"}' ""
ok "inspector login" 200 '"role":"INSPECTOR"'; INSP="$(firstid)"
call POST /auth/login '{"email":"admin@tapsvs.com","password":"nope-nope"}' "";  ok "bad password -> 401" 401 '"code":"bad_credentials"'
call POST /auth/login '{"email":"ghost@tapsvs.com","password":"whatever12"}' "";  ok "unknown user -> 401" 401
call POST /auth/login '{"email":"admin@tapsvs.com"}' "";                          ok "missing password -> 422" 422
nok "error body has only code/message" '"data"'

echo "== acting user checks"
call GET /customers "" "";      ok "no X-TAP-User -> 403" 403 '"code":"forbidden"'
call GET /customers "" "999999"; ok "unknown user -> 403" 403
call GET /customers "" "abc";    ok "non-numeric user -> 403" 403

echo "== users"
call GET /users;  ok "list users" 200 '"auditCount"'
call GET "/users/$ADMIN"; ok "get user" 200 '"email":"admin@tapsvs.com"'
call GET "/users/999999"; ok "get missing user -> 404" 404
EMAIL="smoke$RUN@example.com"
call POST /users "{\"name\":\"Smoke Tester\",\"email\":\"$EMAIL\",\"password\":\"longenough1\",\"role\":\"INSPECTOR\"}"
ok "create user" 200 '"active":true'; NEWU="$(firstid)"
call POST /users "{\"name\":\"Dup\",\"email\":\"$EMAIL\",\"password\":\"longenough1\",\"role\":\"INSPECTOR\"}"; ok "duplicate email -> 409" 409
call POST /users '{"name":"X","email":"x@example.com","password":"short","role":"INSPECTOR"}';                 ok "short password -> 422" 422
call POST /users '{"name":"X","email":"x@example.com","password":"longenough1","role":"BOSS"}';                ok "bad role -> 422" 422
call POST /users '{"name":"X","email":"x@example.com","password":"longenough1","role":"ADMIN"}' "$INSP";      ok "inspector creating user -> 403" 403
call PATCH "/users/$NEWU" '{"role":"ADMIN"}';                 ok "promote to ADMIN" 200 '"role":"ADMIN"'
call PATCH "/users/$ADMIN" '{"active":false}';                ok "self-deactivate -> 422" 422
call PATCH "/users/$ADMIN" '{"role":"INSPECTOR"}';            ok "self-demote -> 422" 422
call PATCH "/users/$NEWU" '{"active":false}';                 ok "deactivate user" 200 '"active":false'
call POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"longenough1\"}" "";  ok "inactive login -> 401" 401
call GET /customers "" "$NEWU";                                ok "inactive acting user -> 403" 403
call PATCH "/users/$NEWU" '{"active":true,"password":"anotherpass1"}'; ok "reactivate + new password" 200 '"active":true'
call POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"anotherpass1\"}" "";  ok "login with new password" 200

echo "== customers"
call POST /customers '{"city":"Austin"}';  ok "missing name -> 422" 422
call POST /customers "{\"name\":\"Smoke Co $RUN\",\"city\":\"Austin\",\"state\":\"TX\",\"email\":\"a@example.com\"}"
ok "create customer" 200 '"createdAt":"'; CUST="$(firstid)"
call GET "/customers/$CUST";  ok "get customer" 200 "\"name\":\"Smoke Co $RUN\""
call PATCH "/customers/$CUST" '{"phone":"555-1234"}';  ok "patch customer" 200 '"phone":"555-1234"'
call GET /customers;  ok "list customers" 200 "Smoke Co $RUN"
call POST /customers '{"name":"Bad Email","email":"nope"}';  ok "bad email -> 422" 422
call POST /customers "{\"name\":\"Temp Co $RUN\"}"; TMPC="$(firstid)"
call DELETE "/customers/$TMPC";  ok "delete unreferenced customer" 200 '"ok":true'
call GET "/customers/$TMPC";     ok "deleted customer -> 404" 404

echo "== templates"
call POST /templates "{\"name\":\"Smoke Tpl $RUN\",\"category\":\"ELECTRICAL\",\"fields\":[{\"id\":\"f1\",\"label\":\"A\",\"type\":\"status\",\"required\":true}],\"approvalRequired\":true,\"reportStyle\":\"CLASSIC\",\"reportAccentColor\":\"#ff0000\"}"
ok "create template" 200 '"approvalRequired":true'; TPL="$(firstid)"
ok "template fields decoded" 200 '"fields":[{'
call POST /templates '{"name":"X","category":"NOPE"}';  ok "bad category -> 422" 422
call PATCH "/templates/$TPL" '{"name":"Smoke Tpl B","reportStyle":"MODERN"}';  ok "patch template" 200 '"reportStyle":"MODERN"'
call GET "/templates/$TPL";  ok "get template" 200 '"name":"Smoke Tpl B"'
call GET /templates;  ok "list templates" 200 'Panel & Breaker Inspection'

echo "== doc numbers"
call POST /doc-numbers '{"category":"SAFETY"}'; A="$(printf '%s' "$BODY" | grep -o '[0-9]*' | head -1)"; ok "doc number" 200 '"seq":'
call POST /doc-numbers '{"category":"SAFETY"}'; B="$(printf '%s' "$BODY" | grep -o '[0-9]*' | head -1)"
if [ "$B" = "$((A + 1))" ]; then PASS=$((PASS + 1)); echo "  ok   sequence increments ($A -> $B)"; else FAIL=$((FAIL + 1)); echo "  FAIL sequence increments ($A -> $B)"; fi
call POST /doc-numbers '{"category":"NOPE"}';  ok "bad category -> 422" 422

echo "== audits"
DOC="SMK-$RUN"
AB="{\"docNumber\":\"$DOC\",\"templateId\":\"$TPL\",\"customerId\":\"$CUST\",\"title\":\"Smoke Audit\",\"score\":85,\"criticalFail\":false,\"draft\":false,\"pendingApproval\":false,\"date\":\"2026-01-15T10:00:00.000Z\",\"responses\":[{\"label\":\"A\",\"type\":\"status\",\"value\":\"pass\"}],\"notes\":\"n1\",\"photos\":[\"p1\"],\"signature\":\"sig-data\"}"
call POST /audits "$AB" "$INSP"
ok "create audit" 200 "\"docNumber\":\"$DOC\""; AUD="$(firstid)"
ok "audit inspector = acting user" 200 "\"inspectorId\":\"$INSP\""
ok "audit embeds customer/template" 200 '"template":{'
ok "audit has ISO date" 200 '"date":"2026-01-15T10:00:00.000Z"'
call POST /audits "$AB";  ok "duplicate doc number -> 409" 409 '"code":"duplicate_doc_number"'
call POST /audits "{\"docNumber\":\"X-$RUN\",\"templateId\":\"999999\",\"customerId\":\"$CUST\",\"title\":\"t\"}";  ok "bad template -> 422" 422
call POST /audits "{\"docNumber\":\"Y-$RUN\",\"templateId\":\"$TPL\",\"customerId\":\"999999\",\"title\":\"t\"}";  ok "bad customer -> 422" 422
call GET "/audits/$AUD";  ok "get audit (full)" 200 '"signature":"sig-data"'
ok "get audit has template fields" 200 '"fields":[{'
call GET "/audits?customerId=$CUST";  ok "list by customer" 200 "\"docNumber\":\"$DOC\""
nok "list omits photos" '"photos"'
nok "list omits signature" '"signature"'
ok "list keeps responses" 200 '"responses"'
call GET "/audits?customerId=$CUST&noResponses=1";  ok "noResponses list" 200 "\"docNumber\":\"$DOC\""
nok "noResponses omits responses" '"responses"'
nok "noResponses omits notes" '"notes"'
call GET "/audits?q=smoke%20audit";  ok "q matches title (case-insens.)" 200 "$DOC"
call GET "/audits?q=$(printf '%s' "$DOC" | tr 'A-Z' 'a-z')";  ok "q matches doc number" 200 "$DOC"
call GET "/audits?q=smoke%20co%20$RUN";  ok "q matches customer name" 200 "$DOC"
call GET "/audits?q=zzzz-no-match-zzzz";  ok "q no match" 200 '[]'
call PATCH "/audits/$AUD" '{"score":40,"criticalFail":true,"notes":"n2","draft":true}';  ok "patch audit" 200 '"criticalFail":true'
ok "patch audit score" 200 '"score":40'
call PATCH "/audits/$AUD" '{"score":500}';  ok "bad score -> 422" 422
call PATCH "/audits/$AUD/share" '{"enabled":true}';  ok "share on" 200 '"shareToken":"'; TOKEN="$(jstr shareToken)"
if [ "${#TOKEN}" = "24" ]; then PASS=$((PASS + 1)); echo "  ok   token is 24 chars"; else FAIL=$((FAIL + 1)); echo "  FAIL token length ${#TOKEN}"; fi
call GET "/audits/by-token/$TOKEN" "" "";  ok "by-token without user" 200 "\"docNumber\":\"$DOC\""
call GET "/audits/by-token/$TOKEN" "" "" "";  ok "by-token still needs key" 401
call GET "/audits/by-token/does-not-exist-123" "" "";  ok "unknown token -> 404" 404
call PATCH "/audits/$AUD/share" '{"enabled":false}';  ok "share off" 200 '"shareToken":null'
call GET "/audits/by-token/$TOKEN" "" "";  ok "revoked token -> 404" 404
call POST "/audits/$AUD/events" '{"message":"Reviewed by smoke"}';  ok "add event" 200 '"userName":"TAP Admin"'
call POST "/audits/$AUD/events" '{"message":""}';  ok "empty event -> 422" 422
call GET "/audits/$AUD/events";  ok "list events" 200 'Reviewed by smoke'

echo "== corrective actions"
call POST /actions "{\"title\":\"Fix panel\",\"customerId\":\"$CUST\",\"auditId\":\"$AUD\",\"priority\":\"HIGH\",\"dueDate\":\"2026-03-01\",\"findingLabel\":\"Panel\"}"
ok "create action" 200 '"dueDate":"2026-03-01"'; ACT="$(firstid)"
ok "action joins names" 200 "\"auditDoc\":\"$DOC\""
call POST /actions "{\"title\":\"x\",\"customerId\":\"$CUST\",\"dueDate\":\"03/01/2026\"}";  ok "bad dueDate -> 422" 422
call POST /actions "{\"title\":\"x\",\"customerId\":\"999999\"}";  ok "bad customer -> 422" 422
call POST /actions "{\"title\":\"x\",\"customerId\":\"$CUST\",\"priority\":\"URGENT\"}";  ok "bad priority -> 422" 422
call GET "/actions?auditId=$AUD";  ok "list by audit" 200 '"title":"Fix panel"'
call PATCH "/actions/$ACT" '{"status":"RESOLVED"}';  ok "resolve action" 200 '"status":"RESOLVED"'
nok "resolvedAt is set" '"resolvedAt":null'
call PATCH "/actions/$ACT" "{\"status\":\"OPEN\",\"assigneeId\":\"$INSP\"}";  ok "reopen + assign" 200 '"resolvedAt":null'
ok "assigneeName filled" 200 '"assigneeName":"Travis Perry"'
call POST /actions/bulk "{\"items\":[{\"title\":\"B1\",\"customerId\":\"$CUST\",\"auditId\":\"$AUD\"},{\"title\":\"B2\",\"customerId\":\"$CUST\",\"priority\":\"LOW\"}]}"
ok "bulk create" 200 '"created":2'
call POST /actions/bulk "{\"items\":[{\"title\":\"OK\",\"customerId\":\"$CUST\"},{\"title\":\"\",\"customerId\":\"$CUST\"}]}"
ok "bulk with bad item -> 422, none created" 422
call GET "/actions?customerId=$CUST"
COUNT="$(printf '%s' "$BODY" | grep -o '"title":"' | wc -l | tr -d ' ')"
if [ "$COUNT" = "3" ]; then PASS=$((PASS + 1)); echo "  ok   3 actions for customer"; else FAIL=$((FAIL + 1)); echo "  FAIL expected 3 actions, got $COUNT"; fi

echo "== referenced deletes"
call DELETE "/customers/$CUST";  ok "customer referenced -> 409" 409 '"code":"referenced"'
call DELETE "/templates/$TPL";   ok "template referenced -> 409" 409 '"code":"referenced"'

echo "== schedules"
call POST /schedules "{\"title\":\"Quarterly smoke\",\"templateId\":\"$TPL\",\"customerId\":\"$CUST\",\"frequency\":\"QUARTERLY\",\"startDate\":\"2026-10-01\"}"
ok "create schedule" 200 '"startDate":"2026-10-01"'; SCH="$(firstid)"
ok "schedule names joined" 200 "\"customerName\":\"Smoke Co $RUN\""
call POST /schedules "{\"title\":\"x\",\"templateId\":\"$TPL\",\"customerId\":\"$CUST\",\"frequency\":\"DAILY\",\"startDate\":\"2026-10-01\"}";  ok "bad frequency -> 422" 422
call POST /schedules "{\"title\":\"x\",\"templateId\":\"$TPL\",\"customerId\":\"$CUST\",\"frequency\":\"WEEKLY\",\"startDate\":\"2026-13-40\"}";  ok "bad startDate -> 422" 422
call PATCH "/schedules/$SCH" '{"active":false}';  ok "pause schedule" 200 '"active":false'
call GET /schedules;  ok "list schedules" 200 'Quarterly smoke'
call DELETE "/templates/$TPL";  ok "template used by schedule -> 409" 409
call DELETE "/schedules/$SCH";  ok "delete schedule" 200 '"ok":true'

echo "== audit delete (admin) cascades"
call DELETE "/audits/$AUD" "" "$INSP";  ok "inspector delete audit -> 403" 403
call DELETE "/audits/$AUD";  ok "admin delete audit" 200 '"ok":true'
call GET "/audits/$AUD";  ok "deleted audit -> 404" 404
call GET "/actions?auditId=$AUD";  ok "audit actions gone" 200 '[]'
call GET "/actions?customerId=$CUST"
for id in $(printf '%s' "$BODY" | grep -o '"id":"[0-9]*"' | grep -o '[0-9]*'); do call DELETE "/actions/$id"; done
call DELETE "/actions/$ACT";  ok "delete missing action -> 404" 404
call DELETE "/customers/$CUST";  ok "customer now deletable" 200 '"ok":true'
call DELETE "/templates/$TPL";   ok "template now deletable" 200 '"ok":true'

echo "== customer requests"
RB="{\"firstName\":\"Jane\",\"lastName\":\"Doe\",\"companyName\":\"Doe Industries $RUN\",\"title\":\"Facilities Manager\",\"street\":\"1 Main St\",\"street2\":\"Suite 5\",\"city\":\"Dallas\",\"state\":\"TX\",\"zip\":\"75001\",\"phone\":\"555-0100\",\"email\":\"jane@example.com\",\"services\":[\"Arc Flash Study\"],\"trainings\":[\"NFPA 70E\"],\"dateNeeded\":\"2026-11-15\",\"additionalInfo\":\"Please call\"}"
call POST /requests "$RB" "";  ok "public intake (no user)" 200 '"status":"PENDING"'; R1="$(firstid)"
ok "intake source default" 200 '"source":"api"'
ok "intake arrays" 200 '"services":["Arc Flash Study"]'
call POST /requests '{"firstName":"Only"}' "";  ok "missing required -> 422" 422
call POST /requests "$RB" "" "";  ok "intake needs key" 401
call POST /requests "$RB" "";  R2="$(firstid)"
call GET /requests;  ok "list requests" 200 "Doe Industries $RUN"
call GET /requests/pending-count;  ok "pending count" 200 '"count":'
call POST "/requests/$R1/approve" "" "$INSP";  ok "inspector approve -> 403" 403
call POST "/requests/$R1/approve";  ok "approve" 200 '"customerId":"'; NC="$(jstr customerId)"
call GET "/customers/$NC";  ok "customer created from request" 200 '"contact":"Jane Doe, Facilities Manager"'
ok "customer site" 200 '"site":"1 Main St, Suite 5"'
call POST "/requests/$R1/approve";  ok "double approve -> 409" 409 '"code":"already_reviewed"'
call POST "/requests/$R1/reject" '{}';  ok "reject approved -> 409" 409
call POST "/requests/$R2/reject" '{"note":"Duplicate lead"}';  ok "reject" 200 '"ok":true'
call POST "/requests/$R2/reject" '{}';  ok "double reject -> 409" 409
call GET /requests;  ok "reviewer recorded" 200 '"reviewedByName":"TAP Admin"'
call DELETE "/customers/$NC";  ok "cleanup customer" 200

echo
echo "passed: $PASS   failed: $FAIL"
rm -f "$TMP"
[ "$FAIL" -eq 0 ]
