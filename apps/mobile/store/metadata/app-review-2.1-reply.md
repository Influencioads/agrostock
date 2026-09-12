# Reply to Guideline 2.1 — Information Needed (AgroTraders, iOS 0.2.1 build 4)

Paste sections 1–6 into the App Store Connect reply, and the short version at the
bottom into App Review Information → Notes.

Every statement below is true of build 4 as submitted. Do not add claims to it.

---

## Reply text

Thank you for the opportunity to provide more detail. Answers to each of your
six questions follow, and we have added the same information to the Notes field
in App Review Information.

### 1. Screen recording

A screen recording captured on a physical iPhone running the current iOS version
is attached. It begins with a cold launch of the app and shows, in order: browsing
the marketplace as a guest, opening a listing, the reporting and blocking controls,
the Terms of Service and Privacy Policy inside the app, signing in with the demo
account, placing an order, taking part in a live auction, posting in the community
and reporting another member's post, the seller side with a listing awaiting
moderator approval, and finally account deletion carried out in full inside the app.

Account registration, login and account deletion are all demonstrated. Account
deletion is at **Account → Delete account**, and is performed on screen through to
completion.

### 2. Purpose and target audience

AgroTraders is a marketplace for the agricultural trade. It brings together the
people who move a crop from field to buyer: producers and sellers of produce and
equipment, buyers, transport operators, loading and labour contractors, individual
workers, and providers of agricultural services.

The problem it solves is that this trade still runs on phone calls, brokers and
personal contacts. A farmer with grain to sell has no reliable way to reach buyers
beyond the ones they already know, no visibility of what the crop is worth, and no
straightforward way to find a truck for it. Buyers have the mirror image of the same
problem. Every extra intermediary takes a margin that would otherwise go to the
producer.

AgroTraders gives both sides a single place to publish what they have or need,
search and filter the whole catalogue, negotiate directly by message, take part in
live auctions, and arrange transport and loading — with a profile, a rating and a
trading history attached to every counterparty.

The audience is adults working in agriculture and agricultural logistics. The app is
free, publicly available, and the entire catalogue is browsable without an account.

### 3. Setting up and accessing the main features

No account is needed to explore. On launch the app opens directly on the marketplace,
and browsing, searching, filtering, opening listings, viewing seller profiles and
reading the auction boards all work signed out.

A demo account is provided for the features that require one:

- **Username:** appreview@agrotraders.org
- **Password:** *(see App Review Information → Notes)*

This account carries both buyer and seller permissions, so a single login reaches the
shopping tabs and the seller console. A second account,
**appreview.delete@agrotraders.org** (same password), is provided specifically so that
account deletion can be tested through to completion without removing the main demo
account.

Main features and where to find them:

| Feature | Path |
|---|---|
| Browse and filter the catalogue | Home and Browse tabs, no account needed |
| Place an order | any listing → Buy Now → Checkout → Place order |
| Live auctions | Account → Live Auctions → open a lot → Place Bid |
| Messaging and community | Account → Community (feed, groups, direct messages) |
| Report / block | the ⋯ menu on any listing, post, profile or review; long-press on any chat message |
| Sell | switch role to Seller → Inventory → Add |
| Terms and Privacy Policy | Account → Legal (visible signed out) |
| Delete account | Account → Delete account |

No sample files are required. No special configuration, VPN or region setting is needed.

### 4. External services used to deliver core functionality

The app's third-party surface is deliberately small:

- **Firebase Cloud Messaging (Google)** — push notification delivery. This is the only
  third-party SDK linked into the iOS binary.
- **AgroTraders' own backend** — a first-party API and PostgreSQL database operated by us
  at api.agrotraders.org. It serves the catalogue, accounts, messaging, orders, auctions
  and moderation. Authentication is first-party (our own service issuing JSON Web Tokens);
  we do not use a third-party authentication provider.
- **Self-hosted object storage** on our own infrastructure, for images uploaded to listings
  and profiles.
- **Transactional email** through a standard SMTP provider, for address confirmation and
  password reset.

