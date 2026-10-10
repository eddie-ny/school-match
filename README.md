# SchoolMatch (placeholder name) - front end

Vite + React (JavaScript) + Tailwind. The backend is Supabase (hosted online), so there is no
separate server to run. Start the front end with `npm run dev` and it talks to Supabase.

## Setup
1. Copy `.env.example` to `.env` and fill in the Supabase project URL and anon (publishable) key.
2. `npm install` then `npm run dev`.
Never put the service-role key or database password in the front end.

## Connected to Supabase (step 2)
- Signup, login, password reset, email confirmation
- Profile, results and document uploads (private storage bucket)
- Trial, minor flag and access are decided by the database, not the browser

## Still local starter data (until step 5)
- Schools, programs and scholarships, and the admin CSV import (browser only)
- Eligibility runs in the browser for now; step 4 moves it to a server function

## Not built yet
- Payments (step 6), parent confirmation emails, reminders, authenticator 2FA, SMS

## Data
src/data/seed.js holds starter data. Real schools only have name, country, type, city and
website. No cut-offs or fees are invented. Entries marked "demo" are made-up placeholders
so the eligibility engine can be shown working.

## Assumptions to confirm with the client
- Label thresholds (src/lib/constants.js, LABEL_RULES): Strong match = 3+ points better than the
  cut-off, Good chance = up to 2 better or equal, Worth a try = up to 3 worse. The spec gives no
  numbers.
- The spec has no label for "far above the cut-off", so "Long shot" was added.
- Required electives in the spreadsheet have no grade, so only "must have taken it" is checked.
- Plan prices are blank until the client sets them.
