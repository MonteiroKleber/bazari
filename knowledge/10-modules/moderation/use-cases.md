# Moderation Module - Use Cases

## UC-01: Report Malicious Content
1. User sees spam message
2. User clicks "Report"
3. User selects reason and adds description
4. Client requests `POST /api/chat/reports`
5. System creates ChatReport (status: pending)

## UC-02: Vote on Report
1. User sees pending report
2. User reviews evidence
3. User votes approve or reject
4. Client requests `POST /api/chat/reports/:id/vote`
5. System records ChatReportVote

## UC-03: Resolve Report (Auto)
1. Report reaches vote threshold (e.g., 10 approve votes)
2. System automatically updates status → resolved
3. Resolution applied: warning, suspend, or ban
4. Reported user notified

## UC-04: Appeal Ban (Future)
1. Banned user requests review
2. Case escalated to DAO
3. DAO votes on appeal
4. If approved → ban lifted

**Status:** ✅ Implemented (Basic voting, DAO escalation planned)
