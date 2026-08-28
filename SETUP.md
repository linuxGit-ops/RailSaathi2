# RailSaathi — Setup & Run Instructions

## Quick Start

**Step 1: Open a terminal in the project folder**
```
cd d:\gitclone\BuildIndiaHackathon
```

**Step 2: Install dependencies**
```
npm install
```

**Step 3: Start the dev server**
```
npm run dev
```

**Step 4: Open in browser**
```
http://localhost:5173
```

---

## Demo Walkthrough (Judge Guide)

### Citizen Journey (13 steps)
1. Login with: `demo.user@example.test` / `Demo@1234`
2. Type or click an example query: *"Howrah to Delhi, 27–30 Sept, 2A, 2 passengers"*
3. AI parses goal → confirms structured fields → Search trains
4. Select a train → enters virtual waiting room
5. Wait ~30s → 2-minute seat offer appears
6. Accept offer → 10-minute hold countdown visible in header
7. Review pre-filled passenger details → Confirm
8. OTP screen → enter `000000` (demo code shown on screen)
9. Payment screen → tap "Pay" (mock gateway)
10. Ticket confirmed → PNR displayed
11. **Failure demo**: Go back to Payment → Admin triggers payment failure → inline banner shows, hold preserved
12. Cancel ticket → per-segment refund breakdown shown
13. **Disruption demo**: Admin fires train cancellation → cascade auto-refund + AI alternative offer

### Admin Panel
1. Login with: `demo.admin@example.test` / `Admin@1234`  
2. Live dashboard shows holds, queue, payments, audit log
3. Demo Triggers:
   - 🚨 **Fire TrainDisruption** → cascades to citizen session
   - 💳 **Force payment failure** → next payment in citizen session fails gracefully
   - ⏱️ **Force payment timeout** → uncertain state → reconciliation resolves
   - 🔓 **Expire active holds** → tests §10 expiry mechanism
   - ⚡ **Simulate Tatkal burst** → 150 virtual users, lobby + random batch release

### Session Resumption Demo
- Mid-booking (e.g., in OTP or payment step): refresh the page
- App re-fetches authoritative state → lands exactly where you left off
- This is the "no more starting over" guarantee (§3.1)

---

## Architecture Quick Reference

| Component | File | Design Doc Section |
|-----------|------|-------------------|
| Resumable session | `src/services/booking-session.ts` | §3.1 |
| Multi-segment hold (atomic) | `src/services/hold-service.ts` | §9, §10, §11 |
| Virtual queue + burst admission | `src/services/queue-service.ts` | §12.1, §12.2, §12.3 |
| WL/RAC matching engine | `src/services/matching-engine.ts` | §15, §15.2, §17 |
| Idempotent payment | `src/services/payment-service.ts` | §18.1, §21.1 |
| AI goal parser | `src/services/ai-agent.ts` | §14 |
| Disruption cascade | `src/services/disruption-service.ts` | §22 |
| Audit log | `src/services/audit-log.ts` | §20 |
| Booking state machine | `src/store/booking-store.ts` | §26 |
| Full booking flow | `src/screens/BookingFlow.tsx` | §31 |
| Admin triggers | `src/components/admin/DemoTriggers.tsx` | §34.1 |
