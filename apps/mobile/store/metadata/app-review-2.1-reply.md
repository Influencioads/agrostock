# Reply to Guideline 2.1 — Information Needed (AgroTraders, iOS 0.2.1 build 6)

Paste sections 1–6 into the App Store Connect reply, and the short version at the
bottom into App Review Information → Notes.

**Every statement below is true of build 6.** The previous draft was written for
build 4 and asserted several things the code contradicts — most seriously that the
service "does not hold, transfer or process funds between users" and uses "no AI
service, no payment processor and no data providers". All three were false. Do not
resurrect that text. Do not add claims to this one.

---

## ⚠ PRE-FLIGHT — this reply is not sendable until all five are done

1. **Deploy the API from a commit containing this branch.** Three of the statements
   below describe server behaviour that ships in `apps/api`, not in the iOS binary:
   listing edits returning to moderation, and the two softened quota/wallet error
   strings. Until the API is deployed they are false.

2. **Run the reviewer provisioning script against production.** Both demo accounts
   currently return `401 auth.invalid_credentials` on live, and `/api/cms/terms`
   still serves the 59-character placeholder `"AgroTraders Terms of Service.
   Replace with your legal copy."` The script fixes both:

   ```
   pnpm --filter @agrotraders/api appstore:prep
   ```

   Run it on the production host with `APPREVIEW_PASSWORD` set to a value you choose.
   **Do not use the committed default** (`AppReview!2026`) — it is public in this repo.

3. **Verify both, by hand, before replying:**
   - `curl -s https://api.agrotraders.org/api/cms/terms` must no longer say
     "Replace with your legal copy" (expect ~10,900 characters).
   - Sign in as **both** demo accounts on the physical device you film with.

4. **Seed the content the recording needs** — at least one listing, one community
   post and one review authored by an account *other* than the demo account, since
   the ⋯ report menu is hidden on your own content.

5. **Re-read section 6 against the open decisions at the bottom of this file.**
   Several are answers only you can give.

---

## Reply text

Thank you for the opportunity to provide more detail. Answers to each of your six
questions follow, and we have added the same information to the Notes field in App
Review Information.

### 1. Screen recording

A screen recording captured on a physical iPhone running the current iOS version is
attached. It begins with a cold launch and shows the typical user flow:

1. Cold launch onto the marketplace, browsing and filtering the catalogue as a guest.
2. Opening a listing, and the Terms of Service and Privacy Policy, all without an account.
3. Creating a new account, including the email-confirmation step.
4. Signing in with the demo account.
5. Browsing user-generated content — listings, the community feed, profiles and
   reviews — and using the **Report** control and the **Block** control on content
   posted by another member.
6. Placing an order for goods, showing that no payment is taken and no payment
   details are requested at any point.
7. Opening Billing to show the account's current plan and usage, which on iOS is
   read-only.
8. Signing out, signing in as the second demo account, and deleting that account in
   full, on screen, through to the signed-out state.

Account registration, login and account deletion are all demonstrated. Account
deletion is at **Account → Delete account**.

### 2. Purpose and target audience

AgroTraders is a business-to-business marketplace for the agricultural trade. It
brings together the people who move a crop from field to buyer: producers and sellers
of produce and equipment, buyers, transport operators, loading and labour contractors,
individual workers, and providers of agricultural services.

The problem it solves is that this trade still runs on phone calls, brokers and
personal contacts. A farmer with grain to sell has no reliable way to reach buyers
beyond the ones they already know, no visibility of what the crop is worth, and no
straightforward way to find a truck for it. Buyers have the mirror image of the same
problem, and every extra intermediary takes a margin that would otherwise go to the
producer.

AgroTraders gives both sides one place to publish what they have or need, search the
whole catalogue, negotiate directly by message, and arrange transport and loading —
with a profile, a rating and a trading history attached to every counterparty.

The audience is adults working in agriculture and agricultural logistics. The app is
free, open to the general public — no business registration is required to sign up —
and the entire catalogue is browsable without an account.

### 3. Setting up and accessing the main features