For the avoidance of doubt, the app contains **no** analytics SDK, **no** crash-reporting
SDK, **no** advertising or attribution SDK, **no** third-party sign-in, **no** AI or machine-learning
service, **no** payment processor, and **no** mapping SDK on iOS. It requests no location
access and no camera access, and contains no web view and no over-the-air code updates.
Data providers are not used: all catalogue content is created by users of the service.

### 5. Regional differences

**The app functions consistently across all regions.** There is no geo-gating, no country
allow-list or deny-list, no IP-based geolocation, and no feature or content that appears in
one country and not another. Every user sees the same catalogue, the same categories and
the same functionality wherever they are.

Two things are localised, and both are user preferences rather than regional behaviour:

- **Language.** The app ships English and Russian. It follows the device language on first
  launch and can be changed at any time in the app, on any device, in any country.
- **Display currency.** The user chooses which currency prices are shown in. This is a
  display conversion only.

Country and city appear as ordinary attributes of a listing or a profile — a seller states
where goods are located, a buyer filters by it — in the same way for every user.

### 6. Regulated industry and third-party material

AgroTraders is a listings and messaging venue. We are not a party to any transaction
between users, and we do not take possession of, inspect, store or ship any goods.

**On payments.** The app does not sell anything and contains no purchase flow. It does not
collect a card, bank detail or any other payment instrument, and it does not hold, transfer
or process funds between users. Placing an order in the app records an agreement to trade;
buyers and sellers settle directly with one another outside the app by whatever means they
agree. We are therefore not providing a payment, money-transmission or financial service,
and no financial licence is engaged.

**On identity documents.** Users may optionally upload a business document to obtain a
verification badge on their profile. It is not required in order to browse, list, message,
bid or transact, and it is not used for any regulated identity-verification purpose. The
badge indicates only that a document was supplied.

**On regulated goods.** The catalogue includes an Agrochemicals category, which contains
plant protection products. These are regulated in many jurisdictions. We do not sell them;
users list them. Our controls are:

- every listing is reviewed by a human moderator before it becomes publicly visible;
- our Terms of Service require that a seller hold every licence, registration or permit that
  applies to what they offer, and state the product registration number where one applies;
- listings that fail this are removed and the account restricted.

The Terms of Service, including the prohibited-items provisions and the zero-tolerance
clause for objectionable content, are readable in the app at Account → Terms of Service, and
the Privacy Policy at Account → Privacy Policy — both available without signing in.

**On third-party material.** The app ships no licensed third-party material: no map tiles,
no commodity price feed, no purchased dataset, no stock photography and no third-party
trademarks. All imagery and listing copy is created by users, who warrant under our Terms
that they hold the rights to it. We operate a takedown process at legal@agrotraders.org.

### On user-generated content

Since the app carries user-generated content, we confirm the safeguards in place:

- users must agree to the Terms of Service when they register;
- listings are moderated by a person before publication; posts, messages and reviews publish
  immediately and are moderated after the fact;
- every listing, post, profile, review and chat message carries a **Report** control, feeding
  a staffed moderation queue, with removal and account suspension available;
- users can **block** any other user, which hides that person's content and stops them making
  contact;
- reports are acted on within 24 hours.

---

## Short version for App Review Information → Notes

```
No account is required to browse — the app opens on the marketplace and the full
catalogue, search, filters, listings and seller profiles work signed out.

Demo account:      appreview@agrotraders.org / <password>
Deletion demo:     appreview.delete@agrotraders.org / <password>
  (a second, disposable account so account deletion can be tested to completion)

Delete account:    Account tab -> Account -> Delete account
Report / Block:    the ... menu on any listing, post, profile or review;
                   long-press on any chat message
Terms & Privacy:   Account tab -> Legal (visible without signing in)

The app sells nothing: there is no in-app purchase, no purchase flow, and no
payment instrument is collected. Buyers and sellers settle directly outside the app.

Third-party SDKs: Firebase Cloud Messaging (push) only. No analytics, no crash
reporting, no ads, no third-party sign-in, no maps on iOS.

The app behaves identically in every region. English and Russian; display currency
is a user preference. No geo-gating.
```
