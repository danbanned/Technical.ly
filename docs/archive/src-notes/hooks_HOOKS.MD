# Plain English Summary of the Three Hooks
*These three files are all custom React hooks that manage different parts of an interactive map experience — one for hovering over article cards, one for controlling the "immersion" camera/state machine, and one for AI narration. Here's what each does:*

# useHoverImmerse = the trigger (user intent).
useHoverImmerse.js — "Dive in when the user shows interest"


# useImmersionController.js — The brain of the camera/state machine
This is the biggest and most important file. It's the state machine that controls how the map camera moves and how the UI shell fades between three modes:
- useImmersionController = the orchestrator (camera + UI + events).


 # useNarration.js — "When the insight changes, ask the AI to narrate it"
- useNarration = the content layer (AI-generated    description of the insight).

hooks.md
Documentation for the custom React hooks in this project. All three hooks work together to power the interactive map experience — from user intent (hover/click) to camera orchestration to AI-generated narration.

Table of Contents
Overview

Architecture at a Glance

1. useHoverImmerse

2. useImmersionController

3. useNarration

Shared Store & Events

The Immersion State Machine

Best Practices & Gotchas

Overview
This codebase uses three custom hooks to manage the "immersion" experience:

Hook	Role	Responsibility
useHoverImmerse	Trigger	Captures user intent (hover, click, long-press) and requests a transition.
useImmersionController	Orchestrator	Runs the state machine: moves the camera, fades the UI shell, fires side-effect events.
useNarration	Content	Turns the active insight into AI-generated narration.
They are intentionally decoupled. None of them import each other. They communicate through:

useMapStore — a Zustand store holding shared state (viewer, immersionMode, focusedCity, activeInsight, narration, etc.).

Custom DOM events (immersion:*) — dispatched by the controller, listened to by UI/3D components.

Architecture at a Glance
text
┌─────────────────────────┐
│  Article Card (UI)      │
│  spreads handlers from  │
│  useHoverImmerse        │
└───────────┬─────────────┘
            │ hover / click / long-press
            ▼
   immersionAPI.transitionTo('immersive', city)
            │
            ▼
┌──────────────────────────────────────────┐
│  useImmersionController                  │
│  • snapCamera (Reactive)                 │
│  • flyCamera  (Immersive / Ambient)      │
│  • animateShellOpacity                   │
│  • dispatches immersion:* events         │
│  • sets store state                      │
└───────────┬──────────────────────────────┘
            │ activeInsight changes
            ▼
┌──────────────────────────────────────────┐
│  useNarration                            │
│  • cancels stale requests                │
│  • calls narrateTract()                  │
│  • writes narration → store              │
└──────────────────────────────────────────┘
1. useHoverImmerse
File: useHoverImmerse.js

Purpose
Returns event handlers to spread onto an article card. The card becomes a "dive into this city" trigger via three input methods.

Signature
js
const handlers = useHoverImmerse(cityData, immersionAPI);
Parameters
Name	Type	Description
cityData	{ name, lat, lon, articleId }	The destination the camera flies to. If falsy, the hook is inert.
immersionAPI	{ transitionTo }	Typically the return value of useImmersionController.
Returns
An object of event handlers to spread onto a JSX element:

jsx
<article {...useHoverImmerse(city, immersionAPI)}>
  ...
</article>
Handler	Behavior
onMouseEnter	Starts a 1.5s hover timer → Immersive.
onMouseLeave	Cancels the hover timer.
onClick	Immediately enters Immersive (prevents default).
onTouchStart	Starts a 0.6s long-press timer → Immersive.
onTouchEnd	Cancels the long-press timer.
onTouchCancel	Same as onTouchEnd.
Timing Constants
js
const HOVER_DELAY = 1500;        // desktop hover dwell
const LONG_PRESS_DELAY = 600;    // mobile long-press
Guards
If cityData is falsy → does nothing.

If useMapStore.getState().isTransitioning is true → does nothing (a transition is already running).

2. useImmersionController
File: useImmersionController.js

Purpose
The central state machine for the immersion experience. Manages camera movement, UI shell opacity, and all downstream side effects for entering/leaving Immersive and Reactive modes.

