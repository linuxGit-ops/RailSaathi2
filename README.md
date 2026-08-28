# 🚂 RailSaathi — Modern Railway Booking Concept

> **Independent hackathon concept prototype — not affiliated with or endorsed by Indian Railways or IRCTC.**

A failure-resilient, AI-assisted railway reservation prototype that turns ticket booking from a high-speed race into a managed journey. Built for the **Build India Hackathon 2026**.

---

## ✨ What it demonstrates

The current IRCTC experience has five core problems. RailSaathi addresses each one directly:

| Problem | Fix |
|---|---|
| Losing everything on page refresh | **Resumable session token** — reload lands you exactly where you left off (§3.1) |
| "Payment succeeded, booking failed" mystery | **Atomic compare-and-set** + idempotent payments — no double charges, clear outcome (§11, §18.1) |
| Pure speed race — scripts always win | **Virtual waiting room** + Tatkal burst randomization — fair queue, abuse-resistant (§12) |
| Wasted inventory on short journeys | **Segment-aware inventory** — a seat is tracked per journey-leg, not blocked end-to-end (§7–9) |
| Opaque refund deductions | **Itemized per-segment refund breakdown** — exact math shown before cancel (§21.1) |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open in browser
http://localhost:5173
```

---

## 🔑 Demo Accounts

These are shown directly on the login screen — no README hunting required.

| Role | Email | Password |
|---|---|---|
| 👤 Citizen | `demo.user@example.test` | `Demo@1234` |
| 🛠 Admin | `demo.admin@example.test` | `Admin@1234` |

All credentials are synthetic (`.test` domain). No real identity data is used anywhere.

---

## 🗺️ Full Citizen Journey (13 steps)

| Step | What happens | What's real | What's mocked |
|---|---|---|---|
| 1 | Type travel goal in plain language | AI keyword parser → structured goal | No LLM — regex/keyword (labeled) |
| 2 | Search trains | Query against seeded sample dataset | Dataset itself — fictional, labeled |
| 3 | Select train → enter queue | Full queue state machine, session token issued | Scale — virtual users simulated |
| 4 | Wait in virtual room | Live position updates, reload-safe | — |
| 5 | 2-min seat offer | Accept/pass countdown ring, audit log entry | — |
| 6 | 10-min hold | Redis TTL simulation + reconciliation sweep | Redis itself — in-memory |
| 7 | Passenger details | Pre-filled from saved profile | IDs use `DEMO-PAX-XXX` format |
| 8 | OTP verification | Hold preserved through failure + retry | OTP always `000000` (shown on screen) |
| 9 | Payment | Idempotency key enforced, retry-safe | Gateway — fake screen, no real payment |
| 10 | Ticket confirmed | HELD → BOOKED via atomic CAS | PNR is illustrative format |
| 11 | Failure recovery | Inline banner, no full restart | Failure injected via admin panel |
| 12 | Cancel + refund | Per-segment math shown before confirm | Money movement — ledger simulation |
| 13 | Train disruption | Cascade: auto-refund + AI alternative offer | Event triggered via admin panel |

---

## 🛠 Admin Panel

Login with the admin account to get the **demo remote control**:

| Trigger | What it demonstrates |
|---|---|
| 🚨 Fire TrainDisruption | Mass refund cascade → AI proactively offers alternatives (§22) |
| 💳 Force payment failure | Inline recovery banner, hold preserved, retry succeeds (§19) |
| ⏱️ Force payment timeout | Uncertain state → reconciliation resolves without re-paying (§11) |
| 🔓 Expire active holds | Tests the TTL + reconciliation backstop (§10) |
| ⚡ Simulate Tatkal burst | 150 virtual users, lobby + randomized batch release (§12.2) |

The live dashboard also shows real-time holds, queue positions, payments, and the full AI decision audit log.

---

## 📁 Project Structure

```
src/
├── services/              # In-memory backend simulations
│   ├── train-data.ts      # Seeded sample dataset (§31 step 2)
│   ├── hold-service.ts    # TTL hold + reconciliation sweep (§10, §11)
│   ├── queue-service.ts   # Virtual queue + Tatkal burst (§12)
│   ├── matching-engine.ts # WL/RAC seat matching (§15, §17)
│   ├── payment-service.ts # Mock gateway + idempotency (§18.1)
│   ├── booking-session.ts # Resumable session token (§3.1)
│   ├── ai-agent.ts        # NL goal parser + audit log (§14)
│   ├── disruption-service.ts  # Disruption cascade (§22)
│   └── audit-log.ts       # AI decision audit log (§20)
│
├── store/                 # Zustand state
│   ├── booking-store.ts   # Booking state machine (§26)
│   ├── profile-store.ts   # Demo users + passengers (§34.1)
│   └── admin-store.ts     # Admin live view
│
├── components/
│   ├── layout/            # AppShell, ProgressTracker, MockBadge, Footer
│   ├── auth/              # LoginScreen, OtpStep
│   ├── search/            # GoalInput, TrainResults, TrainCard
│   ├── queue/             # WaitingRoom
│   ├── offer/             # SeatOffer (with countdown ring)
│   ├── hold/              # HoldCountdownHeader, PassengerDetails
│   ├── payment/           # PaymentScreen
│   ├── confirmation/      # TicketCard (with refund breakdown)
│   └── admin/             # AdminDashboard, DemoTriggers
│
├── screens/
│   ├── BookingFlow.tsx    # Orchestrates all 13 journey steps
│   └── AdminPage.tsx
│
└── styles/
    ├── tokens.css         # Design system tokens (§33 palette)
    ├── animations.css     # Micro-animations
    ├── global.css         # Reset + utilities
    └── components.css     # All component styles
