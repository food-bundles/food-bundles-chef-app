# Phase 04 — Kitchen Domain and Deterministic Calculations

Implement catalog references, recipes/yield, sales/portions, inventory movements/counts. Add opening stock, days cover, low-stock (<1 day), four-week weighted demand (40%, 20%, 20%, 20%), default 10% buffer, expected-use and purchase formulas. Use Decimal, explicit units and selling-unit rounding. Handle zero/missing sales, invalid yield and unit mismatch. Test against hand calculations and boundaries.

**Exit:** deterministic, documented, unit-safe formulas; no AI calculation.
