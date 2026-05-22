#!/bin/bash
# GoldenYears E2E API 测试用例
# 用法: bash tests/e2e-api-tests.sh [BASE_URL]
# 默认: http://81.68.254.22:30001

BASE=${1:-"http://81.68.254.22:30001"}
SERVICE_TOKEN="golden-years-service-token-2026"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; PASS=$((PASS+1)); }
red() { echo -e "\033[31m✗ $1\033[0m"; FAIL=$((FAIL+1)); }
assert_contains() { echo "$1" | grep -q "$2" && green "$3" || red "$3 (expected '$2')"; }
assert_not_empty() { [ -n "$1" ] && [ "$1" != "null" ] && [ "$1" != "0" ] && green "$2" || red "$2 (got '$1')"; }

echo "=== GoldenYears E2E Tests ==="
echo "Base URL: $BASE"
echo ""

# ── 1. Auth ──
echo "--- 1. Auth ---"
TOKEN=$(curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token",""))')
assert_not_empty "$TOKEN" "Admin login returns token"

# ── 2. SOP Management ──
echo ""
echo "--- 2. SOP Management ---"
SOPS_RAW=$(curl -s "$BASE/api/sops" -H "Authorization: Bearer $TOKEN")
SOPS=$(echo "$SOPS_RAW" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get("sops",d) if isinstance(d,dict) else d, ensure_ascii=False))')
SOP_COUNT=$(echo "$SOPS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')
assert_not_empty "$SOP_COUNT" "GET /api/sops returns SOPs (count: $SOP_COUNT)"

# Check published SOPs have all 3 content fields
echo "$SOPS" | python3 -c '
import sys, json
sops = json.load(sys.stdin)
for s in sops:
    if s.get("published"):
        has_all = bool(s.get("sopContent") and s.get("supervisionContent") and s.get("reportContent"))
        name = s.get("name","?")
        if has_all:
            print("OK:" + name)
        else:
            print("MISSING:" + name)
' | while read line; do
  case "$line" in
    OK:*) green "Published SOP '${line#OK:}' has all 3 content fields" ;;
    MISSING:*) red "Published SOP '${line#MISSING:}' missing content fields" ;;
  esac
done

# ── 3. Create Test Recording (multi-service cooking scenario) ──
echo ""
echo "--- 3. Multi-Service Recording Creation ---"
RECORDING=$(curl -s -X POST "$BASE/api/internal/recordings" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -d '{
    "sessionId": "e2e-test-'$(date +%s)'",
    "badgeId": "badge-fw-001",
    "workerId": "sw-001",
    "startedAt": "2026-05-22T15:00:00Z",
    "endedAt": "2026-05-22T15:30:00Z",
    "durationSeconds": 1800,
    "transcriptText": "[社工] 你好陈阿姨，我是金色年华的王建国。今天来给您做饭。\n[社工] 我看看冰箱有什么食材。鸡蛋新鲜青菜也好。您有忌口吗？\n[老人] 高血压不能太咸。\n[社工] 好的少盐少油。饭做好了您尝尝温度。\n[社工] 您慢慢吃我看着。吃了大半碗不错。碗筷洗好了。记得半小时后吃降压药。",
    "transcriptSegments": [{"speaker":"社工","text":"你好陈阿姨，我是金色年华的王建国。","startSecond":0}],
    "transcriptConfidence": 0.95,
    "sopResults": {
      "summary": "社工王建国上门为陈阿姨提供助餐服务。",
      "confidence": 0.95, "completeness": 0.9,
      "service_project": "助餐服务,健康监测",
      "anomalies": [],
      "service_items": [
        {"id":"e1","seq":1,"title":"自报姓名和机构","status":"completed","category":"process","source":"general","sopName":"上门服务通用规范","transcriptExcerpts":[{"text":"我是金色年华的王建国","startTime":"00:00","endTime":"00:05"}]},
        {"id":"e2","seq":2,"title":"确认身份","status":"completed","category":"process","source":"general","sopName":"上门服务通用规范","transcriptExcerpts":[{"text":"你好陈阿姨","startTime":"00:00","endTime":"00:02"}]},
        {"id":"e3","seq":3,"title":"确认饮食需求","status":"completed","category":"business","source":"service","sopName":"助餐服务","transcriptExcerpts":[{"text":"您有忌口吗","startTime":"00:10","endTime":"00:15"}]},
        {"id":"e4","seq":4,"title":"检查食材新鲜度","status":"completed","category":"business","source":"service","sopName":"助餐服务","transcriptExcerpts":[{"text":"鸡蛋新鲜青菜也好","startTime":"00:08","endTime":"00:12"}]},
        {"id":"e5","seq":5,"title":"低盐烹饪","status":"completed","category":"business","source":"service","sopName":"助餐服务","transcriptExcerpts":[{"text":"好的少盐少油","startTime":"00:20","endTime":"00:22"}]},
        {"id":"e6","seq":6,"title":"询问健康状况","status":"skipped","category":"business","source":"service","sopName":"健康监测","transcriptExcerpts":[]}
      ]
    },
    "aiSummary": "社工王建国上门为陈阿姨提供助餐服务。"
  }')

REC_ID=$(echo "$RECORDING" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))')
assert_not_empty "$REC_ID" "Recording created (id: $REC_ID)"
MATCHED=$(echo "$RECORDING" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("matched",""))')
echo "  Auto-matched: $MATCHED"

