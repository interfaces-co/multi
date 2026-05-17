# Projectless Composer Route Behavior

Status: Current behavior note
Date: 2026-05-05

## Route Contract

The home route does not render a separate projectless surface. After auth and environment bootstrap, `ChatIndexRouteView` resolves the last chat target, then creates or reuses an environment-scoped projectless draft when no target exists.

That draft is immediately routed to `/draft/$draftId`. The draft route owns the first visible composer surface, so there is no separate projectless screen to render or test.

## Important Details

- `/draft/$draftId` is a first-class route. Current TanStack Router route priority keeps it from being captured by `/$environmentId/$threadId`.
- Projectless drafts are keyed by environment, not by a hidden Project.
- Project-backed drafts continue to use the logical Project key.
- Project-only tools stay unavailable until a Project context exists.

## Verification

- Browser coverage should assert that a projectless bootstrap reaches `/draft/$draftId`.
- Browser coverage should not assert a home-route fallback screen.
- `chat.new` should not create another projectless draft while the active route already owns the environment-scoped projectless draft.
