# UI refresh — 2026-10-29

Approved in `akapen/ui-directions-01.html` and `akapen/ui-directions-02.html`:

- Clean white/teal theme, generous spacing, standard 56-point header and 24-point icons with 48-point touch targets. Keep light/dark preferences.
- Remove the shared level/training-days banner. Home keeps its calendar, green streak flame and a small growth chart; details open separately. Standard home is fixed, with a scrolling fallback for enlarged text or exceptionally short screens.
- Follow the finger when paging months and dragging exercise rows. Tap an exercise to edit it separately; long-press anywhere on a row to reorder. Keep accessible up/down actions and edge autoscrolling.
- Re-selecting the current home/rooms tab does not navigate or reset its state.
- Room rows contain member-initial avatars and a name; tap the row to enter. Show invite QR/sharing immediately after creating a room and allow reopening it later. No photo-upload feature is introduced.
- Explicit per-room consent precedes automatic sharing of exercise names, weights, reps and dates. Backfill only the consent month's records and subsequent records. Completed workouts only; preserve offline data and reconcile edits/deletions. Existing manual shares remain separately manageable.
- Compare calendar-month completed set totals in Japan time, with bilateral pairs counting once and ties sharing a rank. The last review correction chooses **vertical bars, animated from bottom to top**. All members remain reachable by horizontal scrolling; details are paginated without truncating totals.
- Respect reduced-motion preferences. Do not commit or deploy automatically.

Implementation notes:

- Automatic copies and consent have their own server tables. Stopping sharing does not delete previous manual posts. Account/membership deletion cascades both consent and automatic copies.
- Cloud session UUIDs identify automatic snapshots across devices. A legacy installation ID can suppress the earlier manual duplicate. Retracted automatic snapshots retain tombstones while consent remains enabled.
- Production needs D1 migration `0003_automatic_room_sharing.sql` and a Worker deployment before the new client. `react-native-svg` requires a rebuilt native app; a JS-only update is insufficient on an older binary.

Verification:

- TypeScript and Expo lint passed.
- Mobile tests: 47 passed, including the real local Worker/D1 personal-sync test. Worker tests: 8 passed. Python server tests: 15 passed. Shared local-D1 fixture suites must run sequentially to avoid provisioning lock contention.
- Android and iOS production JS/Hermes bundle exports passed. Native binaries were not rebuilt, installed or released.
- Browser fixture checks used the actual React Native components via React Native Web, mocked app context/navigation, and the real local Worker for rooms. Confirmed whole-row long-press reordering, tap-to-edit, touch-based calendar paging, preserved month on reselecting Home, invite QR after creation, and upward-growing bars with a fixed bottom coordinate.
- Light/dark screens and narrow/six-row-month home layouts were captured. At 390×720, the chart ended at y=631 and the navigation began at y=640. There was no connected Android emulator/device; native gesture behavior and safe areas still need on-device confirmation.