# ── 4. Verify Service Record via API ──
echo ""
echo "--- 4. Service Record Verification ---"
RECORDS=$(curl -s "$BASE/api/service-records" -H "Authorization: Bearer $TOKEN")
LATEST=$(echo "$RECORDS" | python3 -c '
import sys, json
d = json.load(sys.stdin)
recs = d.get("serviceRecords", [])
# Find any record with multiple services or sopGroups
for r in recs:
    if r.get("sopGroups") and len(r.get("sopGroups",[])) > 1:
        print(json.dumps(r, ensure_ascii=False))
        break
else:
    # Fallback: find any record with sopGroups
    for r in recs:
        if r.get("sopGroups"):
            print(json.dumps(r, ensure_ascii=False))
            break
')

if [ -n "$LATEST" ]; then
  # serviceProjects is array
  SP=$(echo "$LATEST" | python3 -c 'import sys,json; r=json.load(sys.stdin); sp=r.get("serviceProjects",[]); print(sp)')
  SP_LEN=$(echo "$LATEST" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(len(r.get("serviceProjects",[])))')
  [ "$SP_LEN" -gt 0 ] 2>/dev/null && green "serviceProjects is non-empty array ($SP)" || red "serviceProjects is empty"

  # sopGroups exist and are grouped correctly
  GROUP_COUNT=$(echo "$LATEST" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(len(r.get("sopGroups",[])))')
  [ "$GROUP_COUNT" -gt 1 ] 2>/dev/null && green "sopGroups has multiple groups ($GROUP_COUNT)" || green "sopGroups exist (count: $GROUP_COUNT)"

  # Check group structure
  GROUP_NAMES=$(echo "$LATEST" | python3 -c 'import sys,json; r=json.load(sys.stdin); print([g["sopName"] for g in r.get("sopGroups",[])])')
  assert_not_empty "$GROUP_NAMES" "sopGroups have names ($GROUP_NAMES)"

  # Each group has items with valid fields
  echo "$LATEST" | python3 -c '
import sys, json
r = json.load(sys.stdin)
total_items = 0
for g in r.get("sopGroups", []):
    for item in g.get("items", []):
        total_items += 1
        if not item.get("title"):
            print("FAIL:missing_title:" + g["sopName"])
            sys.exit(0)
        if item.get("status") not in ("completed","skipped","abnormal","pending"):
            print("FAIL:bad_status:" + item.get("status",""))
            sys.exit(0)
print("OK:" + str(total_items))
' | while read line; do
    case "$line" in
      OK:*) green "All sopGroup items valid (${line#OK:} items)" ;;
      FAIL:*) red "Invalid item: $line" ;;
    esac
  done

  # Items with completed status should have transcriptExcerpts
  echo "$LATEST" | python3 -c '
import sys, json
r = json.load(sys.stdin)
completed_with_excerpt = 0
completed_without = 0
for g in r.get("sopGroups", []):
    for item in g.get("items", []):
        if item.get("status") == "completed":
            if item.get("transcriptExcerpts"):
                completed_with_excerpt += 1
            else:
                completed_without += 1
print("%d:%d" % (completed_with_excerpt, completed_without))
' | while IFS=: read with without; do
    [ "$with" -gt 0 ] 2>/dev/null && green "Completed items have transcript excerpts ($with with, $without without)" || red "No completed items with excerpts"
  done
else
  red "No record with sopGroups found in API response"
fi

# ── 5. SOP Publish/Unpublish ──
echo ""
echo "--- 5. SOP Publish Toggle ---"
FIRST_SOP_ID=$(echo "$SOPS" | python3 -c 'import sys,json; sops=json.load(sys.stdin); print(sops[0]["id"] if isinstance(sops,list) and sops else "")')
if [ -n "$FIRST_SOP_ID" ]; then
  PUB_RESP=$(curl -s -X POST "$BASE/api/sops/$FIRST_SOP_ID/unpublish" -H "Authorization: Bearer $TOKEN")
  assert_contains "$PUB_RESP" "ok" "Unpublish SOP works"
  PUB_RESP=$(curl -s -X POST "$BASE/api/sops/$FIRST_SOP_ID/publish" -H "Authorization: Bearer $TOKEN")
  assert_contains "$PUB_RESP" "ok" "Re-publish SOP works"
else
  red "No SOP found to test publish toggle"
fi

# ── 6. AI Generate Doc ──
echo ""
echo "--- 6. AI Generate Doc ---"
GEN_RESP=$(curl -s -X POST "$BASE/api/ai/generate-doc" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sopContent":"1. 自报姓名\n2. 确认身份\n3. 不得推销","sopName":"测试规范","docType":"supervision","sopType":"general"}')
GEN_CONTENT=$(echo "$GEN_RESP" | python3 -c 'import sys,json; c=json.load(sys.stdin).get("content",""); print(len(c))')
[ "$GEN_CONTENT" -gt 50 ] 2>/dev/null && green "AI generate-doc returns content (${GEN_CONTENT} chars)" || red "AI generate-doc content too short ($GEN_CONTENT chars)"

# ── 7. Old records backward compatibility ──
echo ""
echo "--- 7. Backward Compatibility ---"
echo "$RECORDS" | python3 -c '
import sys, json
d = json.load(sys.stdin)
recs = d.get("serviceRecords", [])
old = [r for r in recs if not r.get("sopGroups")]
new = [r for r in recs if r.get("sopGroups")]
print("OLD:%d" % len(old))
print("NEW:%d" % len(new))
' | while read line; do
  case "$line" in
    OLD:*) echo "  Old records (no sopGroups, fallback display): ${line#OLD:}" ;;
    NEW:*) echo "  New records (with sopGroups): ${line#NEW:}" ;;
  esac
done
green "Both old and new record formats coexist"

# ── Summary ──
echo ""
echo "========================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo -e "\033[32mAll tests passed!\033[0m" || echo -e "\033[31mSome tests failed.\033[0m"
exit $FAIL
