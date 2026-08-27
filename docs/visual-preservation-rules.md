# Visual preservation rules

## Governing rule

The rebuild must remain immediately recognizable as Community Book Exchange. Professional improvement means correcting accessibility, responsiveness, consistency, hierarchy, and broken behavior **within the original composition**. It does not authorize a new brand, a generic SaaS dashboard, a radically different navigation model, or reordered workflows.

Before replacing any page, capture desktop and mobile reference screenshots from the legacy implementation and review the replacement side by side. A page is not complete until its preservation checklist passes.

## Global visual identity to preserve

### Header structure

- Preserve the full-width blue header band.
- Preserve the Community Book Exchange logo at the upper left.
- Preserve the page/product title centered in the header.
- Preserve primary/contextual navigation at the upper right.
- On authenticated pages, preserve the circular profile-image control and its Contact/About/dashboard dropdown relationship.
- Do not replace this with a left sidebar, floating app shell, centered-only logo, hamburger-only desktop navigation, or unrelated marketing nav.

### Logo and palette

- `Images/logo.jpg` is a 500×500 navy mark showing two hands exchanging a red book, with “COMMUNITY BOOK EXCHANGE” lettering. Preserve this as the recognizable logo unless the owner separately approves a faithful vector cleanup.
- The legacy header uses a vivid blue (`#0088ff` in the styles); light-blue page backgrounds, dark/navy text, pale gray panels, and gray action buttons are recurring cues.
- Colors may be normalized into accessible design tokens, but the blue-header/light-content identity must remain.
- Keep strong text contrast, visible focus states, and accessible hover/disabled states.

### Typography and geometry

- Preserve the centered, plain-language page-title hierarchy and predominantly sans-serif character (legacy pages reference Barlow and generic sans-serif stacks).
- Replace brittle absolute positioning and fixed pixel sizes with responsive layout primitives while retaining relative placement.
- Preserve bordered/fieldset-style form grouping and prominent gray/neutral action controls, refined into consistent cards, inputs, and buttons.
- Mobile layouts may stack controls and hide/reflow nonessential decorative elements, but must keep the same content order.

## Page-by-page invariants

### First page (`index.html`)

Preserve this order:

1. Blue header with left logo, centered title, right Contact/About.
2. Intro/motto text.
3. “Get Started” registration call to action.
4. “How To Use?” section and the existing instructional video (`Images/combookexchange.mp4`).
5. “Updates & Fixes”.
6. “Social Media Platforms”.

Do not turn this into an unrelated hero illustration, pricing page, card grid, testimonials layout, or new multi-section marketing concept before preservation approval.

### Login

- Preserve header, centered login fieldset/card, Username above Password, Login action, registration prompt/action below, and “Forgot Password?” beneath.
- Maintain visible wording: “Login”, “Username”, “Password”, “Register if you don't have an account”, “Registration”, “Forgot Password?”
- Improvements allowed: correct labels, autocomplete, password reveal, error summary, loading state, responsive spacing, keyboard/focus behavior.

### Registration

- Preserve the “Fields with * are required.” notice.
- Preserve two conceptual groups: “Personal Information” and “Account Login Information”.
- Preserve input order: First Name, Last Name, Email, Phone Number; then Username, Password, Confirm Password.
- Preserve Register action and existing-account Login prompt below.
- Desktop may retain the two-column grouped structure; mobile stacks the groups in the same order.

### Dashboard

- Preserve the centered, bordered dashboard container and vertical menu structure.
- Preserve action order and descriptions: Add Book, Search Book, My Books, My Account, Log out.
- Preserve profile control in the header.
- Improvements allowed: clearer icons, consistent action rows, better descriptions/status cues, responsive width, accessible dropdown. Do not replace with a dense analytics dashboard, sidebar, metric cards, charts, or unrelated widgets.

### Add Book

- Preserve a centered grouped form.
- Preserve field order and wording: Book Title, Book Author, Published Year, Memo, ISBN, Barcode, Book Category, Insert Book.
- Category remains a select control in the corresponding position.
- Validation and helper text may be added without rearranging the workflow.

### Book Search and results

- Preserve authenticated header/profile control.
- Preserve the bordered search region with filter selector followed by keyword entry and Search action.
- Preserve filters conceptually: Keyword, Book Title, Book Author, Published Year, Category, Memo.
- Preserve results beneath the controls, not on a separate unrelated discovery experience.
- Preserve result columns/order where viewport permits: Title, Status, Author, Year, Category, Memo, Owner, Action.
- Mobile may use a horizontally scrollable table or faithful row cards, but must retain all fields and Borrow action.

### My Books

- Preserve the header followed by “My Books” inventory results.
- Preserve columns/order: Title, Status, Author, Year, Category, Memo, Borrower, Action.
- Preserve per-book status selection and “Update Status” / “Update Owner” concepts until a human decides whether ownership transfer remains.
- Correcting “Avalible” to “Available” is recommended but should be logged as copy correction, not a visual redesign.

### Account

