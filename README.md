<div align="center">

# ✦ Eventora

**Guest pass management for private events and parties.**

Add guests, track payments, manage check-ins — all in one clean dashboard.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square&logo=vercel)](https://eventora.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## What is Eventora?

Eventora is a lightweight event management tool built for organizers who run private parties, club nights, or invite-only events. Instead of spreadsheets or paper lists, you get a real-time dashboard to register guests, collect payment info, and check people in at the door.

Multiple admins can collaborate on the same event using a shared access code — no invites, no email chains.

---

## Features

- **Google OAuth** — one-click sign in, no passwords
- **Multi-event support** — manage multiple parties from a single account
- **Collaborator system** — share a 6-character code so other admins can join your event workspace
- **Pass types** — define custom tiers with names and prices (e.g. General ₹500, VIP ₹1500)
- **Guest registration** — name, pass type, custom amount, payment method
- **Payment tracking** — Cash or Online; upload a UPI/bank screenshot for online payments
- **Screenshot storage** — payment screenshots stored in Supabase Storage, viewable inline
- **Check-in management** — admit guests with one click; check-in timestamps recorded
- **CSV export** — download the full guest list as a spreadsheet
- **In-app notifications** — toast alerts and confirm dialogs, no browser popups
- **Dark / light theme** — defaults to dark, persisted in localStorage
- **Responsive** — hamburger drawer navigation on mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Styling | Plain CSS with CSS variables |
| Icons | Lucide React |
| Backend / Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth — Google OAuth |
| File Storage | Supabase Storage |
| Deployment | Vercel |

---

## Project Structure

```
Eventora/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── AdminDashboard.jsx   # Main shell — sidebar, tabs, all panels, modals
│   │   ├── Auth.jsx             # Login / sign-in screen
│   │   └── UserProfile.jsx      # Profile edit page
│   ├── supabaseClient.js        # Supabase client initialisation
│   ├── App.jsx                  # Root — session, theme state
│   ├── App.css
│   └── index.css                # All styles (variables, components, responsive)
├── schema.sql                   # Full DB schema + RLS policies
├── vercel.json                  # SPA rewrite rule
└── .env.example                 # Environment variable template
```

---

## Database Schema

All tables have Row Level Security (RLS) enabled. The full schema is in [`schema.sql`](./schema.sql).

### `profiles`
Auto-created on signup via a Postgres trigger on `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | References `auth.users` |
| `name` | TEXT | Display name |
| `email` | TEXT | |
| `avatar_url` | TEXT | Google avatar or DiceBear fallback |

### `parties`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | Event name |
| `date` | DATE | |
| `location` | TEXT | Optional venue |
| `code` | TEXT | Unique 6-char access code |

### `party_admins`
Join table linking users to parties.

| Column | Type | Notes |
|---|---|---|
| `party_id` | UUID | FK → parties |
| `user_id` | UUID | FK → profiles |
| `role` | TEXT | `Organizer` or `Admin` |

### `pass_types`
Custom pass tiers per party.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `party_id` | UUID | FK → parties |
| `name` | TEXT | e.g. "VIP" |
| `price` | NUMERIC | Default price for this tier |

### `passes`
One row per registered guest.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `party_id` | UUID | FK → parties |
| `added_by` | UUID | FK → profiles |
| `name` | TEXT | Guest name |
| `ticket_type` | TEXT | Pass tier name (legacy) |
| `pass_type_id` | UUID | FK → pass_types (nullable) |
| `amount_paid` | NUMERIC | Actual amount collected |
| `payment_method` | TEXT | `cash` or `online` |
| `payment_screenshot_url` | TEXT | Public URL in Supabase Storage |
| `checked_in` | BOOLEAN | |
| `checked_in_at` | TIMESTAMPTZ | Set when admitted |
| `ticket_code` | TEXT | Unique code, e.g. `EVT-A3X9K2` |

### Storage

| Bucket | Visibility | Path pattern |
|---|---|---|
| `payment-screenshots` | Public | `{party_id}/{ticket_code}.{ext}` |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works fine)

### 1. Clone and install

```bash
git clone https://github.com/gautamxgambhir/Eventora.git
cd Eventora
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Both values are in your Supabase project under **Settings → API**.

### 3. Set up the database

Go to your Supabase project → **SQL Editor** and run [`schema.sql`](./schema.sql) in full.

Then run this additional migration for payment tracking and storage:

```sql
-- Payment columns
ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'online')),
  ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Allow authenticated uploads to payment-screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "Allow public read on payment-screenshots"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Allow authenticated delete on payment-screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-screenshots');
```

### 4. Enable Google OAuth

In Supabase: **Authentication → Providers → Google**

- Add your Google OAuth **Client ID** and **Client Secret** (from [Google Cloud Console](https://console.cloud.google.com))
- Add this as an authorised redirect URI in Google Cloud Console:
  ```
  https://your-project-id.supabase.co/auth/v1/callback
  ```

### 5. Run locally

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Deployment on Vercel

1. Push the repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — `vercel.json` handles the SPA routing rewrite automatically

> **Supabase Auth redirect** — after deploying, add your Vercel URL (e.g. `https://eventora.vercel.app`) to **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## How to Use

### Create an event

1. Sign in with Google
2. Click **Create Party** in the sidebar (or hamburger menu on mobile)
3. Enter the event name, date, and venue
4. A unique 6-character access code is generated — share it with your team

### Invite collaborators

Other admins sign in, click **Join with Code**, and enter your access code. They get full access to the party workspace.

### Set up pass types

**Passes tab → Manage Types** — add tiers like "General", "VIP", "Couple" with a default price. These appear as options when registering guests.

### Register a guest

Click **Add Guest** and fill in:

| Field | Notes |
|---|---|
| Name | Guest's full name |
| Pass Type | Select a preset tier or use Custom |
| Amount | Editable — override the tier default if needed |
| Payment Method | **Cash** or **Online** |
| Screenshot | Required for Online — upload UPI/bank transfer proof |

A unique ticket code (`EVT-XXXXXX`) is generated automatically.

### Check in guests at the door

In the guest table, click **Admit Guest** to mark someone as checked in. The exact time is recorded. Click **Cancel Check-in** to undo.

### View payment screenshots

Online payments show a pink **View** badge in the Payment column. Click it to see the screenshot in a lightbox.

### Export data

Click **Export CSV** to download the current filtered guest list as a `.csv` file.

### Leave a party

Sidebar (or hamburger menu) → **Leave Party**. You can rejoin anytime with the access code.

---

## Scripts

```bash
npm run dev       # Start dev server at localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)