No account is needed to explore. On launch the app opens directly on the marketplace,
and browsing, searching, filtering, opening listings and viewing seller profiles all
work signed out.

Two demo accounts are provided (credentials in App Review Information → Notes):

- **appreview@agrotraders.org** — carries both buyer and seller permissions, so one
  login reaches the shopping tabs and the seller console. Use this for everything
  except deletion.
- **appreview.delete@agrotraders.org** — a second, disposable account provided
  specifically so account deletion can be tested through to completion without
  destroying the main demo account.

Both accounts are pre-confirmed, so no email round-trip is needed. If you prefer to
create your own account, registration sends a confirmation email; you can confirm by
opening the link, or entirely inside the app via **Sign in → Log in with OTP**, which
emails a six-digit code.

| Feature | Path |
|---|---|
| Browse and filter the catalogue | Home and Browse tabs, no account needed |
| Place an order | any listing → Buy Now → Checkout → Place order |
| Messaging and community | Account → Community |
| Report / block | the ⋯ menu on any listing, post, profile, requirement or review; long-press on any chat message |
| Sell | switch role to Seller → Inventory → Add |
| Plan and usage | Account → Billing (read-only on iOS) |
| Terms and Privacy Policy | Account → Legal (visible signed out) |
| Delete account | Account → Delete account |

No sample files are required, and no VPN or region setting is needed.

### 4. External services used to deliver core functionality

**Linked into the iOS binary.** Firebase (Google) — Core plus Cloud Messaging — is the
only third-party *vendor* SDK in the app. Google receives the device push token and the
notification text. No Firebase Analytics, Crashlytics or Performance Monitoring is
installed. The remaining native dependencies are open-source React Native / Expo
platform modules (navigation, gestures, animation, secure storage, image picker,
localisation) which make no network calls of their own.

**Server-side services our API uses to serve the app.**

- **Our own backend** — a first-party API and PostgreSQL database we operate at
  api.agrotraders.org, serving the catalogue, accounts, messaging, orders and
  moderation. Authentication is first-party (our own service issuing JSON Web Tokens);
  we use no third-party authentication provider and no third-party sign-in.
- **Google Cloud Translation** — server-side machine translation so users who read
  different languages can trade. Listing text, community posts and in-app message text
  are sent to Google for translation and the result is cached. No account identifier,
  email or device identifier accompanies the request, no model runs on the device, and
  no user content is used for training.
- **YooKassa, T-Bank and Robokassa** (Russian acquirers) — process card payments for
  website subscriptions, always on the acquirer's own hosted page. No payment SDK is
  linked into the iOS binary, and no purchase, top-up or acquirer hand-off is reachable
  from the iOS app.
- **Google Places / Geocoding** — used once, server-side, to compile a reference list of
  approximately 3,500 Russian wholesale market locations used as a location picker, and
  to convert a city name to coordinates for a trip-distance estimate. Only a place name
  is sent. No mapping SDK is linked into the iOS binary.
- **A public foreign-exchange rate feed** (open.er-api.com) — queried twice a day with
  no user data, powering the display-currency preference described in section 5.
- **Self-hosted object storage** on our own infrastructure, for uploaded images.
- **Transactional email** over SMTP, for address confirmation, password reset and
  order and account notifications.

No third party supplies catalogue content: every listing, photo and price is created by
users. The app contains **no** analytics SDK, **no** crash-reporting SDK, **no**
advertising or attribution SDK, **no** third-party sign-in, **no** payment SDK and
**no** mapping SDK. It contains no web view and no over-the-air code updates. It
requests no location access and no camera access; the only device permissions it
requests are photo-library access (to attach listing images, a profile photo and
verification documents) and notification permission after sign-in.

### 5. Regional differences

**The app functions consistently across all regions.** There is no geo-gating, no
country allow-list or deny-list, no IP-based geolocation, and no feature or content
that appears in one country and not another. Every user sees the same catalogue, the
same categories and the same functionality wherever they are.

Two things are localised, and both are user preferences rather than regional behaviour:

- **Language.** The app ships English and Russian. It follows the device language on
  first launch and can be changed at any time, on any device, in any country.
