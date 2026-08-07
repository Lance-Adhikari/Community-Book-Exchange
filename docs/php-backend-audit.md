# PHP backend audit

## Executive summary

The legacy backend is a set of directly addressed PHP scripts backed by `mysqli`, PHP sessions, a MySQL dump, filesystem uploads, and PHPMailer. There is no application router, central authorization layer, CSRF protection, transaction boundary for multi-step operations, or consistent response format. All 26 PHP files were inspected.

The most serious systemic defect is the repeated guard:

```php
strlen($_SESSION['login_userId'] <= 0)
```

The comparison is evaluated before `strlen`, so it does not reliably enforce authentication. Static HTML private pages cannot be protected by PHP at all. Client-side script redirects after output are used in several scripts instead of terminating server-side redirects.

## Complete PHP file inventory

### Empty and placeholder files

| File | Purpose | Functions | Method/session/data/redirect behavior |
|---|---|---|---|
| `php/aboutUs.php` | Empty placeholder | None | No request handling, sessions, SQL, redirect, email, or upload |
| `php/contactUs.php` | Empty placeholder | None | No request handling, sessions, SQL, redirect, email, or upload |
| `php/firstpage.php` | Empty placeholder | None | No request handling, sessions, SQL, redirect, email, or upload |
| `php/login.php` | Empty placeholder | None | No request handling, sessions, SQL, redirect, email, or upload |
| `php/updateaccount.php` | Unimplemented account update stub | None | Starts a session and includes `library.php`; performs no update |

### Configuration and shared libraries

#### `php/libconfig.php`

- **Purpose:** locate and parse `conf/bookshare.xml`.
- **Function:** `GetServerInfo()`.
- **Request method/session:** none.
- **Behavior:** calls `simplexml_load_file($_SERVER['DOCUMENT_ROOT'] . '/conf/bookshare.xml')` and returns the XML object.
- **Risk:** assumes a document-root deployment; no failure handling; returns database, SMTP, and server configuration to every caller as a single object.

#### `php/config.php`

- **Purpose:** create a MySQL connection.
- **Function:** `GetConnection()`.
- **Request method/session:** none.
- **SQL:** none itself; creates `mysqli(host, username, password, database)` from XML values.
- **Risk:** echoes raw connection errors, leaking infrastructure information.

#### `php/libemail.php`

- **Purpose:** shared SMTP sender for registration email.
- **Function:** `SendEmailToUser($userEmail, $message, $subject)`.
- **Request method/session/SQL:** none.
- **Email behavior:** loads SMTP host, port, protocol, username, and password from XML; uses hard-coded Windows Bitnami PHPMailer paths; authenticates to SMTP; sends HTML email to the supplied recipient.
- **Security:** TLS peer/name verification is disabled and self-signed certificates are allowed; exception details are echoed; a live SMTP credential is present in XML as `[REDACTED]`.

#### `php/library.php`

- **Purpose:** shared user/category/status lookup and book transaction/ownership mutations.
- **Functions and SQL:**
  - `GetUserInfoById($userId)`: `SELECT * FROM user WHERE UserId = ?`.
  - `GetStatusName($statusId)`: `SELECT StatusName FROM status WHERE StatusId = ?`.
  - `GetCategoryName($categoryId)`: `SELECT CategoryName FROM category WHERE CategoryId = ?`.
  - `UpdateTransaction($statusId, $loanerId)`: reads `$_POST['bookId']`; updates the active `booktransaction.EndDate` for the book using `SYSDATE()`, then inserts a new row with a year-9999 end-date sentinel.
  - `UpdateOwner($bookId, $loanerId)`: `UPDATE book SET UserId = ? WHERE BookId = ?`.
  - `SetUserStatus($userId, $userStatus)`: updates `user.UserStatus`.
  - `UpdateUserInfo($userId, $userStatus)`: despite its name, duplicates `SetUserStatus` and updates only `UserStatus`.
- **Request/session:** no method guard; `UpdateTransaction` has a hidden dependency on POST data; no session use directly.
- **Risks:** close-and-insert is not transactional; no ownership authorization; concurrent actions can create inconsistent active records; errors are echoed.

### Authentication and account lifecycle

#### `php/process.php`

- **Purpose:** authenticate a username/password submission.
- **Functions:** `GetUserId($username)`, `ProcessUser($username, $password)`.
- **Method/inputs:** assumes POST; reads `username`, `password`; no `REQUEST_METHOD` check.
- **Session variables:** reads/writes `error`, `username`, `login_user`, `login_userId`.
- **SQL:**
  - `SELECT UserId FROM user WHERE Username = ?`.
  - `SELECT Username, Password, UserStatus FROM user WHERE Username = ?`.
