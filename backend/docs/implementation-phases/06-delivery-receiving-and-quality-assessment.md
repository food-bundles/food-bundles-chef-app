# Phase 06 — Delivery Receiving

Implement delivery and per-crate/bag/tray records, manual-first receiving, actual weight/count and actual price. Track freshness, ripeness, damage, spoilage, size/grade and foreign matter (pass/watch/fail). Short delivery iff accepted quantity >5% below ordered. Separate reference and actual price. Validate media and target <1MB. If crate not fully visible, quantity estimate null. AI advisory only; chef measurement wins and manual receiving always works.

**Exit:** manual flow works with AI down; threshold/precedence tests pass; measure <1 min/item target.
