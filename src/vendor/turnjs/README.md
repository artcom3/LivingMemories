# Turn.js third release

Source: https://github.com/blasten/turn.js/tree/08c1f6599a1412b145c7bf645a1f28c14db12742

License: upstream non-commercial BSD, retained in LICENSE.txt and the source header. This public release does not grant commercial-use rights. Commercial deployment requires appropriate permission/licensing from the author; do not treat it as standard BSD/MIT.

Local integration patches: ES module installer receives a private jQuery 3.7 instance (no window globals); instance-scoped event listeners and a destroy method release document handlers and animation timers while preserving React portal roots; disabled state correctly applies to all visible pages; optional requestTurn callback lets the application authorize a completed corner gesture before changing pages. Interactive controls and scrollable text are excluded from corner gestures. Rendering/folding mathematics are upstream Turn.js.