- **Logic:** requires `UserStatus === '1'`, then `password_verify` against the stored bcrypt hash.
- **Redirects:** JavaScript redirect to `../dashboard.html` on success or `../login.html` on failure.
- **Risks:** null-result handling is unsafe; session ID is not regenerated; static dashboard has no server guard; error state is not consistently presented.

#### `php/register.php`

- **Purpose:** validate and create a legacy account, then send activation email.
- **Functions:** `GetNewUserId()`, `SendUserEmail($userId, $token, $email)`, `CreateNewUser(...)`, `ValidateUsername(...)`.
- **Method/inputs:** assumes POST; `firstName`, `lastName`, `email`, `phoneNumber`, `username`, `password`, `password2`.
- **Session:** none.
- **SQL:** `SELECT MAX(UserId) FROM user`; `INSERT INTO user (UserId, CreateDate, FirstName, LastName, PhoneNumber, Email, Username, UserStatus, Password)`.
- **Email:** sends an activation URL containing user ID and token.
- **Redirects:** JavaScript to `../register.html` on validation errors; no dependable success redirect.
- **Risks:** manual `MAX + 1` ID allocation races; no uniqueness constraint/check for username or email; bcrypt cost is 4; activation token is predictable MD5; `UserStatus` mixes status and token; phone and IDs are bound as numeric values; no transaction between user creation and email.

#### `php/emailconfirm.php`

- **Purpose:** activate an account from an emailed link.
- **Function:** `VerifyUserMsg($userId, $hash)`.
- **Method/inputs:** GET `i`, `h`.
- **Session:** none.
- **SQL:** reads the user through `GetUserInfoById`; updates `user.UserStatus` through `SetUserStatus`.
- **Logic:** status `1` means already active, `0` means suspended; otherwise the entire status value is compared with the supplied hash and then changed to `1`.
- **Redirect/link:** prints a login link based on XML server URL.
- **Risks:** activation token has no expiry; response can reveal a username; malformed `catch(Exeption)`; status/token conflation.

#### `php/changePassword.php`

- **Purpose:** request a password reset and render the request form.
- **Functions:** `SendEmailPasswordUpdate($email, $message)`, `SendEmailToChangePassword($username, $email)`.
- **Method/inputs:** GET renders; POST reads `username`, `useremail`.
- **Session:** none.
- **SQL:** `SELECT UserId, Email FROM user WHERE Username = ? OR Email = ?`; `INSERT INTO changepassword VALUES (?, ?, ?, ?)`.
- **Email:** sends a reset link containing user ID and a six-digit token.
- **Redirects:** none; renders success/error text and a login form.
- **Risks:** undefined `$proto` and `$port`; reads an XML element named `host` that does not exist; helper has no reliable success return; account enumeration; `rand()` token is not cryptographically secure, hashed, expiring, or invalidated.

#### `php/updatepassword.php`

- **Purpose:** validate a reset link and replace the password.
- **Functions:** `ValidateUserMsg($userId, $token)`, `GetUserIdFromToken($userId)`, `UpdatePassword($userId, $password)`.
- **Method/inputs:** GET `i`, `h`; POST `password`, `password2`.
- **Session:** writes/reads `userId`, `token`, `userid`, `login_userId`.
- **SQL:** `SELECT UserId, Token FROM changepassword WHERE UserId = ? ORDER BY CreateDate DESC`; `UPDATE user SET Password = ? WHERE UserId = ?`.
- **Redirects:** JavaScript to login pages.
- **Risks:** link validation initially ignores the token; query has no `LIMIT 1`; token has no expiry, consumption, hashing, or attempt limit; reset records remain reusable; ineffective session guard; bcrypt cost remains 4.

#### `php/logout.php`

- **Purpose:** end the session.
- **Functions/SQL:** none.
- **Method:** accepts any request; dashboard sends POST.
- **Session:** unsets `login_user`, destroys session.
- **Redirect:** HTTP `Location: ../login.html`.
- **Risk:** no CSRF protection; does not explicitly clear the session cookie.

#### `php/account.php`

- **Purpose:** return current account data to `js/userInfo.js`.
- **Functions:** none; uses `GetUserInfoById`.
- **Method:** GET in current client, but not restricted by code.
- **Session:** reads `login_userId`; uses defective login guard.
- **SQL/tables:** `user` through the library; accesses `UserId`, `FirstName`, `LastName`, `PhoneNumber`, `Email`.
- **Response:** manually concatenated JSON containing profile PII and `Images/{UserId}.jpg`.
- **Redirect:** JavaScript to `login.php` when guard fires.
- **Risks:** no JSON content type, no robust escaping, PII disclosure if session enforcement fails, and missing-image behavior is undefined.

