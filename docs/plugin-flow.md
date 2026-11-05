# Plugin flow: when it starts and when it ends

## Start

The workflow starts when the user does one of these:
- pastes a `figma.com` URL, or
- asks to build a screen, extract tokens, verify fidelity or check responsiveness, or
- runs `/figma-to-web:build-screen`, `extract-tokens`, `verify-fidelity`, `check-responsive` or `setup-figwright`.

## End

The workflow ends only after step 7: the report is delivered and the `design_diff` baseline is saved. It also ends early, with a clear message, if a start gate fails (see "Early stops").

```mermaid
flowchart TD
    A([START: Figma URL or build / extract / verify / audit request]) --> B{Gates OK?<br/>Figwright ping, frames known,<br/>PHP + Composer + Node, Laravel app}
    B -- No --> X1([END early: tell user what is missing])
    B -- Yes --> C[1. Extract each section to JSON<br/>spec.md, tokens.json, sections/*.json, reference PNGs]
    C --> D[2. Foundation first<br/>tokens.css, base.css, Bootstrap .container,<br/>shared type-* classes, Blade components]
    D --> E[3. Build ONE section at the widest frame]
    E --> F[Desktop QA: compare + measure<br/>within 1px of Figma]
    F --> G[4. Narrower frames, then sweep 1920 to 320<br/>screenshots to qa/screen/section/w-width.png]
    G --> H{More sections?}
    H -- Yes --> E
    H -- No --> I[5. Write Feature test, Dusk test, docs]
    I --> J[6. Verify<br/>fidelity-verifier + responsive-auditor<br/>compare, measure, sweep, FCP under 1.8 s]
    J --> K{Clean?}
    K -- No, progress made --> L[Fix CSS, re-measure] --> J
    K -- No, 2 rounds without progress --> M[Record deviation + rationale<br/>in docs/screens/screen.md]
    K -- Yes --> N
    M --> N[7. Save baseline with design_diff]
    N --> O[Final report: files, breakpoints, derived decisions,<br/>unresolved deviations, pixel-diff %]
    O --> Z([END])
```

## Early stops

| Where | Stops when | What the plugin does |
|---|---|---|
| Figwright | `ping` fails or the Figma plugin is not connected | Tells the user to open the file and run Plugins, Development, Figwright |
| Frames | no URL or selection, or breakpoint unknown | Asks the user; never builds from a screenshot |
| Tools | PHP, Composer or Node missing | Tells the user before writing code |
| Read tool | a Figma node cannot be read | Reports it; never guesses the value |

## Later changes

After the first finish, any component fix or redesign re-enters at step 4: edit, then rerun the 1920px to 320px sweep until it is clean. A changed Figma design is found with `design_diff`, and only the affected code is edited.
