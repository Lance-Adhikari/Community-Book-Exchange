# Current page map

## Scope and conventions

This document inventories the user-facing legacy surface as it exists on branch `rebuild/professional-supabase`. It is an audit, not a replacement specification. Paths and behavior are recorded exactly enough to preserve the recognizable product during a later migration.

“Login required” distinguishes intended behavior from effective enforcement. Several pages are meant to be private but are static HTML, and the PHP guard used elsewhere is defective; those routes are therefore **intended: yes, enforced: no**.

## Repository surface

- 65 tracked/worktree files were inspected: 9 HTML, 26 PHP, 16 CSS, 3 JavaScript, 2 identical SQL dumps, 6 JPEG images, 1 MP4, 1 XML configuration, and 1 Apache configuration backup.
- Shared JavaScript is `js/userInfo.js`; vendored jQuery 3.2.1 is used only by `account.html`.
- Shared visual assets are `Images/logo.jpg` and `Images/combookexchange.mp4`. Numeric image names are resolved dynamically as user-profile paths by `php/account.php`.
- `header.html` is a standalone header fragment/reference rather than a complete application workflow.

## Complete page list

| Page | Purpose | CSS | JavaScript | Login requirement | Main data tables |
|---|---|---|---|---|---|
| `index.html` | Public first page/landing page | `css/header.css`, `css/firstpage.css` | None | No | None |
| `aboutUs.html` | Public About Us placeholder | `../css/header.css`, `../css/aboutUs.css` (paths are broken from the repository root) | None | No | None |
| `contactUs.html` | Public Contact Us placeholder | `../css/header.css`, `../css/contactUs.css` (paths are broken from the repository root) | None | No | None |
| `login.html` | Username/password sign-in and registration entry | `css/header.css`, `css/login.css` | None | No | `user` through `php/process.php` |
| `register.html` | Account registration | `css/header.css`, `css/register.css` | None | No | `user` through `php/register.php` |
| `dashboard.html` | Authenticated menu/dashboard | `css/header.css`, `css/dashboard.css` | `js/userInfo.js` | Intended yes; not enforced | `user` through avatar request |
| `account.html` | Profile view, avatar upload, unfinished edit modal | `css/popup.css`, `css/header.css`, `css/account.css` | `js/userInfo.js`, `vendor/jquery/jquery-3.2.1.min.js`, inline jQuery | Intended yes; not enforced | `user`; filesystem image |
| `booksearch.html` | Book search controls | `css/header.css`, `css/search.css` | `js/userInfo.js` | Intended yes; not enforced | Results use `book`, `booktransaction`, `user`, `category`, `status` |
| `header.html` | Reusable/reference public header | `css/header.css`, `css/login.css` | None | No | None |
| `php/BookInsert.php` | Add Book page and insert handler | `../css/header.css`, `../css/insert.css` | None | Intended yes; defective guard | `category`, `user`, `book`, `booktransaction` |
| `php/booksearch.php` | Search-results table and Borrow action | No complete page shell; emits result markup | None | Intended yes; defective guard | `book`, `booktransaction`, `user`, `category`, `status` |
| `php/mybook.php` | “My Books” table, status and owner actions | `../css/header.css`, `../css/mybook.css` | Inline confirmation call | Intended yes; defective guard | `user`, `book`, `booktransaction`, `category`, `status` |
| `php/emailsend.php` | Borrow request message page and email handler | `../css/header.css`, `../css/emailsend.css` | None | Intended yes; defective guard | `user`, `booktransaction` |
| `php/changePassword.php` | Forgot-password request page | `../css/header.css`, `../css/changePass.css` | Inline `flipUserInfo()` | No | `user`, `changepassword` |
| `php/updatepassword.php` | Reset-password completion page | `../css/header.css`, `../css/register.css` | None | Reset-link context; validation is defective | `user`, `changepassword` |
| `php/emailconfirm.php` | Registration-email confirmation response | None | None | Activation-link context | `user` |

Developer-only or non-product routes (`php/phpinfo.php`, `php/test.php`, `php/testfile.php`, `php/upload.php`) are documented in `php-backend-audit.md` and must not become public Next.js pages.

## Detailed static-page inventory

### `index.html`

- **Purpose and content order:** blue header; centered “Community Book Exchange” title; motto/intro copy; “Get Started” call to action; “How To Use?” video; “Updates & Fixes”; “Social Media Platforms.”
- **Header:** logo at upper left; Contact and About Us at upper right.
- **Forms:** default-GET form to `register.html`; no named inputs; submit label “Get Started”.
- **IDs used by JavaScript:** none.
- **Endpoints called:** none.
- **Links:** `contactUs.html`, `aboutUs.html`, `register.html`.
- **Assets:** `Images/logo.jpg`, `Images/combookexchange.mp4`.

