# Build analysis (owner-supplied, archived 2026-08-03)

> The owner's uploaded decomposition/parallel-agent analysis, archived verbatim as the
> source of the PIPELINE v2 ruling. Adopted/adapted/deferred per ARCHITECTURE.md §Pipeline v2.

**Structure `.mjs` modules around strict single-responsibility boundaries, explicit public contracts, and lazy composition so that file size, build time, and AI-context pressure remain bounded even as the overall system grows.**
The core “spine” should remain a thin orchestration layer. All UI surface area belongs in independently loadable component modules. This design directly addresses the observed growth to 876 lines in a single document, lengthening incremental builds, and the approaching context limits of concurrent coding agents.
### 1. Directory and File-Level Decomposition
Adopt a hierarchical layout that mirrors the product’s natural seams rather than the historical order of development:
```
src/
  spine/                  # core program – orchestration only
    index.mjs
    state.mjs
    events.mjs
  components/
    <feature>/
      index.mjs           # public barrel (re-exports only the stable API)
      Component.mjs       # primary UI logic (target < 250–300 lines)
      sub/
        SubPartA.mjs
        SubPartB.mjs
      styles.mjs          # or .css modules imported as side-effect
      hooks.mjs           # or pure utility functions
  shared/
    ui/                   # design-system primitives (buttons, layouts, etc.)
    utils/
    constants/
  platforms/              # device-specific adapters if needed
    mobile.mjs
    tablet.mjs
    desktop.mjs
```
- Keep every concrete implementation file under approximately 250–300 lines. When a file exceeds this threshold, extract a subordinate module immediately.
- Place the public surface of a component exclusively in its `index.mjs` barrel. Consumers import only from the barrel; internal files remain private.
- Never co-locate unrelated concerns (rendering, business rules, network, persistence) inside the same module.
### 2. Module Contract and Export Discipline
Each `.mjs` file must declare an explicit, minimal public interface:
```js
// components/FeatureX/index.mjs
export { FeatureX } from './FeatureX.mjs';
export { useFeatureXState } from './hooks.mjs';
// no other symbols
```
- Prefer named exports over default exports; they improve tree-shaking and make static analysis reliable for both bundlers and coding agents.
- Document the contract with JSDoc or a companion TypeScript declaration file (`.d.ts`) even if the implementation remains pure JavaScript. Parallel agents then operate against a stable type surface rather than the full implementation text.
- Prohibit circular imports. If two components appear to need each other, introduce a third, higher-level coordinator or a shared event bus owned by the spine.
### 3. Composition and Lazy Loading for Multi-Device Targets
Because the final product must run on phones, tablets and PCs, treat every non-critical component as optionally loadable:
```js
// inside a route or layout module
const FeatureX = await import('../components/FeatureX/index.mjs')
  .then(m => m.FeatureX);
```
- Use dynamic `import()` for routes, heavy visualizations, or device-specific variants. Static imports are reserved for the spine and the absolute minimum shared UI primitives.
- Maintain a single responsive layout system (CSS container queries or a small set of media-query-driven layout modules) rather than separate code trees per form factor. Device-specific behaviour belongs in thin adapter modules under `platforms/`.
- Keep pure rendering functions free of side effects so that the same component can be tree-shaken or server-rendered if a future progressive-web-app path is required.
### 4. Parallel-Agent Safety
When multiple agents work concurrently:
- Freeze the public contracts of the spine and of every component barrel before parallel work begins.
- Assign each agent a single leaf module or a small, non-overlapping subtree. Agents must not edit files outside their assigned boundary.
- Require that any change to a public export be accompanied by an update to the corresponding contract document or type definition. This prevents silent interface drift.
- Prefer pure functions and immutable data flowing through the spine’s event or state channels. Shared mutable state is the most common source of integration failures under concurrent editing.
### 5. Build and Tooling Implications
- Configure the bundler (Vite, Rollup or esbuild) with multiple entry points corresponding to the spine and the major feature barrels. Incremental rebuilds then touch only the changed subgraph.
- Enable aggressive tree-shaking and code-splitting. Large monolithic files defeat both.
- Introduce a lightweight size-and-complexity gate in CI (for example, a maximum line count or cyclomatic-complexity threshold per file). Violations force decomposition before the next agent cycle.
### 6. Practical Migration Path from the Current 876-Line Document
1. Identify the largest contiguous responsibilities inside the existing file.
2. Extract each responsibility into its own module under the structure above, preserving behaviour via temporary re-exports.
3. Replace the original large file with a thin barrel that re-exports the new modules.
4. Once the external surface is stable, delete the temporary re-exports and update all import sites.
5. Repeat until no implementation file exceeds the chosen line threshold.
This process can itself be parallelised: one agent extracts rendering, another extracts state logic, a third extracts event wiring, all against a frozen public interface.
The resulting architecture keeps individual `.mjs` files small enough for rapid incremental builds and for reliable consumption by coding agents, while the overall system remains a coherent, device-agnostic UI layered on the original spine. The same modular boundaries also simplify future extraction of individual components into independently versioned packages should the product later require it.
