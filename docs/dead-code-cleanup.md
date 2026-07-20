# AgroTraders — Dead Code & Cleanup Report

_Audit date: 2026-06-28._

Conservative cleanup pass. **No files were deleted** in this round — the working
tree has no git history yet (no commits), so destructive removals were deferred in
favour of flagging. ESLint now surfaces dead code continuously.

## Removed / changed
| Item | Action | Reason |
|------|--------|--------|
| `Post` import in `admin.module.ts` | Removed | Unused (controller only uses `Get`/`Patch`) |
| Ternary-as-statement in mobile `SignIn`/`SignUp` | Rewritten to `if/else` | Lint error `no-unused-expressions`; clearer control flow |
| Stubbed `lint`/`typecheck` `echo` scripts (9 packages) | Replaced with real tooling | They masked the absence of any linting/typechecking |

## Flagged dead code (ESLint `no-unused-vars` warnings — not yet removed)
Left as warnings so they're visible without blocking CI; safe to remove in a
focused cleanup commit:

| File | Symbol |
|------|--------|
| `apps/mobile/src/navigation/tabs.tsx` | `BuyerDashboard`, `Saved` |
| `apps/mobile/src/screens/public/Browse.tsx` | `Row`, `active`, `setActive` ⚠️ |
| `apps/mobile/src/screens/public/Offices.tsx` | `View` |
| `apps/mobile/src/screens/public/ProductDetail.tsx` | `Ionicons` |
| `apps/web/src/console/sections/AdminDashboard.tsx` | `Badge` |
| `apps/web/src/console/sections/BuyerOrders.tsx` | `Button` |
| `apps/web/src/pages/LoginPage.tsx` | `e` (unused catch binding) |
| `apps/web/src/pages/MarketPage.tsx` | `t` (unused i18n hook) |

⚠️ `Browse.tsx` `active/setActive`: the state is declared but never used, implying a
filter/segmented control that was never wired up — verify intended behaviour before
deleting (it may be a missing feature rather than dead code).

## Known unused-but-intentional (kept)
- `LoaderJobs` section (`apps/web/.../sections/loaderco.tsx`) — superseded by the
  newer Loader dashboard but retained per build notes; not imported. Candidate for
  removal once the new dashboard is confirmed final.
- `mock/data` fallbacks in web — intentional offline/preview fallback, keep.

## Recommendation
After the first commit lands (so changes are revertable), run `pnpm lint:fix` and a
dedicated cleanup commit to remove the flagged imports and resolve the `Browse.tsx`
filter question.