```

---

## 🎨 Design System

Palette per [§33 of the architecture doc](./SETUP.md):

| Role | Color | Usage |
|---|---|---|
| Primary | Deep indigo `#1e3a5f` | Brand, header, primary UI |
| Accent | Warm amber `#d97706` | CTAs, active states — sparingly |
| Success | Muted teal `#0f766e` | **Confirmed only** — stays meaningful |
| Background | Warm off-white `#f5f3ef` | Never stark white — calmer feel |

Typography: **Inter** for UI · **JetBrains Mono** for PNR/countdown numerals · **Noto Sans Devanagari** for Hindi support.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| State | Zustand |
| Routing | React Router v6 |
| Styling | Vanilla CSS (CSS custom properties) |
| Fonts | Google Fonts (Inter, JetBrains Mono, Noto Sans Devanagari) |
| Backend | None — all services are in-memory TypeScript modules |

---

## ⚖️ Compliance Statement

- **No live government system** is accessed, tested, or interfered with.
- **No real passenger, payment, or identity data** is used anywhere. All demo data is fabricated.
- **No Aadhaar, PAN, UPI, or card details** appear. OTP is always `000000` shown on screen. Payment is a fake screen.
- **No IRCTC/Railways APIs** are called. Dataset is original and clearly labeled "Sample data" in every screen.
- **No government logos** are used. Original branding only.
- Every screen carries a mandatory non-affiliation footer:
  > *"Independent hackathon concept prototype — not affiliated with or endorsed by Indian Railways or IRCTC."*

---

## 📐 Architecture Reference

The full system design is documented in the original design document (Sections 1–34). Key mechanisms:

- **§3.1** — Resumable session token
- **§9** — Atomic multi-row transaction for multi-segment holds
- **§10** — Dual-mechanism hold expiry (event-driven + reconciliation sweep)
- **§11** — Atomic compare-and-set for confirm vs. expire race
- **§12** — Virtual waiting room + Tatkal burst admission + abuse guards
- **§15** — WL/RAC matching engine with terminal deadline
- **§17** — Group booking atomicity (ALL_OR_NOTHING / PARTIAL_WITH_CONSENT)
- **§18.1** — Server-enforced payment idempotency
- **§20** — AI decision audit log
- **§21.1** — Per-segment / per-passenger refund calculation
- **§22** — TrainDisruption event cascade
- **§34.1** — Admin demo remote control

---

*RailSaathi v0.1 · Build What Moves India Hackathon 2026*
