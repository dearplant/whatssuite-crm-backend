#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:4500/api/v1"

# Get authentication token
echo -e "${YELLOW}=== Authenticating ===${NC}"
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testowner@example.com","password":"Test123!@#"}' | jq -r '.data.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Test 1: POST /api/v1/team/invite - Invite team member
echo -e "${YELLOW}=== Test 1: POST /team/invite ===${NC}"
INVITE_RESPONSE=$(curl -s -X POST $BASE_URL/team/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@example.com",
    "role": "Manager"
  }')
echo "$INVITE_RESPONSE" | jq '.'
if echo "$INVITE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Invite endpoint working${NC}"
  INVITATION_TOKEN=$(echo "$INVITE_RESPONSE" | jq -r '.data.invitation.token')
else
  echo -e "${RED}❌ Invite endpoint failed${NC}"
fi
echo ""

# Test 2: GET /api/v1/team/members - Get team members
echo -e "${YELLOW}=== Test 2: GET /team/members ===${NC}"
MEMBERS_RESPONSE=$(curl -s -X GET "$BASE_URL/team/members" \
  -H "Authorization: Bearer $TOKEN")
echo "$MEMBERS_RESPONSE" | jq '.'
if echo "$MEMBERS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get members endpoint working${NC}"
else
  echo -e "${RED}❌ Get members endpoint failed${NC}"
fi
echo ""

# Test 3: GET /api/v1/team/members with role filter
echo -e "${YELLOW}=== Test 3: GET /team/members?role=Manager ===${NC}"
FILTERED_MEMBERS=$(curl -s -X GET "$BASE_URL/team/members?role=Manager" \
  -H "Authorization: Bearer $TOKEN")
echo "$FILTERED_MEMBERS" | jq '.'
if echo "$FILTERED_MEMBERS" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get members with filter working${NC}"
else
  echo -e "${RED}❌ Get members with filter failed${NC}"
fi
echo ""

# Test 4: POST /api/v1/team/invitations/:token/accept - Accept invitation (need new user)
echo -e "${YELLOW}=== Test 4: POST /team/invitations/:token/accept ===${NC}"
# Register new user
NEW_USER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@example.com",
    "password": "Test123!@#",
    "firstName": "New",
    "lastName": "Member"
  }')
NEW_USER_TOKEN=$(echo "$NEW_USER_RESPONSE" | jq -r '.data.accessToken')

if [ "$NEW_USER_TOKEN" != "null" ] && [ -n "$NEW_USER_TOKEN" ] && [ -n "$INVITATION_TOKEN" ]; then
  ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/team/invitations/$INVITATION_TOKEN/accept" \
    -H "Authorization: Bearer $NEW_USER_TOKEN")
  echo "$ACCEPT_RESPONSE" | jq '.'
  if echo "$ACCEPT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Accept invitation endpoint working${NC}"
    MEMBER_ID=$(echo "$ACCEPT_RESPONSE" | jq -r '.data.member.id')
  else
    echo -e "${RED}❌ Accept invitation endpoint failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping accept invitation test (no invitation token or new user)${NC}"
fi
echo ""

# Test 5: PUT /api/v1/team/members/:id - Update member role
echo -e "${YELLOW}=== Test 5: PUT /team/members/:id ===${NC}"
if [ -n "$MEMBER_ID" ]; then
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/team/members/$MEMBER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role": "Agent"}')
  echo "$UPDATE_RESPONSE" | jq '.'
  if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Update member role endpoint working${NC}"
  else
    echo -e "${RED}❌ Update member role endpoint failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping update role test (no member ID)${NC}"
fi
echo ""

# Test 6: POST /api/v1/team/members/:id/suspend - Suspend member
echo -e "${YELLOW}=== Test 6: POST /team/members/:id/suspend ===${NC}"
if [ -n "$MEMBER_ID" ]; then
  SUSPEND_RESPONSE=$(curl -s -X POST "$BASE_URL/team/members/$MEMBER_ID/suspend" \
    -H "Authorization: Bearer $TOKEN")
  echo "$SUSPEND_RESPONSE" | jq '.'
  if echo "$SUSPEND_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Suspend member endpoint working${NC}"
  else
    echo -e "${RED}❌ Suspend member endpoint failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping suspend test (no member ID)${NC}"
fi
echo ""

# Test 7: POST /api/v1/team/members/:id/reactivate - Reactivate member
echo -e "${YELLOW}=== Test 7: POST /team/members/:id/reactivate ===${NC}"
if [ -n "$MEMBER_ID" ]; then
  REACTIVATE_RESPONSE=$(curl -s -X POST "$BASE_URL/team/members/$MEMBER_ID/reactivate" \
    -H "Authorization: Bearer $TOKEN")
  echo "$REACTIVATE_RESPONSE" | jq '.'
  if echo "$REACTIVATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Reactivate member endpoint working${NC}"
  else
    echo -e "${RED}❌ Reactivate member endpoint failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping reactivate test (no member ID)${NC}"
