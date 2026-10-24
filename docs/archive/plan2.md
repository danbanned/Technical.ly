 an application that looks exactly like https://technical.ly/ and apply the                      
    following concepts to the application You are helping build a 3D geospatial                     
    web application called the Innovation & Opportunity Mapper for Technical.ly.                    
    This app visualizes the relationship between university research (innovation                    
    inputs), startup venture capital (innovation outputs), and economic mobility                    
    (community outcomes) across the United States.                                                  
                                                                                                    
    Core Problem: Three critical pieces of the U.S. economy live in silos — where                   
     innovation comes from (university R&D), where money bets on ideas (venture                     
    capital), and whether that activity actually lifts communities (economic                        
    mobility). These fragmented, invisible connections between innovation and                       
    economic opportunity cannot be seen together in one place, layered over                         
    geography. Founders, investors, policymakers, and everyday people can't                         
    quickly spot patterns like "this region has tons of research but no startups"                   
     or "venture money is pouring in but local economic mobility is flat."                          
                                                                                                    
    Solution: A single interactive 3D map that fuses these layers so anyone can                     
    explore where innovation sparks, where capital flows, and how healthy and                       
    inclusive that activity really is. The 3D makes spatial patterns, heights,                      
    pulses, and flows instantly graspable. The user asks a question by looking,                     
    not by writing a query.         


The Unified Concept: A Living Article That Breathes With Data
What You're Actually Describing
The Technical.ly page keeps its identity — header, sidebar, article feed — but the entire background of the page is the living 3D globe. Not a video. Not an embedded iframe. The globe is the page background, visible through translucent UI layers.

As the user does normal things (scrolls, browses, hovers), the globe responds. It's not a separate destination. It's the atmosphere. And when the user leans in — hovers long enough, clicks a post — the atmosphere becomes the experience.

The Three States of Immersion
State 1: Ambient (Passive Globe)

The user is browsing normally. The header is at the top. The sidebar is on the right. Article cards are scrolling in a feed. But behind all of it, visible through the translucent background, the 3D globe is alive — slowly rotating, towers pulsing gently, arcs tracing between cities.

The header and sidebar have a frosted glass effect: deep charcoal with 70-80% opacity and backdrop-blur, so the globe is visible but doesn't compete with readability.

Article cards in the feed are opaque enough to read clearly.

The globe isn't focused on any one city. It shows the continental U.S., auto-rotating slowly.

The user feels: "Something is alive here. This isn't a normal article page."

State 2: Reactive (Globe Notices the Article)

As the user scrolls and a specific article about Baltimore enters the viewport, the globe subtly responds:

The camera gently pans toward Baltimore. No jarring fly-to yet — just a slow drift.

Data relevant to that article's city begins to glow brighter: the research tower over JHU intensifies, deal pulses around Baltimore become more visible.

Small floating stat badges appear near the city on the globe — little anchored cards showing "3.9B R&D," "120M Deals," "Mobility: 62."

The article card itself might show a faint glow around its edges, matching the data layer colors.

This all happens passively as the user scrolls. They don't click anything. The globe is reading along with them.

The user feels: "Wait — the map knows what I'm reading. It's showing me something."

State 3: Immersive (The Zoom-In)

If the user hovers over the article card (or a "Explore" button on it) for more than a second, or clicks it, the full transition triggers:

The camera smoothly dives from the continental view down to Baltimore, tilting to a 45° "board game" angle.

The header and sidebar don't disappear — they recede. They become more transparent, or slide to the edges, giving the globe more visual space.

The article card expands and re-positions itself as a panel anchored over the city on the map.

Four stat cards appear around it in a compass layout: Research (North), Deals (East), Mobility (South), Mismatch (West).

The user can now read the article inside the geography it describes, with the data physically surrounding it.

If they click "Back to Globe" or scroll away, the camera rises back to the ambient view. The header and sidebar return to full presence.

The user feels: "I'm not reading about Baltimore. I'm in Baltimore. And I can see the problem."