Signature
js
const { transitionTo, exitImmersive } = useImmersionController();
Mount this once at the map root. It sets up the Escape key listener and the store-driven effect.

Returns
Function	Signature	Description
transitionTo	(mode, city) => Promise	Request a transition to 'ambient', 'reactive', or 'immersive'. Queued if one is in progress.
exitImmersive	() => Promise	Convenience wrapper: always transitions to 'ambient'.
The Three Modes
Mode	Camera	UI Shell	Triggered By
Ambient	Continental US, pitch -90	Full shell visible	Escape, Back button, fast scroll
Reactive	City + ecosystem, pitch -60	Slight fade	Scroll into a city's article
Immersive	Tight city zoom, pitch -45	Sidebar/feed hidden	Hover, click, long-press (via useHoverImmerse)
Camera Movement Rules
Transition	Method	Why
→ Reactive	snapCamera (instant)	Scroll-driven — cinematic flight feels sluggish.
→ Immersive	flyCamera (1.2s)	User explicitly asked to dive in.
→ Ambient	flyCamera (2.0s)	User explicitly asked to return.
Shell Opacity Targets
js
const SHELL = {
  ambient:   { header: 0.8, sidebar: 0.8, articleFeed: 1.0 },
  reactive:  { header: 0.65, sidebar: 0.65, articleFeed: 1.0 },
  immersive: { header: 0.4, sidebar: 0.0, articleFeed: 0.0 },
};
The ECOSYSTEM_MAP
A hardcoded graph of economically connected cities used to frame the Reactive view and draw capital-flow arcs.

js
const ECOSYSTEM_MAP = {
  Baltimore:    [ Washington, Philadelphia ],
  Philadelphia: [ Baltimore, Wilmington, Washington ],
  Pittsburgh:   [ Philadelphia ],
  Washington:   [ Baltimore, Wilmington ],
  Wilmington:   [ Philadelphia, Baltimore ],
};
Height Calculations
Both are derived from the geographic bounds of the primary city + its ecosystem:

js
// Reactive: frame the whole ecosystem
clamp(maxRangeDeg * 111_000 * 2.2, 90_000, 380_000)

// Immersive: tight zoom so fake buildings fill the viewport
clamp(maxRangeDeg * 111_000 * 0.03, 2_500, 5_000)
Transition Queue
A single transition runs at a time (inProgress ref).

New requests during a transition are enqueued via useMapStore.getState().enqueueTransition(mode, city).

When the current transition finishes, dequeueTransition() pops the next one.

A signature ("${mode}:${city?.name || 'none'}") dedupes repeat transitions to the same target.

Side Effects on Immersive Entry
The controller dispatches a sequence of CustomEvents on window:

Event	Detail payload	Purpose
immersion:ecosystemShow	{ city, ecosystem }	Render ecosystem arcs/labels.
immersion:fakeCityGenerate	{ city, articleId }	Build the symbolic 3D skyline.
immersion:cinematicTour	{ city, focusLandmark }	Run the camera tour.
immersion:boardLayout	{ city, ecosystem }	Lay out the info board.
immersion:boardExit	—	Fired when returning to Ambient.
It also:

Calls fetchCityStats(city.name) and awaits it before finalizing.

Updates <body class="immersion-..."> so plain CSS can react.

Keyboard
The hook registers a global keydown listener:

js
if (e.key === 'Escape' && immersionMode === 'immersive') exitImmersive();
Store-Driven Effect
The controller does not react to immersionMode === 'immersive' — immersive entry is always explicit via transitionTo(). It only reacts to:

js
if (immersionMode === 'reactive' && focusedCity) runTransition('reactive', focusedCity);
else if (immersionMode === 'ambient')             runTransition('ambient', null);
3. useNarration
File: useNarration.js

Purpose
Wires activeInsight changes to the AI narration pipeline. Call this once at the app root (e.g., PhiladelphiaApp).

Components read narration / narrationLoading / narrationError from the store — they never call narrateTract directly.

Signature
js
useNarration(); // no arguments, returns nothing
Behavior
Subscribes to activeInsight from the store.

When activeInsight.id changes:

Aborts any in-flight request for the previous insight.