fi
echo ""

# Test 8: GET /api/v1/team/activity - Get activity logs
echo -e "${YELLOW}=== Test 8: GET /team/activity ===${NC}"
ACTIVITY_RESPONSE=$(curl -s -X GET "$BASE_URL/team/activity" \
  -H "Authorization: Bearer $TOKEN")
echo "$ACTIVITY_RESPONSE" | jq '.'
if echo "$ACTIVITY_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get activity logs endpoint working${NC}"
else
  echo -e "${RED}❌ Get activity logs endpoint failed${NC}"
fi
echo ""

# Test 9: GET /api/v1/team/activity with filters
echo -e "${YELLOW}=== Test 9: GET /team/activity with filters ===${NC}"
FILTERED_ACTIVITY=$(curl -s -X GET "$BASE_URL/team/activity?action=team.member.invited&limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$FILTERED_ACTIVITY" | jq '.'
if echo "$FILTERED_ACTIVITY" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Get filtered activity logs endpoint working${NC}"
else
  echo -e "${RED}❌ Get filtered activity logs endpoint failed${NC}"
fi
echo ""

# Test 10: GET /api/v1/team/activity/export - Export activity logs
echo -e "${YELLOW}=== Test 10: GET /team/activity/export ===${NC}"
EXPORT_RESPONSE=$(curl -s -X GET "$BASE_URL/team/activity/export" \
  -H "Authorization: Bearer $TOKEN")
# Check if response is CSV or JSON
if echo "$EXPORT_RESPONSE" | head -n 1 | grep -q "Timestamp"; then
  echo -e "${GREEN}✅ Export activity logs endpoint working (CSV returned)${NC}"
  echo "First 5 lines of CSV:"
  echo "$EXPORT_RESPONSE" | head -n 5
else
  echo "$EXPORT_RESPONSE" | jq '.'
  if echo "$EXPORT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Export activity logs endpoint working${NC}"
  else
    echo -e "${RED}❌ Export activity logs endpoint failed${NC}"
  fi
fi
echo ""

# Test 11: DELETE /api/v1/team/members/:id - Remove member
echo -e "${YELLOW}=== Test 11: DELETE /team/members/:id ===${NC}"
if [ -n "$MEMBER_ID" ]; then
  DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/team/members/$MEMBER_ID" \
    -H "Authorization: Bearer $TOKEN")
  echo "$DELETE_RESPONSE" | jq '.'
  if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Remove member endpoint working${NC}"
  else
    echo -e "${RED}❌ Remove member endpoint failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping remove member test (no member ID)${NC}"
fi
echo ""

# Error Handling Tests
echo -e "${YELLOW}=== Error Handling Tests ===${NC}"

# Test 12: Invalid email format
echo -e "${YELLOW}Test 12: Invalid email format${NC}"
INVALID_EMAIL=$(curl -s -X POST $BASE_URL/team/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "role": "Manager"}')
echo "$INVALID_EMAIL" | jq '.'
if echo "$INVALID_EMAIL" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Validation error handling working${NC}"
else
  echo -e "${RED}❌ Validation error handling failed${NC}"
fi
echo ""

# Test 13: Invalid role
echo -e "${YELLOW}Test 13: Invalid role${NC}"
INVALID_ROLE=$(curl -s -X POST $BASE_URL/team/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "role": "InvalidRole"}')
echo "$INVALID_ROLE" | jq '.'
if echo "$INVALID_ROLE" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Invalid role error handling working${NC}"
else
  echo -e "${RED}❌ Invalid role error handling failed${NC}"
fi
echo ""

# Test 14: Non-existent member ID
echo -e "${YELLOW}Test 14: Non-existent member ID${NC}"
NONEXISTENT=$(curl -s -X PUT "$BASE_URL/team/members/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "Agent"}')
echo "$NONEXISTENT" | jq '.'
if echo "$NONEXISTENT" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Non-existent member error handling working${NC}"
else
  echo -e "${RED}❌ Non-existent member error handling failed${NC}"
fi
echo ""

# Test 15: Invalid invitation token
echo -e "${YELLOW}Test 15: Invalid invitation token${NC}"
INVALID_TOKEN=$(curl -s -X POST "$BASE_URL/team/invitations/invalid-token-12345/accept" \
  -H "Authorization: Bearer $TOKEN")
echo "$INVALID_TOKEN" | jq '.'
if echo "$INVALID_TOKEN" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Invalid token error handling working${NC}"
else
  echo -e "${RED}❌ Invalid token error handling failed${NC}"
fi
echo ""

echo -e "${YELLOW}=== All Tests Complete ===${NC}"