How the Header and Sidebar Behave
They never fully disappear. They shift.

Element	Ambient State	Reactive State	Immersive State
Header	Full opacity (80%), top of screen, all nav visible	Slightly more transparent (60%), still functional	Shrinks to a slim bar (48px height), only brand + back button visible
Sidebar	Present, frosted glass, shows region snapshot	Region snapshot updates to match scrolled article's city	Slides to far right edge, becomes a thin vertical tab. Tap to restore.
Article Feed	Normal scrollable column, opaque cards	Active article gets a subtle glow border	Feed fades out. Single article panel floats over the city.
This means the user never loses orientation. The Technical.ly brand and navigation are always accessible. The experience is additive, not replacing.

How the Globe Knows Which Article You're On
This is the key technical mechanism: scroll-driven data context.

Each article card in the feed has a data attribute: data-city="baltimore", data-layers="research,deals,mobility".

An Intersection Observer watches which article is most visible in the viewport.

When an article crosses the 50% visibility threshold, it dispatches an event to the Cesium viewer: setFocusCity('baltimore').

The Cesium viewer responds with a gentle camera.flyTo() and increases the visual prominence of layers relevant to that city.

No click required. The globe reacts to scrolling.

The Hover-to-Immerse Trigger
Each article card has a small "📍 Explore on Map" area or the entire card is hover-sensitive.

A timer starts on hover. After 1.5 seconds of continuous hover, the immersive zoom triggers.

On mobile, a long-press or a dedicated "Explore" button triggers the zoom.

Once zoomed, the user can interact with the 3D scene directly (toggle layers, slide time, click stats).

This is progressive disclosure at its purest: glance, notice, hover, dive.

Updated Roadmap With This Unified Vision
Phase	What's Built	Key Deliverable
Sprint 0	Foundation: data access, Cesium token, GitHub, storyboard	Baltimore chosen as demo city
Sprint 1–2	Standalone 3D map (towers + deal points + toggles)	Working map page, Baltimore towers visible
Sprint 3–4	Time slider, mobility heatmap, click-to-inspect	Full 3D map with all three layers
Sprint 5–6	Article template with inline badges + sidebar	Data-enhanced article (no globe background yet)
Sprint 7–8	Globe as page background (Ambient state), frosted glass UI	First "living background" demo
Sprint 9–10	Scroll-driven reactivity (Reactive state), Intersection Observer	Globe responds to which article is visible
Sprint 11–12	Hover-to-zoom (Immersive state), board-game stat layout, camera transitions	Full unified experience, Baltimore demo complete
What This Means for the Build
You're not building three separate apps. You're building one app with three modes, layered on top of each other:

The Globe Layer — CesiumJS, always running in the background.

The UI Shell — Header, sidebar, article feed. Frosted glass, responsive, accessible.

The Immersion Controller — A state machine that manages ambient → reactive → immersive transitions based on scroll position and hover/click events. Communicates between the DOM (Intersection Observer) and Cesium (camera methods).

All three share the same Zustand store. The same design tokens. The same data pipeline. Nothing is duplicated. Nothing is thrown away.

One Sentence to Carry Forward
The globe is not a feature. It's the page. The article is not separate. It's a lens into the data, and when you lean in, the lens becomes a door.



 State + animation primitives

  - src/store/useMapStore.js — added immersionMode, focusedCity, activeArticleId, articles, shellOpacity, isTransitioning, transitionQueue, and matching actions
  -ssrc/store/useMapStore.jss—dadded immersionMode,efocusedCity,nactiveArticleId,aarticles,eshellOpacity, isTransitioning, transitionQueue, and matching actions
  (setImmersionMode, setFocusedCity, registerArticle, enqueueTransi  on/dequeueTransition, etc.).