#### `php/dashboard.php`

- **Purpose:** intended login guard.
- **Functions/SQL:** none.
- **Session:** reads `login_userId` through the defective expression.
- **Redirect:** JavaScript to `../login.html`.
- **Critical fact:** it is not included by `dashboard.html`, so it protects no dashboard content.

### Book and borrowing workflows

#### `php/BookInsert.php`

- **Purpose:** render Add Book and insert a book/current-status row.
- **Functions:** `InsertBook()`, `InsertBooktransaction($bookId, $statusId)`.
- **Method/inputs:** GET renders; POST reads `booktitle`, `bookauthor`, `publishedyear`, `memo`, `isbn`, `barcode`, `category`.
- **Session:** reads `login_user`, `login_userId`; calls `session_start()` more than once; guard is defective.
- **SQL:** `SELECT * FROM category`; `SELECT MAX(BookId) FROM book`; `SELECT UserId FROM user WHERE Username = ?`; insert selected book columns; insert initial `booktransaction`.
- **Redirect:** login fallback by JavaScript.
- **Risks:** manual ID race; no transaction across the two inserts; ISBN/barcode bound as numeric values; no ownership/authentication enforcement; year-9999 active sentinel.

#### `php/booksearch.php`

- **Purpose:** execute search and render a borrowable results table.
- **Functions:** `GetOwnerName($ownerId)`, `QueryBook($sql, $keyword)`, `SearchBook()`.
- **Method/inputs:** POST `keyword`, `subject`.
- **Session:** reads `login_userId` through defective guard.
- **SQL:** owner name from `user`; exact `SELECT * FROM book` by title, author, published year, category ID, or memo; default query joins `book` to currently active `booktransaction`; library lookups read category/status.
- **Output/action:** per-row form posts trusted hidden book and owner metadata to `emailsend.php`.
- **Redirect:** JavaScript to login fallback.
- **Risks:** stored XSS because database values are emitted without escaping; hidden attributes are unquoted; N+1 category/status/owner queries; category and memo UI labels do not match PHP switch cases; exact-match queries can use stale `book.StatusId` rather than active history.

#### `php/mybook.php`

- **Purpose:** list owned books, change status, or transfer ownership to the current loaner.
- **Functions:** `GetOwnerId()`, `ListMyBook()`; calls shared update functions.
- **Method/inputs:** GET/POST render; POST `bookId`, `loanerId`, `status`, `Update_Status`, `Update_Owner`.
- **Session:** `login_user`, `login_userId`; defective guard.
- **SQL:** user lookup by username; active book/transaction join for current owner; category/status lookups; update/insert history and book owner via library.
- **Redirect:** JavaScript login fallback.
- **Risks:** no CSRF or server-side ownership check; trusts hidden loaner/book IDs; ownership/status mutations are not transactional; output is unescaped; confirmation result is ignored; malformed document closes HTML before generated results.

#### `php/emailsend.php`

- **Purpose:** collect a borrower message, mark the book reserved, and email the owner.
- **Functions:** `SendEmail($email, $message)`, `GetLoanerInfo()`, `GetUserEmail($userId)`.
- **Method/inputs:** POST hidden `bookOwnerId`, `bookId`, `title`, `author`, `status`, `statusId`; second POST also includes `message`, `submit`.
- **Session:** reads `login_userId`; defective guard.
- **SQL:** reads borrower first/last name, email, and phone from `user`; reads owner email; calls `UpdateTransaction(2, borrowerId)` to reserve.
- **Email:** sends owner the borrower’s full name, email, phone, and message using PHPMailer with disabled TLS verification.
- **Redirect:** JavaScript to `../dashboard.html` after successful mail.
- **Risks:** mutation occurs before email; no durable request/approval record; hidden fields are authoritative; PII is shared by email without an explicit consent/audit model; no CSRF/authorization; email failure leaves the book reserved.

### Upload and diagnostic files

#### `php/loadProfile.php`

- **Purpose:** upload/replace current user profile image.
- **Method/inputs:** POST multipart; expects `submit` and `fileToUpload`.
- **Session:** reads `login_userId`; no effective authentication check.
- **SQL:** none.
- **File behavior:** `getimagesize`, then `move_uploaded_file` to `../Images/{login_userId}.jpg`, overwriting an existing file.
- **Risks:** no upload-error handling, size limit, safe re-encoding, extension/content policy beyond `getimagesize`, storage isolation, or authorization; predictable public filename.