### `aboutUs.html`

- **Purpose:** placeholder About Us page.
- **Forms/endpoints/JavaScript:** none.
- **IDs used by JavaScript:** none.
- **Links:** `contactUs.html`, `aboutUs.html`, `index.html` (“First Page”).
- **Existing wording:** “About Us”, “Made by Deepesh Shrestha, and Lance Adhikari.”, “Page coming soon!”
- **Defect to preserve only as an audit fact:** stylesheet references use `../css/...` even though the page is at root.

### `contactUs.html`

- **Purpose:** placeholder Contact Us page.
- **Forms/endpoints/JavaScript:** none.
- **IDs used by JavaScript:** none.
- **Links:** `contactUs.html`, `aboutUs.html`, `index.html` (“First Page”).
- **Existing wording:** “Contact Us”, “Page coming soon!”
- **Defect:** CSS and logo paths use `../` from a root-level page.

### `login.html`

- **Purpose:** sign-in screen with registration and password-recovery paths.
- **Form 1:** `POST php/process.php`; input names `username`, `password`; submit “Login”.
- **Form 2:** default `GET register.html`; no named input; submit “Registration”.
- **IDs used by JavaScript:** none.
- **Links:** header Contact/About links and `php/changePassword.php` (“Forgot Password?”).
- **Database path:** `php/process.php` reads `user.UserId`, `Username`, `Password`, and `UserStatus`.

### `register.html`

- **Purpose:** creates a legacy user and begins email activation.
- **Form 1:** `POST php/register.php`; inputs in visual order: `firstName`, `lastName`, `email`, `phoneNumber`, `username`, `password`, `password2`.
- **Form 2:** `POST login.html`; no named input; submit “Login”.
- **IDs:** `password` and `password2` are assigned to surrounding paragraph elements, not the inputs.
- **Links:** header Contact/About links.
- **Database path:** inserts `user`; sends an activation email.

### `dashboard.html`

- **Purpose:** central authenticated menu.
- **Forms/actions in order:** `POST php/BookInsert.php` (“Add Book”); default `GET booksearch.html` (“Search Book”); `POST php/mybook.php` (“My Books”); `POST account.html` (“My Account”); `POST php/logout.php` (“Log out”). There are no named inputs.
- **IDs:** `myImg3` (profile image), `dashbox` (main dashboard container).
- **JavaScript:** body calls `loadUserInfo()` from `js/userInfo.js`.
- **Links:** Contact and About Us in the profile dropdown.
- **Defect:** `loadUserInfo()` first writes to missing IDs `uid`, `fn`, `ln`, `pn`, and `em`; the resulting exception can prevent `myImg3` from being populated.

### `account.html`

- **Purpose and order:** header/profile dropdown; large profile image; image upload; read-only profile fields; “Update Account Information”; modal edit form; Cancel.
- **Upload form:** `POST multipart/form-data` to `php/loadProfile.php`; inputs `fileToUpload` and `submit`.
- **Edit form:** `POST` to an empty action, `multipart/form-data`; submit names `updateprofile` and `updateprofile2`. Fields `newfn`, `newln`, `newpn`, and `newem` have IDs but no `name`, so their values would not be submitted.
- **Cancel form:** default GET to `account.html`, nested inside the edit form (invalid HTML); input name `cancel`.
- **JavaScript IDs:** `uid`, `fn`, `ln`, `pn`, `em`, `myImg`, `myImg2`, `updateprofile`, `updateprofile-popup`, `updateprofile-form`, `newfn`, `newln`, `newpn`, `newem`, `updateprofile2`, `cancel`.
- **Duplicate IDs:** `updateprofile` is used on more than one element; `fn`, `ln`, `pn`, and `em` each occur in both input/display contexts.
- **Inline-script defects:** validation reads old read-only fields rather than new fields, references nonexistent `#lm`, and uses `$("inputBox")` instead of a class selector. No account-update endpoint is wired.
- **Links:** `dashboard.html`, Contact, About Us.
- **Database path:** `php/account.php` returns profile data; `php/loadProfile.php` writes `Images/{session-user-id}.jpg`.

### `booksearch.html`