- **Display currency.** The user chooses which currency prices are shown in. This is a
  presentation conversion only; no feature or action depends on it.

Country and city appear as ordinary attributes of a listing or a profile — a seller
states where goods are located, a buyer filters by it — in the same way for every user.
Most of our current sellers are in Russia, so the catalogue a reviewer sees will be
weighted that way, but nothing in the app restricts it.

### 6. Regulated industry and third-party material

AgroTraders is a listings and messaging venue. We are not a party to any transaction
between users, and we do not take possession of, inspect or ship any goods.

**On payments.** The app collects no card number, bank account or other payment
instrument — no such field exists anywhere in it. There is no way to add money to an
account from the app, and no purchase is made in the app.

The service does maintain an internal account balance for each business user. In the
app a signed-in user can view that balance and its history; when they engage a
transport, loading or labour provider they may commit a budget from their existing
balance, which is held until the work is confirmed complete (then credited to the
provider, less our commission) or the engagement is declined or cancelled (then
returned). A user who has earned a balance can submit a withdrawal request consisting
of an amount only; we review and settle it outside the app. Balances are funded only
through our website, via licensed Russian acquirers on their own hosted pages — we
never see or store card data. On our production service the order-payment, wallet
top-up, manual adjustment and payout-approval operations are disabled at the server
and return an error.

Goods payments are not taken in the app. Placing an order records an agreement to
trade between two businesses; the parties settle directly.

**On In-App Purchase.** Everything transacted between users is a physical good or a
service performed in the real world, which falls under Guideline 3.1.5(a) rather than
In-App Purchase. Separately, the service offers optional paid business plans that raise
in-app limits (active listings, photos per listing, team seats). Because those unlock
in-app functionality, **we do not sell them on iOS at all**: the plan list, all prices,
the gateway selection and the checkout hand-off are compiled out of the iOS build. What
remains on iOS is read-only account status — current plan, usage, payment history and
cancellation — with no price, no button and no link to any other purchasing mechanism.

**On identity documents.** Verification is optional and is never required to browse,
list, message, bid or transact. A user may upload a trade licence, tax certificate,
bank confirmation or government identity document; files are stored privately on our
own infrastructure, retrievable only through a short-lived signed token, and are
reviewed by our staff, who mark the account verified or rejected. We run no automated
identity check and use no identity-verification vendor.

**On regulated goods.** The catalogue includes an Agrochemicals category containing
plant protection products, which are regulated in many jurisdictions. We do not sell
them; users list them. Our controls are that every new listing — and every subsequent
edit to a listing's name, description, images, category or attributes — is reviewed by
a person before it is publicly visible; that our Terms of Service require a seller to
hold every licence, registration or permit that applies to what they offer; and that
listings failing this are removed and the account restricted.

The Terms of Service, including the prohibited-items provisions and the zero-tolerance
clause for objectionable content, are readable in the app at Account → Terms of
Service, and the Privacy Policy at Account → Privacy Policy — both without signing in.

**On third-party material.** The app ships no licensed third-party material: no map
tiles, no commodity price feed, no stock photography and no third-party trademarks. All
imagery and listing copy is created by users, who warrant under our Terms that they
hold the rights to it. We operate a takedown process at legal@agrotraders.org.

### On user-generated content

- The sign-up screen presents the Terms of Service and Privacy Policy, both openable
  from that screen, and states that continuing constitutes acceptance.
- New listings, and edits to them, are reviewed by a person before publication;
  community posts, buyer requirements, messages and reviews publish immediately and
  are moderated after the fact.
- Report and block are available from the ⋯ menu on listing detail screens, auction
  lots, community posts, groups, profiles, buyer requirements and reviews, and by
  long-press on any chat message. Reports feed a staffed moderation queue with removal
  and account suspension available, and are acted on within 24 hours.
- Users can block any other user, which removes that person's listings and posts from
  their feed and search results and prevents that person from contacting them by
  message or hire request.
- Account deletion asks for the account password, takes an explicit destructive
  confirmation, is immediate and permanent, and revokes every session and the device's
  push token. It is refused only while the account still has a live obligation to a
  counterparty — an order in progress, funds held against a deal, an auction of theirs
  still running, or a live bid — and the screen names each one. A balance does not
  block deletion.

