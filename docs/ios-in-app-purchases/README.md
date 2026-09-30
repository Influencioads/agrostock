# iOS In-App Purchases (plan subscriptions)

Everything a person has to do outside the code to sell plans through Apple on iOS.
The products to create are in [`app-store-products.csv`](app-store-products.csv).

## What ships

| Purchase | iOS app | Android app | Website |
|---|---|---|---|
| Plan subscriptions | **Apple In-App Purchase** (StoreKit 2), except buyer and worker plans (not offered) | browser gateway checkout (Robokassa / YooKassa / T-Bank), unchanged | gateways |
| Add-ons | not sold | not sold | gateways |
| Wallet top-ups, escrow, hire/order payments, success fees | not in the app | not in the app | gateways |

The app takes no payment for wallet top-ups, escrow, hire/order payments or success
fees: there is no top-up or gateway call in `apps/mobile`, and balances are funded on
the website only. Those pay for real-world goods and services (freight, loading,
labour, produce), which App Review Guideline **3.1.3(e)** keeps outside In-App
Purchase anyway. Only the plan, which raises quotas inside the app, goes through Apple.

**Buyer and worker plans are not offered on iOS**, because they currently unlock no
enforced feature: the buyer quotas (`savedSearches`, `teamMembers`) are
`UNENFORCED_LIMIT_KEYS` in `packages/types/src/billing.ts`, worker plans carry only
feature flags, and no `PLAN_FEATURE_KEYS` flag is enforced anywhere. The iOS app hides
those two ladders and the CSV has no products for them. For the same reason the
product descriptions name only quotas that really buy something — no team members,
photos per listing or enquiries per month (see the business issue below), API access, badge, search priority, analytics, payout reports or
directory placement.

A **buyer on iOS** sees the **seller** plans, labelled *Seller*, in place of the hidden
buyer ladder. An account that holds the seller role can buy one right there; after the
purchase the screen's *Current plan* header and usage meters show that seller plan. An
account without the seller role is sent to add it first (the API only sells a plan for
a role the account holds).

> **Business issue to review:**
> - The website and the Android app still sell buyer and worker plans, which unlock
>   nothing enforced.
> - Seller plans advertise `photosPerListing` 10 (Standard) / 15 (Pro), but every
>   listing is capped at 6 photos (`MAX_PRODUCT_IMAGES` in
>   `apps/api/src/products/products.module.ts`), so both tiers really get 6.
> - Service-provider plans advertise `enquiriesPerMonth`, which nothing enforces (it is
>   counted, but it is an `UNENFORCED_LIMIT_KEYS` entry).
>
> iOS sells none of these; the website and Android still advertise all of them. Either
> enforce what those plans promise or stop advertising it.

Apple purchases are billing source `apple`, next to the three gateways. Product IDs are
derived, never stored: `<plan code>_<cycle>` (`appleProductId` in
`packages/types/src/billing.ts`), e.g. `seller_standard_yearly`.

## One-time setup in App Store Connect (in this order)

1. **Business → Agreements, Tax and Banking.** Sign the Paid Applications Agreement,
   fill in the tax forms and add a bank account. Until it shows *Active*, products
   can't be fetched even in Sandbox.
2. **Subscription groups** (Apps → AgroTraders → Monetization → Subscriptions). One
   group per role: *Reference Name* = CSV column `Subscription Group Reference Name`
   (10 groups: `seller`, `transporter`, `loaderco`, `workerco`, `accountant`, `packer`,
   `fulfillment_partner`, `finance_partner`, `processor`, `legal_advisor`; no `buyer`
   or `worker`). Add the group localizations for English and Russian from
   `Group Display Name EN` / `Group Display Name RU`.
3. **Subscriptions**, one per CSV row (60 rows = 20 paid plans x 3 cycles):
   - *Reference Name* and *Product ID* from the CSV. **Product IDs are permanent and
     can never be reused, even after deletion** — paste them, don't type them.
   - *Duration* from the CSV (`1 Month` / `3 Months` / `1 Year`).
   - *Level*: order the group so level 1 (the top tier) is first. All cycles of one
     tier share a level, so Standard → Pro is an upgrade and monthly → yearly of the
     same plan is a crossgrade.
   - *Price*: choose **Russia** as the base country and pick the RUB price point
     closest to `Price RUB` (that is the web price). Let Apple derive the other
     storefronts, or set them by hand.
   - *Localization* (English + Russian): `Display Name EN/RU` (max 35 chars) and
     `Description EN/RU` (max 55 chars). The CSV is already within both limits, and
     each description names only the enforced quotas that tier adds over the one below
     (seller plans: active listings only).
   - *Review information*: one screenshot per product — the app's
     **Account/More → Plan & billing** screen showing the plans (the hub tab is
     *Account* for buyer, service and worker roles, *More* for seller, transporter,
     loaderco and workerco).
   - Leave **Family Sharing off**. Plans belong to one AgroTraders account, and the
     switch can't be turned off again once on.
4. **App Store Server Notifications** (App Information → App Store Server
   Notifications). Version 2, and the **same URL for Production and Sandbox**:
   `https://api.agrotraders.org/api/billing/apple/notifications`
5. **Sandbox testers** (Users and Access → Sandbox → Test Accounts). Create at least
   two. On the device sign in under Settings → App Store → Sandbox Account.
6. **Terms of Use and Privacy Policy.** Auto-renewable subscriptions need both in the
   metadata:
   - Privacy Policy URL field: `https://agrotraders.org/p/privacy`
   - Terms of Use: keep **Apple's standard EULA** (leave the custom License Agreement
     field empty) and put both links in the App Description:
     `Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
     and `AgroTraders Terms: https://agrotraders.org/p/terms`.
   - Only move to the custom EULA field once `apps/api/prisma/legal/terms.txt` includes
     Apple's minimum terms for a developer EULA.

   Both AgroTraders pages are live CMS pages (Admin → CMS). The app links them from
   Plan & billing too.