- Preserve header/profile dropdown, prominent avatar, upload/replace image control, profile information block, Update Account Information action, and modal/overlay editing concept.
- Preserve visible field order: User ID, First Name, Last Name, Phone Number, Email.
- A new system may omit visible legacy User ID only after product approval; Auth UUIDs should not be exposed as a substitute.
- Improve the edit form and validation while keeping the recognizable profile-first composition.

### Borrow message

- Preserve selected book context, instruction to write a message, large message area, Submit and Cancel actions.
- The backend will become a request record rather than immediate hidden-field email mutation, but the visible interaction should remain familiar.

### Forgot/reset password

- Preserve the standard blue header and centered form.
- Request page retains Username and Email fields plus token/request action and Login return.
- Completion page retains New Password, Confirm Password, and Update Password.
- Supabase Auth may change technical link behavior, not the visible structure without review.

### About and Contact

- Preserve the standard header and simple centered content treatment.
- Existing placeholder copy may remain until real approved content is supplied.

## Existing wording inventory

Wording should be carried forward during the first faithful implementation. Grammar/spelling corrections should be tracked, and new marketing copy should require review.

| Area | Existing key wording |
|---|---|
| Product | “Community Book Exchange” |
| First page | “Get Started”, “How To Use?”, “Updates & Fixes”, “Social Media Platforms” |
| Public nav | “Contact Us”, “About Us”, “First Page” |
| Login | “Login”, “Username”, “Password”, “Registration”, “Forgot Password?” |
| Registration | “Fields with * are required.”, “Personal Information”, “Account Login Information”, “Register” |
| Dashboard | “Dashboard”, “Add Book”, “Search Book”, “My Books”, “My Account”, “Log out” |
| Account | “Upload Image”, “Update Account Information”, “First Name”, “Last Name”, “Phone Number”, “Email”, “Cancel” |
| Add book | “Book Title”, “Book Author”, “Published Year”, “Memo”, “ISBN”, “Barcode”, “Book Category”, “Insert Book” |
| Search | “Keyword”, “Book Title”, “Book Author”, “Published Year”, “Category”, “Memo”, “Search”, “Borrow” |
| My Books | “Update Status”, “Update Owner”, “Available” (legacy page misspells one occurrence), “Borrowed”, “Lost” |
| Borrow flow | “Write a message to send to the owner of the book”, “Submit”, “Cancel” |
| Password | “Forgot Password”, “Update Password”, “New Password”, “Confirm Password” |
| Placeholders | “Page coming soon!” |

## Asset audit and preservation disposition

| Asset | Audit result | Rule |
|---|---|---|
| `Images/logo.jpg` | 500×500 branded logo | Preserve and optimize; do not replace without approval |
| `Images/combookexchange.mp4` | Existing 2.7 MB instructional video | Preserve in first-page content order; verify captions/transcript and ownership |
| `Images/nepal-mountain-wallpaper.jpg` | 3840×2160 mountain photograph; no current code reference found | Do not introduce it into redesign; review ownership before any reuse |
| `Images/2021100055.jpg` | 1000×871 generic yellow-book image, numeric identity-like filename | Do not assume it is a profile image or licensed; review before migration |
| `Images/2023050123.jpg` | 612×522 books image with visible Getty Images watermark | Do not migrate or deploy without license; recommended exclusion |
| `Images/2023050124.jpg` | 612×522 visually blank image | Do not migrate unless a human identifies a purpose |
| `Images/sampleimage.jpg` | 1080×1641 unrelated device/vent photograph | Do not migrate unless a human identifies a purpose and ownership |

## Professional improvements that are in scope later

- Correct broken relative asset paths.
- Replace absolute/fixed positioning with responsive CSS while matching composition.
- Establish consistent spacing, form control sizes, radii, borders, and button states.
- Add semantic landmarks, labels, descriptions, error messages, keyboard operation, skip links, focus visibility, alt text, captions/transcript, reduced-motion handling, and WCAG-compliant contrast.
- Replace fragile dropdown and modal scripts with accessible components.
- Make data tables usable on small screens without losing fields.
- Add real empty, loading, success, validation, and error states.
- Correct obvious spelling/grammar only with a tracked copy-change list.

## Changes that require explicit human approval

- Changing logo, brand name, primary blue identity, or header placement.
- Reordering main content or dashboard actions.
- Replacing the dashboard with a sidebar/analytics layout.
- Removing form fields or table columns from the visible workflow.
- Changing borrow/ownership concepts or visibility of contact information.
- Replacing existing wording with new marketing copy.
- Removing the instructional video.
- Using any legacy image with unclear ownership or consent.

## Acceptance checklist for each replacement page

- Header regions occupy the same recognizable positions.
- Main sections appear in the same order.
- Forms retain group structure, labels, and field order.
- Existing navigation destinations remain reachable.
- Existing wording is preserved or every change is listed for review.
- Desktop and mobile screenshots are reviewed side by side.
- Keyboard-only and screen-reader flows work.
- No legacy secret, personal record, or unapproved asset is included.
- Backend modernization is invisible to the page’s recognizable layout.