- **Purpose and order:** standard private header/dropdown; bordered search panel; subject selector; keyword field; Search button; result area supplied by PHP.
- **Form:** `POST php/booksearch.php`; inputs `subject`, `keyword`.
- **Filter values:** “Keyword”, “Book Title”, “Book Author”, “Published Year”, “Category”, “Memo”.
- **IDs:** `myImg`, `dashbox`, `subjects`.
- **Links:** `dashboard.html`, Contact, About Us.
- **Defects:** the avatar request suffers the same missing-ID exception as dashboard. The root-absolute logo path `/Images/logo.jpg` is fragile under a subpath deployment. “Category” and “Memo” do not match the PHP switch labels “Book Category” and “Book Memo”.

### `header.html`

- **Purpose:** public/header reference with logo left, centered product title, Contact/About right.
- **Forms/endpoints/JavaScript/IDs:** none.
- **Links:** Contact and About Us.

## Detailed PHP-rendered-page inventory

### `php/BookInsert.php`

- **Form:** self-`POST`; inputs `booktitle`, `bookauthor`, `publishedyear`, `memo`, `isbn`, `barcode`, `category`; category select ID `sel_category`.
- **Other ID:** `dashbox`.
- **Content order:** Book Title, Book Author, Published Year, Memo, ISBN, Barcode, Book Category, “Insert Book”.
- **Links:** dashboard, Contact, About Us, login fallback.
- **Tables:** reads `category` and `user`; inserts `book` and initial `booktransaction`.

### `php/booksearch.php`

- **Input:** receives `POST keyword` and `subject` from `booksearch.html`.
- **Output:** a results table with columns Title, Status, Author, Year, Category, Memo, Owner, Action.
- **Per-row form:** `POST emailsend.php`; hidden names `bookOwnerId`, `bookId`, `title`, `author`, `status`, `statusId`; submit text “Borrow”.
- **IDs/CSS/full shell:** none.
- **Tables:** `book`, `booktransaction`, `user`, `category`, `status`.

### `php/mybook.php`

- **Output:** “My Books” table with Title, Status, Author, Year, Category, Memo, Borrower, Action.
- **Per-row form:** self-`POST`; select `status` (element ID `select`); hidden `bookId`, `loanerId`; submit names `Update Status` and `Update Owner` (PHP reads normalized `Update_Status`/`Update_Owner`).
- **Status options:** `1` “Avalible”, `3` “Borrowed”, `5` “Lost”.
- **Links:** dashboard, Contact, About Us, login fallback.
- **Tables:** `user`, `book`, `booktransaction`, `category`, `status`.

### `php/emailsend.php`

- **First-stage input:** receives hidden book/owner/status values from results.
- **Confirmation form:** self-`POST`; hidden `bookOwnerId`, `bookId`, `title`, `author`, `status`, `statusId`; textarea `message`; submit `submit`.
- **Cancel form:** `POST booksearch.php` with no search fields.
- **Content:** asks the borrower to write a message; displays selected book title, author, and status.
- **Links:** dashboard, Contact, About anchor; several links have incorrect PHP-relative destinations.
- **Tables:** reads `user`; writes `booktransaction` before sending email.

### `php/changePassword.php`

- **Form 1:** self-`POST`; inputs `username`, `useremail`; IDs `username`, `useremail`, `getToken`.
- **Form 2:** `POST ../login.html`; no named fields.
- **Links:** Contact and About anchor; reset link generated in email.
- **Tables:** reads `user`, inserts `changepassword`.

### `php/updatepassword.php`

- **Context input:** `GET i` (user ID) and `GET h` (token).
- **Form:** self-`POST`; input names `password`, `password2`; IDs `passinfo`, `updatePassword`.
- **Links:** login, Contact, About anchor.
- **Tables:** reads `changepassword`, updates `user.Password`.

### `php/emailconfirm.php`

- **Context input:** `GET i` and `GET h`.
- **Output:** activation success/failure text and a login link; no form, CSS, or JavaScript.
- **Tables:** reads and updates `user.UserStatus`.

## Cross-page JavaScript contract

`js/userInfo.js` defines only `loadUserInfo()`:

1. `GET php/account.php` with `XMLHttpRequest`.
2. Parse the manually assembled JSON response.
3. Populate `uid`, `fn`, `ln`, `pn`, `em` and image sources `myImg`, `myImg2`, `myImg3`.

The function has no null checks and assumes every target exists. Any replacement must preserve the visible profile/avatar result while replacing this global, fragile contract with page-specific typed components.

## Navigation summary

- Public path: first page → registration or Contact/About; login → dashboard or registration/password recovery.
- Private path: dashboard → Add Book, Search Book, My Books, My Account, logout.
- Search path: search controls → PHP results → borrow-message page → dashboard on successful email.
- Account path: account → avatar upload or unfinished edit modal → dashboard.
- Password path: forgot-password request → emailed reset URL → update-password page → login.
