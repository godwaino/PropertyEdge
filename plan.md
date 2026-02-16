# Plan: Make the Value Proposition Instantly Obvious

## Current State
The page goes: Header ("Property Edge AI" + one-line tagline) → straight into a dense property form with 10+ fields. No hero, no explanation of what you get, who it's for, or why you'd use it. A first-time visitor has to read the form fields to understand what the app does.

## What I'll Build

### 1. Hero Section (new component, inserted between Header and PropertyForm)

A full-width above-the-fold section with:

**Headline:** "Is this property worth it?" (or similar — punchy, benefit-oriented)

**One-liner:** "Paste a Rightmove or Zoopla listing → get an instant fairness check with Land Registry comparables, risk flags, and a clear verdict."

**Who it's for — 4 compact pills/badges:**
- First-Time Buyer
- Property Investor
- Home Mover
- Content Creator

**What you get — 3-4 icon-less feature bullets:**
- AI valuation backed by real Land Registry sold prices
- Red flags, warnings, and positives with £ impact
- Instant GOOD DEAL / FAIR / OVERPRICED verdict
- Shareable report (note: this is future — I'll mark it "coming soon")

**Primary CTA button:** "Analyse a Listing" — scrolls down to the form and auto-opens the paste panel, with the existing demo data pre-filled so they can click immediately.

### 2. Modify PropertyForm Behavior

- Add an `id="analyze"` anchor on the form so the hero CTA can smooth-scroll to it
- Accept an optional prop to auto-expand the paste/import section when triggered by the hero CTA
- The existing pre-filled demo data (10 Deansgate, M3 4LQ) already serves as the "example pre-filled" — no change needed

### 3. Adjust App.tsx Layout

- Insert the Hero component between Header and PropertyForm
- Pass a state setter so the hero CTA can trigger the form's import panel to open
- Only show the Hero when there are no results displayed (once results show, hero collapses or hides to keep focus on the report)

### 4. Files Changed

| File | Change |
|------|--------|
| `client/src/components/Hero.tsx` | **New** — hero section component |
| `client/src/components/PropertyForm.tsx` | Add `id` anchor, accept `autoOpenImport` prop |
| `client/src/App.tsx` | Insert Hero, manage scroll-to-form state |

### 5. What I Will NOT Do

- No new pages or routing
- No PDF/share feature yet (will show "coming soon" badge)
- No changes to the backend, analysis logic, or results display
- No changes to the color scheme or overall design language
- Keep it concise — no long marketing paragraphs
