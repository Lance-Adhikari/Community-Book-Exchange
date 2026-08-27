# Next.js and Supabase Auth foundation review

## Scope and status

This checkpoint initializes a modern Next.js application at the repository root while the approved legacy application remains in place for comparison. It does not create or modify database objects, Storage buckets, Auth users, legacy data, or Vercel resources.

The Supabase project `community-book-exchange` (`tatntocqnrdmgjxmfsnl`) was confirmed read-only as `ACTIVE_HEALTHY` in `ca-central-1`. The Auth user count remains zero.

## Runtime and framework versions

- Node.js: 24.18.0
- npm and npx: 11.16.0
- Next.js: 16.3.0
- React and React DOM: 19.2.8
- TypeScript: 5.9.3
- ESLint: 9.39.5
- `@supabase/supabase-js`: 2.112.2
- `@supabase/ssr`: 0.12.4

The repository uses npm, TypeScript, ESLint, the App Router, a `src` directory, and the `@/*` import alias. Tailwind CSS, React Compiler, and additional UI or authentication frameworks were intentionally omitted.

## Application structure

- `src/app` contains the root layout, homepage, authentication routes, protected dashboard placeholder, callback route, and route-level states.
- `src/components` contains the shared site header and reusable authentication presentation and form components.
- `src/lib/env.ts` validates required public configuration without including values in errors.
- `src/lib/supabase` contains typed browser, server, and Proxy clients.
- `src/proxy.ts` refreshes Supabase sessions and performs optimistic route redirects.
- `src/styles` contains homepage/header and authentication styles based on the approved legacy palette.
- `public/Images` contains byte-identical development copies of only the approved homepage logo and video.

Next.js was initialized at the repository root because this branch is the incremental replacement application. The root arrangement supports standard Next.js and future Vercel conventions without moving or renaming any approved legacy source during the coexistence period.

## Legacy preservation and homepage mapping

The approved homepage source remains:

- `index.html`
- `header.html`
- `css/header.css`
- `css/firstpage.css`

Their pre- and post-implementation SHA-256 hashes match:

| Source | SHA-256 |
| --- | --- |
| `index.html` | `372B0FE4257C83C176F15595BA18373D7C3AC2F004FE3BA6A68D9E458097FB8E` |
| `header.html` | `C423276F47DCF38009A9FF73F021848B976C0557D33437C16922EE1600844D65` |
| `css/header.css` | `2F1B37B4DF0DAC115F711FB6AE1F27C22E022395E607EBBF830BC5C61ABDA972` |
| `css/firstpage.css` | `7E4EA7784A73B9BCA46635BDCF22426135F2AC18A40A3FCF193EB0CBF10CC7E2` |

`src/app/page.tsx` preserves the approved header, wording, content order, registration CTA, video, updates card, and social-media card. React-only changes are semantic elements, React attributes, the shared header component, a Next.js `Link` for `/register`, and modern CSS scoping. No heading, transcript, caption, section, statistic, testimonial, animation, gradient, or replacement visual was introduced.

The Contact Us and About Us header destinations remain the existing legacy `.html` destinations during coexistence. They are intentionally not presented as newly implemented modern routes in this checkpoint.

## Copied homepage assets

| Source and destination | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| `Images/logo.jpg` → `public/Images/logo.jpg` | 45,641 bytes | `7639F154EDCCE7EFDA81469631502BAC911B4F6C9C29023794C700B861F71DEB` | Byte-identical |
| `Images/combookexchange.mp4` → `public/Images/combookexchange.mp4` | 2,709,789 bytes | `1EAD8F54BC7B7C6DA50B1D84BD72F2BE5D53E38338928A0608605DFECBF1CDC2` | Byte-identical |

The original files remain in place. Logo and video ownership must be confirmed before production. A verified video caption or transcript remains required; none was invented here.

## Supabase client and authorization architecture

- The browser utility creates a typed `createBrowserClient` instance for browser sessions.
- Each server request creates a fresh typed `createServerClient`; there is no global server client.
- The server client uses current asynchronous Next.js cookie access and never uses a service-role key.
- The Proxy copies refreshed auth cookies and cache headers, calls `getClaims()`, redirects unauthenticated dashboard requests, and redirects authenticated visitors away from login and register.
- Proxy checks are optimistic only. The dashboard independently calls `getClaims()` in its Server Component and redirects unauthenticated requests.
- The dashboard selects only the authenticated user's `display_name` from `profiles`.
- Server actions validate input lengths and formats, never accept a role or profile UUID, never log credentials or links, and return generic browser-safe errors.
- Request approval, books, loans, notifications, storage, and administrator operations are not implemented.

