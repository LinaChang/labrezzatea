# Mobile navigation fix and visual refinement QA

Date: 2026-11-01 (Asia/Taipei).

## Visual truth and scope

The existing deployed website is the visual baseline. Preserve its ink-black and champagne palette, serif headings, real tea photography and chapter layout, with the specific refinements approved in this chat. Earlier generated redesign mockups are not the implementation target.

Source capture: `C:/Users/Nana/.codex/visualizations/2026/11/01/01a19729-8dcd-7103-be13-c1dcf6babfdd/site-fix/before-menu.jpg`.

Implementation captures in the same folder:

- `final-menu-mobile.jpg`: fixed scrolled menu, 390 × 844 CSS px and image pixels, 1× density.
- `after-menu-short.jpg`: independently scrollable menu, 390 × 568, 1×.
- `final-home-mobile.jpg`: homepage actions, 390 × 844, 1×.
- `final-home-small.jpg`: small-screen layout, 320 × 568, 1×.
- `final-teas-mobile.jpg`: classification and touch targets, 390 × 844, 1×.
- `after-award-mobile.jpg`: competition tea detail.
- `after-contact-desktop.jpg`: subject prefill, field outlines and focus, 1440 × 1000, 1×.
- `final-home-desktop.jpg`: desktop hero, 1440 × 1000, 1×.
- `final-craft-desktop.jpg`: cleaned fire photo and coherent overlay, 1440 × 1000, 1×.

Source and fixed 390 × 844 menu captures were opened together in the same comparison input. No density normalization was needed. Focused DOM measurements also confirmed overlay height, restored scroll position, visible filter counts, 44px targets, valid navigation and input focus. These readable viewport captures were sufficient; no additional screenshot crops were required.

## Findings and comparison history

1. **P1, scrolled mobile menu clipped to header.** Reproduced on production after SCROLL: menu height 144px in an 844px viewport. The scrolled header's backdrop filter created the containing block for its fixed child. Moved blur to an independent pseudo-element. Post-fix menu measures 390 × 844 at x=0/y=0; all entries are readable. Background is fixed/inert, Escape closes and restores scrollY=900. Keyboard focus stays in the header/menu. Switching to desktop unlocks the page.
2. **P2, short-screen menu access.** A 568px viewport requires scrolling the menu. Verified clientHeight=568 and scrollHeight=632; last link is reachable, with bottom=536 after scrolling. A fixed top mask keeps scrolling entries behind the logo controls. The normal-size menu was rechecked after this addition.
3. **P2, classification conveyed competition as a roast level.** Roast scale now contains light/medium/deep only. Competition selection hides the roast marker; competition product details show a separate series note. Mobile category links measure 44px high. Tested 4 competition items, 5 medium items, then browser Back restoring competition items and marker state.
4. **P1, product navigation broke after client-side category history changes.** Following a card after a category selection resolved a relative URL beneath the changed virtual route and returned 404. Added a stable per-page base URL using the configured deployment subpath. Retested switching categories twice, opening a medium product, then opening its contact link under `/labrezzatea/`. Product title and inquiry subject were correct; no broken loaded images.
5. **P2, duplicate text and overlay seam in craft photo.** Created a separate text-free photo using built-in ImageGen, preserving the original source. Initial implementation capture showed a horizontal overlay seam. Moved the shade onto the same parallax layer as the photograph. Latest `final-craft-desktop.jpg` has no seam or superimposed source caption.

## Fidelity surfaces

- **Fonts/typography:** Existing type families and heading hierarchy retained. Secondary text made brighter, roast labels increased on mobile. Long competition tea titles wrap within the viewport.
- **Spacing/layout:** Existing grid/chapter layout retained. Hero actions fit desktop and 390px mobile; 320px layout has no horizontal overflow. Compact contact banner creates earlier access to contact content.
- **Colors/tokens:** Existing dark/champagne system retained. Muted and footer text brightened; garden saturation reduced through CSS. Tea detail photo colors are unchanged.
- **Images:** Original photos retained; craft photo has a separately saved edited version and responsive JPEG outputs. Category photo framing retained. Loaded image checks did not find broken files.
- **Copy/content:** CTA shortened to 詢問這款茶; competition series is explicitly separate from roast depth. Required fields and the mail-program handoff are clearly described. No unverified tasting attributes were added.

## Validation

- `node site/build.mjs`: 64 generated pages, 85 legacy redirects, built-in local link/image checks passed.
- Rebuilt with `BASE_PATH=/labrezzatea/` and served that exact subdirectory on loopback for browser validation.
- `node --check site/src/main.js` passed.
- `git diff --check` passed.
- Browser interaction checks: SCROLL → menu → Escape; menu → product list; short menu scrolling; desktop breakpoint unlock; category counts, markers and history; product → inquiry subject; focus outline and required input state.
- Browser console returned no errors on the final local route checks.
- Reduced-motion guard remains in place. No new continuous marquee animation; particle count reduced and hero particles removed.

## Limits and follow-up

Browser checks used the available Chromium-based in-app browser, not a physical iOS/Safari device. Actual mail delivery was not exercised; the existing no-endpoint configuration deliberately opens the visitor's mail program and requires their confirmation. Full accessibility certification is outside this change.

No actionable P0/P1/P2 issues remain within the checked scope.

final result: passed