Creates a new AbortController.

Sets narrationLoading = true, clears narration and narrationError.

Calls narrateTract(activeInsight, { signal }).

On success → setNarration(result).

On failure:

AbortError → ignored (expected).

NarrationUnavailableError → console.info (expected in local dev without an API key).

Any other error → console.error (likely an assertDocAligned rejection) and setNarrationError(err.message).

If activeInsight becomes null → abort + wipe all narration state.

Re-run Rule
The effect depends only on activeInsight?.id, not on every render:

js
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeInsight?.id]);
This is intentional — we don't want to refetch when unrelated store slices update.

Error Classes
Error	Meaning	Handling
AbortError	Request was cancelled by a newer insight.	Silently ignored.
NarrationUnavailableError	No backend available (expected locally).	console.info.
Anything else	Likely assertDocAligned failure.	console.error + store error.
Shared Store & Events
useMapStore (Zustand) — Key Slices
Slice	Read by	Written by
viewer	useImmersionController	App bootstrap
immersionMode	useImmersionController	Controller + useHoverImmerse consumers
focusedCity	useImmersionController	Article observer
isTransitioning	useHoverImmerse	Controller
previousImmersionMode	Controller	Controller (on immersive entry)
activeInsight	useNarration	Insight selection logic
narration / narrationLoading / narrationError	Components	useNarration
Custom DOM Events (immersion:*)
Dispatched by useImmersionController, listened to by UI and 3D-layer components:

immersion:ecosystemShow

immersion:fakeCityGenerate

immersion:cinematicTour

immersion:boardLayout

immersion:boardExit

Using events keeps the 3D layer and the UI layer from importing each other.

The Immersion State Machine
text
              ┌───────────────────────┐
              │       AMBIENT         │
              │  continental US view  │
              └───────────┬───────────┘
                          │ scroll into article
                          │ (snapCamera)
                          ▼
              ┌───────────────────────┐
              │      REACTIVE         │
              │  city + ecosystem     │
              │  (stays put)          │
              └───────────┬───────────┘
                          │ hover / click / long-press
                          │ (flyCamera, 1.2s)
                          ▼
              ┌───────────────────────┐
              │      IMMERSIVE        │
              │  tight city zoom      │
              │  narration + skyline  │
              └───────────┬───────────┘
                          │ Escape / Back / fast scroll
                          │ (flyCamera, 2.0s)
                          ▼
                       AMBIENT
Rules:

Reactive is sticky — it won't drift on its own. Only an explicit exit returns to Ambient.

Immersive can be entered from any mode via transitionTo('immersive', city).

Every exit lands in Ambient (v2 behavior).

Best Practices & Gotchas
Do
✅ Mount useImmersionController once at the map root.

✅ Mount useNarration once at the app root (e.g., PhiladelphiaApp).

✅ Spread useHoverImmerse handlers directly onto a card element.

✅ Read narration* state from the store in components — never call narrateTract yourself.

✅ Listen to immersion:* events if you need to react to mode changes in the 3D layer.

Don't
❌ Call useHoverImmerse in a loop — it creates timers per instance. Render one card, one hook.

❌ Trigger a transition while isTransitioning is true — you'll be queued, not rejected, but avoid spamming.

❌ Add dependencies to the useNarration effect — it should only re-run on activeInsight.id change.

❌ Forget cityData.articleId — immersion:fakeCityGenerate uses it.

Common Pitfalls
Symptom	Likely Cause
Hover never dives in	useMapStore.getState().isTransitioning stuck true, or cityData is falsy.
Camera snaps instead of flying	You're entering Reactive, not Immersive (by design).
Narration never appears	No backend configured — check for the NarrationUnavailableError info log.
Old narration flashes	activeInsight.id didn't change — the effect skipped. Ensure insight selection sets a new ID.
Escape doesn't exit	Listener isn't mounted — useImmersionController isn't rendered at the root.
File Reference
File	Exports	Notes
useHoverImmerse.js	useHoverImmerse(cityData, immersionAPI)	Per-card hook.
useImmersionController.js	useImmersionController()	Singleton at map root.
useNarration.js	useNarration()	Singleton at app root.