The application uses Supabase's default PKCE architecture. Registration and password recovery send users through Supabase's hosted verification link, then return an authorization code to `/auth/callback`. The callback exchanges that code with `exchangeCodeForSession()` and permits redirects only to `/dashboard` or `/update-password`.

No application-created recovery marker is used. The password-update action calls `getClaims()` and requires a verified authenticated Supabase identity before `updateUser({ password })` can update that same user. A normally signed-in user can therefore also use this endpoint to change their own password; that is acceptable for version 1. A separate account-settings password workflow is deferred.

## Implemented routes

| Route | Access | Responsibility |
| --- | --- | --- |
| `/` | Public | Approved homepage migration |
| `/login` | Public / redirects authenticated users | Email/password login |
| `/register` | Public / redirects authenticated users | Account registration with display-name metadata |
| `/forgot-password` | Public | Generic password-reset request result |
| `/update-password` | Authenticated Supabase session required for mutation | New-password validation and update |
| `/auth/callback` | Public route handler | PKCE code exchange and explicit local redirect validation |
| `/dashboard` | Authenticated | Server-verified placeholder and logout |

Custom loading, error, and not-found states avoid stack traces, secrets, and raw Supabase objects.

## Environment variables

The application uses these public names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

`NEXT_PUBLIC_SITE_URL` is `http://localhost:3000` in the ignored local environment. No value is documented here. No service-role key is required or stored. Existing server-only placeholders in `.env.example` remain reserved for later reviewed work.

## Supabase Auth email flow and redirect configuration

The selected flow is PKCE with the hosted default templates. `@supabase/ssr` uses PKCE by default, and the installed Supabase client supports PKCE for both `signUp()` and `resetPasswordForEmail()`. The application intentionally retains `/auth/callback` and does not add a token-hash `/auth/confirm` route. A token-hash route would require a deliberately selected custom template that sends `token_hash` and `type` for `verifyOtp()`.

The organization is on the Free plan, and this project was created in August 2026. Supabase's June 2026 policy prevents new Free projects using its default email provider from customizing Auth email templates. Custom SMTP was not configured or used in this work. The connected tooling and public Auth settings endpoint do not expose whether an external actor previously configured custom SMTP, current template bodies, Site URL, or redirect allowlist, so those hosted settings remain **UNVERIFIED**. Email sign-up is enabled and automatic email confirmation is disabled, which means a verification step is expected.

Registration constructs this redirect from the validated site origin: `/auth/callback?next=/dashboard`. Password recovery constructs `/auth/callback?next=/update-password`. The intended recovery sequence is:

1. The user requests recovery at `/forgot-password`.
2. Supabase sends its recovery verification email.
3. Supabase verifies the recovery request and returns a PKCE authorization code.
4. `/auth/callback` exchanges the code and writes session cookies through the SSR client.
5. The browser enters `/update-password`, where the Server Action verifies the Supabase identity before changing that user's password.

Before form testing, Codex must confirm the following settings with authenticated read access:

- Local Site URL while developing: `http://localhost:3000`
- Local redirect allowlist: `http://localhost:3000/auth/callback` (the final post-exchange path is selected by the allowlisted `next` value)
- Vercel previews: `https://*-<team-or-account-slug>.vercel.app/**`, narrowed when the final team slug is known
- Production Site URL: the final canonical HTTPS origin
- Production redirect allowlist: the final origin plus `/auth/callback`
- Email confirmation: enabled for production registration
- Confirm Signup default template: retains the hosted verification-link/PKCE behavior
- Reset Password default template: retains the hosted verification-link/PKCE behavior
- Password recovery: enabled with the approved callback redirect allowlist

Until these live settings are confirmed, route rendering and safe failure behavior are verified, but end-to-end email confirmation and password recovery are not considered operational.

## Deferred work and limitations

- No registration, login, reset, or recovery form was submitted; no test user exists.
- Supabase's default email delivery is not a production email solution. The legacy Gmail SMTP credential must never be used.
- A future approved email provider and production redirect origins are required. Custom SMTP and a custom token-hash template may be evaluated together later; neither is configured in this checkpoint.
- Legacy Contact Us and About Us links remain comparison-era destinations until those routes are migrated.
- Book creation, search, requests, loans, notifications, storage, admin features, and legacy-data migration are deferred.
- Storage buckets remain absent.
- No Vercel project or deployment was created.