#### `php/upload.php`

- **Purpose:** experimental upload handler.
- **Method/session:** uploaded file plus session-derived user value; most validation is commented out.
- **File behavior:** targets an `Images/{user}.jpg` path.
- **Redirect:** JavaScript to `php/login.php` when its guard fires.
- **Risk:** unsafe, unused prototype; must never be exposed.

#### `php/phpinfo.php`

- **Purpose:** calls `phpinfo()`.
- **Risk:** discloses complete PHP/environment/server configuration and must be removed from any deployed surface.

#### `php/test.php`

- **Purpose:** includes `library.php`, reads server XML, and echoes the configured URL.
- **Risk:** diagnostic information disclosure; no product purpose.

#### `php/testfile.php`

- **Purpose:** commented/prototype upload markup.
- **Fact:** lacks an opening PHP tag, so source-like text may be served literally depending on server configuration.

## Complete backend feature list

1. Username/password registration and email activation.
2. Username/password login using PHP sessions.
3. Logout.
4. Forgot-password email and reset-token handling.
5. Current-user profile JSON.
6. Profile image upload to local filesystem.
7. Account edit modal (UI only; backend is unimplemented).
8. Add a book and initial status-history row.
9. Search books by several exact fields or general title keyword.
10. Resolve category, status, owner, and borrower labels.
11. Display owned books.
12. Change a book’s active status by closing and appending a transaction row.
13. Transfer book ownership to the recorded loaner.
14. Submit a borrow message, reserve the book, and email owner/borrower contact data.
15. SMTP email delivery through PHPMailer.
16. Developer diagnostics and prototype upload endpoints.

There is no true borrow-request approval workflow, loan due date, return acceptance, notification inbox, audit actor, authorization policy, reliable account editing, or transactional integrity.

## Security and privacy findings

### Critical

- `conf/bookshare.xml` contains database credentials and an SMTP credential. Values are `[REDACTED]`. Rotate/revoke them; deletion from the current tree alone will not remove Git history.
- Private pages and mutation endpoints lack reliable authentication and object-level authorization.
- `php/phpinfo.php` can disclose environment secrets and server details.
- Password reset and activation tokens are predictable, unexpired, stored in plaintext/status fields, and reusable.

### High

- No CSRF tokens on any mutation or logout.
- User/database values are output without escaping, creating stored/reflected XSS paths.
- Profile uploads are written to predictable public paths with insufficient validation.
- SMTP TLS verification is disabled.
- Book reservation, email, status history, and ownership changes lack transactions and can diverge.
- Borrow-email flow discloses full name, email, and phone to another user without a modeled consent/audit policy.

### Medium

- Bcrypt cost 4 is obsolete and weak.
- Manual `MAX(id) + 1` allocation is race-prone.
- Phone numbers and ISBNs are treated as numeric data and can lose leading zeros/formatting.
- Errors/exceptions are echoed to users.
- jQuery 3.2.1 is obsolete.
- Hard-coded Bitnami Windows paths and the Apache backup reveal implementation details.

## Credentials and personal information inventory

Actual values are intentionally omitted.

| Location | Sensitive material | Required handling |
|---|---|---|
| `conf/bookshare.xml` | Database host/name/user/password, SMTP account/password, deployment URL | Revoke/rotate; replace with environment secrets; purge from Git history only under a separately approved incident plan |
| Both SQL dumps | Names, usernames, emails, phone numbers, password hashes, activation/status values, reset tokens, timestamps, book ownership/history | Quarantine; never deploy; clean only through an approved migration pipeline |
| `Images/2021100055.jpg`, `Images/2023050123.jpg`, `Images/2023050124.jpg` | Numeric identity-like filenames; image provenance/licensing must be reviewed | Do not bulk-import; map only approved assets and strip identifying filenames |
| PHP email/reset code | PII assembled into emails and tokens in URLs | Replace with Supabase Auth templates and minimum necessary disclosure |
| `php/account.php` | Current user ID, name, phone, email, image path | Replace with authenticated server/client data access plus RLS |
| `temp/oldhttp.conf`, PHP hard-coded paths | Local server/Bitnami environment details | Keep private during audit; remove after replacement |

`Images/2023050123.jpg` visibly contains a Getty Images watermark, creating a separate licensing risk. `Images/2023050124.jpg` appears blank; `Images/sampleimage.jpg` is an unrelated device photograph. None should be assumed safe or necessary for migration.