---

## Short version for App Review Information → Notes

```
No account is required to browse — the app opens on the marketplace and the full
catalogue, search, filters, listings and seller profiles work signed out.

Demo account:      appreview@agrotraders.org / <password>
Deletion demo:     appreview.delete@agrotraders.org / <password>
  (a second, disposable account so deletion can be tested to completion)
Both are pre-confirmed — no email step. To make your own account instead, use
Sign in -> "Log in with OTP" to confirm entirely in the app.

Delete account:    Account tab -> Delete account
Report / Block:    the ... menu on any listing, auction lot, post, profile,
                   requirement or review; long-press on any chat message
Terms & Privacy:   Account tab -> Legal (visible without signing in)

The app takes no payment and collects no card or bank detail. Goods and services
traded are physical/real-world (3.1.5(a)); buyers and sellers settle directly.
Optional paid plans unlock in-app limits, so they are NOT sold on iOS at all —
prices, upgrade buttons and checkout are compiled out of the iOS build, with no
link to any other purchasing mechanism. Billing on iOS is read-only.

Third-party SDK in the binary: Firebase (Core + Cloud Messaging) only. Server-side
we use Google Cloud Translation, Russian card acquirers (website only), a public
FX feed and Google Places for a market-location reference list.

The app behaves identically in every region. English and Russian; display currency
is a user preference. No geo-gating.
```

---

## Open decisions — resolve before sending, these are yours to make

1. **Legal-services branch.** 92 bookable legal service leaves (litigation,
   arbitration, notarisation) with no credential check — `certifications` is free text
   and `ServiceProvider.listApproved` defaults to `true`. Section 6 above does not
   mention it. Either disclose it honestly ("we are not a law firm, we do not verify
   bar registration, providers self-publish") or require a registration number and
   default `listApproved` to `false`. **Do not claim vetting that does not exist.**
2. **Google Places licensing.** The market importer keeps Google's business names and
   verbatim addresses and discards the Place ID — the reverse of what Maps Platform
   terms permit — and redisplays them with no Google map and no attribution. Get
   written confirmation or purge the `Market` rows.
3. **Alcohol and live animals in the taxonomy** (beer, wine, vodka, liqueurs; 8 animal
   species with no veterinary fields). Alcohol also feeds the App Store age-rating
   questionnaire, and a wrong rating is its own rejection.
4. **Banned substances in the taxonomy**: paraquat, chlorpyrifos, dicofol, and
   ammonium nitrate above 16% N (an EU-restricted explosives precursor). Deleting the
   leaves is the only control that does not depend on a moderator catching every
   listing. Note that *Plant protection products* has no registration-number field at
   all, while section 6 implies one is captured — add the field or soften the wording.
5. **KYC document types.** Dropping `government_id` and `bank_proof` from the upload
   screen would let section 6 say "business document" and remove a 5.1.1(v)/5.1.2
   conversation entirely. The in-app KYC intro copy still promises it "unlocks Safe
   Deal and higher limits", which now contradicts sections 2 and 6.
6. **Seller ad boost** (`seller/Ads.tsx`) lets a seller set a daily budget to promote
   their own listing. Apple has treated in-app boosts as digital services needing IAP.
   No charge is initiated in-app, so it is arguable — gate the menu entry on iOS if
   you want it off the table, but do not claim the feature does not exist.
7. **Name the SMTP provider**, and confirm production `S3_ENDPOINT` really points at
   your own MinIO — if it points at AWS, "self-hosted object storage" above is false.
8. **Live auctions cannot currently be filmed** — production `/api/auctions` returns
   `[]`. Either publish lots ending well after the review window, or leave the auction
   beat out of the recording, as section 1 above already does.
9. **Do not film Live Tracking.** iOS ships without react-native-maps, so the screen
   renders a placeholder card. Honest, but it looks broken on camera.
10. **The deletion demo is single-use.** If Apple tests deletion twice, the second
    attempt fails. Consider provisioning `appreview.delete2@` and saying so.