7. **Republish the live Terms** once `apps/api/prisma/legal/terms.txt` section 8
   (payment) is updated. `prisma/appstore-prep.mjs` reads that file from the API image,
   so deploy the API first (*Server* below), then run the terms republish command
   documented in `apps/api/prisma/appstore-prep.mjs` / the prod deploy notes, from
   `/opt/agrostock`:

   ```
   docker compose -f infra/docker-compose.prod.yml --env-file .env \
     run --rm -e APPREVIEW_PASSWORD='<password in app-review-notes.txt>' \
     --entrypoint node api prisma/appstore-prep.mjs
   ```

   The same script re-mints the two App Review accounts and **resets their password**
   to `APPREVIEW_PASSWORD` (or its built-in default), so pass the one in
   `apps/mobile/store/metadata/app-review-notes.txt` or update that file. It also drops
   the Russian translation of the Terms page.
8. **First submission:** a new app's first subscriptions must go to review **with an
   app version**. On the version page, add every subscription under *In-App Purchases
   and Subscriptions* before pressing *Submit for Review*.

## Server

- Deploy the API **before** the iOS build goes to review: App Review and TestFlight
  buy in Sandbox against the production API. The deploy must apply migration
  `20260929120000_apple_in_app_purchases` — the `migrate` service runs
  `prisma migrate deploy` (see *Production (Docker)* in the repo README; migrate
  before swapping `api`).
- Optional env vars (defaults are correct for the live app):
  - `APPLE_IAP_BUNDLE_ID` — default `com.agrotraders.org`
  - `APPLE_IAP_APP_APPLE_ID` — default `6810728039`
- No Apple keys are needed. The API only verifies Apple-signed payloads against
  Apple's root certificates; no `.p8` key, shared secret or issuer ID.
- The production API accepts both Production and Sandbox transactions (it tries
  Production first, then Sandbox), so there is no separate staging setup.

## Build

`expo-iap` is a native module: it needs a **new EAS iOS build** and does not run in
Expo Go.

1. Bump `ios.buildNumber` in `apps/mobile/app.json` (`appVersionSource` is `local`).
2. `eas build -p ios --profile production`, then `eas submit -p ios`
   (`ascAppId` is already in `apps/mobile/eas.json`).
3. Test from TestFlight before submitting for review.

## Testing checklist (Sandbox / TestFlight)

Sandbox renews fast (1 month ≈ 5 min, 3 months ≈ 15 min, 1 year ≈ 1 hour) and
stops after a few renewals.

- [ ] **Buy.** Plan & billing shows App Store prices; buying activates the plan at
      once and a payment row appears in the billing history.
- [ ] **Restore.** Reinstall (or use a second device), tap *Restore purchases*; the plan
      comes back on the same AgroTraders account.
- [ ] **Upgrade / downgrade.** Standard → Pro takes effect immediately; Pro →
      Standard and monthly → yearly take effect at the next renewal.
- [ ] **Cancel** in Settings → Subscriptions (sandbox: Settings → App Store →
      Sandbox Account → Manage). The plan stays active and shows as ending on the
      period end; after expiry it drops to free.
- [ ] **Refund** via Apple → the plan drops to free. Sandbox accounts can't use
      reportaproblem.apple.com, so if you can't trigger one, watch the first real
      refund in the API logs.
- [ ] **Two groups at once.** An account with seller + transporter roles holds a seller
      and a transporter subscription side by side; changing one leaves the other alone.
- [ ] **Hidden ladders.** No buyer or worker plans appear on iOS. In the buyer view,
      Plan & billing shows the seller plans labelled *Seller*; after buying one, the
      *Current plan* header and meters show the seller plan, not the buyer's free plan.
- [ ] **Renewal notifications** reach the API (renewals extend the period without
      the app being opened).
- [ ] **Android** still opens the browser gateway checkout, unchanged.

## App Review notes

Update [`apps/mobile/store/metadata/app-review-notes.txt`](../../apps/mobile/store/metadata/app-review-notes.txt)
(it must stay under App Store Connect's 4000 characters; confirm the version/build on
its first line matches the build you submit) and paste that file into *App Review
Information → Notes*.

The demo account is the existing `appreview@agrotraders.org` (roles buyer + seller,
opens in the buyer view) named in that file; put the same login in the *Sign-in
required* fields. Demo a **Seller** purchase: Account → Plan & billing shows the Seller
plans, and buying Standard raises the active-listing limit (5 → 50) shown on the same
screen. No role switch is needed, since the account already holds the seller role.

## Known limitations

- The admin **revenue report sums gateway and App Store amounts as-is**: App Store
  amounts are gross (before Apple's commission) and in the storefront's currency, so
  totals mix currencies once non-RUB storefronts sell.
- **Add-ons are not in the app** on any platform; they are website-only.
- **Prices are not synced.** Changing a plan price in Admin doesn't change App Store
  Connect; edit both. A new plan or newly priced cycle needs a new product, and
  renaming a plan code orphans its products (the ID is `<plan code>_<cycle>`).
- **Sandbox purchases grant real plans** on the production API (that is what lets App
  Review and TestFlight work), so keep TestFlight groups to people you trust.
- **Russia storefront:** check that your customers can actually pay the App Store —
  since 2022 most Russian-issued cards can't be added to an Apple ID. Apple's rules
  also bar the iOS app from pointing users to the website to buy a plan.
