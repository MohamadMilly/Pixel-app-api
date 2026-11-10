# Terms of Use — Library Subscriptions

These terms govern library subscriptions on the platform.

## Subscription activation
- Libraries register and request a subscription to a plan. The library remains **hidden and inactive**
  until an administrator **manually activates** the subscription (payment is handled outside the system).
- Activation starts the subscription for the plan's duration. If the library already has an active
  period, a newly activated subscription is **scheduled to begin when the current one ends** (renewals
  stack and never overlap).

## Subscription expiry (no manual deactivation)
- **A subscription cannot be deactivated manually.** Once activated, it stays active until it **expires
  automatically** at the end of its paid duration (`expiresAt`).
- Neither the library nor an administrator can cut an active subscription short. This guarantees a
  library the full period it paid for.
- A **pending** (not-yet-activated) request may still be cancelled by the library or rejected by an
  administrator, since no active period has begun.
- To stop a library from operating immediately for cause (abuse, policy violation), an administrator may
  **ban the account**, which hides the library and blocks access at once — this is an account action, not
  a subscription deactivation, and does not refund or alter the subscription record.

## Visibility
- A library is visible to users only while its account is active **and** it holds an active subscription.
  When the subscription expires, the library is automatically removed from all user-facing listings until
  a new subscription is activated.