──- src/utils/transitionHelpers.js —─anima──Camera() and animateShellOpacity() returning Promises─with─prefers-reduced-motion─support.─────────────────────────────
❯ 
  Hooks (the central nervous system)
  - src/hooks/useImmersionController.js — the state-machine coordinator: runs queued transitions, drives camera flights + shell opacity in parallel, sets a
  immersion-{mode} body class, handles Escape-to-exit, and dispatches immersion:boardLayout once the immersive camera settles.
  - src/hooks/useArticleObserver.js — IntersectionObserver-based promoter; ≥50% visible card → Reactive, none visible → Ambient.
  - src/hooks/useHoverImmerse.js — 1.5s hover dwell on desktop, 600ms long-press on mobile, click bypass.

  Editorial shell
  - src/data/articles.js — five fixture articles (Baltimore, Philly, Pittsburgh, DC, Wilmington) with city/lat/lon/layers/stats.
  - src/components/Editorial/SiteHeader.jsx, RegionRail.jsx, ArticleCard.jsx, ArticleFeed.jsx, BoardGameStats.jsx — Technical.ly-style masthead, region snapshot
  rail that mirrors the active city, scrollable card feed, and the N/E/S/W board-game stat layout.
  - src/components/Layout/EditorialLayout.jsx — the new top layout: globe full-bleed at z-index 1, editorial shell at z-index 50, board frame at z-index 30. Mounts
   the controller exactly once.

  Globe + styles
  - GlobeViewer.jsx now takes mode="background" (skips opening fly-to, marks itself aria-hidden, full-viewport CSS).
  - src/styles/index.css — --shell-*-opacity custom properties, frosted-glass header/rail/cards, active-card glow, immersion-mode body-class overrides (feed fades,
   rail slides to edge tab, header collapses), board-game compass layout, responsive breakpoints, and reduced-motion overrides.
  - App.jsx now renders the new EditorialLayout directly. 
  
  Vite build is clean (220 kB JS / 20 kB CSS). Run npm run dev to see it.

✻ Churned for 7m 53s

※ recap: Goal: build the Living Article — globe as page background with Ambient/Reactive/Immersive states from plan2.md. All eight implementation tasks are 
  complete and the production build is clean. Next: run npm run dev to verify the experience in the browser. (disable recaps in /config)
  

    End-to-end flow now wired:

  1. User hovers a card 1.5s (or clicks) → useHoverImmerse fires transitionTo('immersive', city).
  2. useImmersionController flies the camera to 25 km / -45° pitch, fades the shell to immersive opacity, awaits fetchCityStats(city.name), then dispatches
  immersion:boardLayout.
  3. BoardGameStats listens for that event, becomes visible, and useBoardAnchoring starts converting the city's lat/lon ± compass offsets (±0.05° lat N/S, ±0.08°
  lon E/W) into screen coordinates every postRender frame.
  4. Four StatCards pop into place — Research (N), Deals (E), Mobility (S), Mismatch (W) — reading from focusedCityStats populated from
  /data/city-stats/{slug}.json.
  5. The Mismatch card runs the spec's ratio/severity logic and color-codes accordingly.
  6. Camera-idle (no movement for 300ms) → cards get a .snapped class for sharp text.
  7. Scroll-to-exit: a >200px wheel/touch gesture during immersive returns the user to the previous mode (also Escape, also the header's "Back to feed" button).
  8. Leaving immersive → setIsVisible(false) → cards unmount.

  Files added in this pass:
  - src/components/Immersive/{BoardGameStats.jsx, StatCard.jsx, useBoardAnchoring.js, statCardConfigs.js}
  - src/components/Immersive/{BoardGameStats.module.css, StatCard.module.css}
  - public/data/city-stats/{baltimore, philadelphia, pittsburgh, washington, wilmington}.json
  - Store: focusedCityStats + fetchCityStats action
  - Controller: scroll-to-exit + fetchCityStats call before board dispatch
  - Old src/components/Editorial/BoardGameStats.jsx removed; EditorialLayout now imports from Immersive/.
  
  Run npm run dev to drive it. The full hover-to-immerse + board-game stat layout is live for all five demo cities.

✻ Sautéed for 2m 0s