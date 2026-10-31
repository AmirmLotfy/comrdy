# COMRDY Frontend Screen Specifications

## 1. Frontend principles

- Operational headings describe the current object/state.
- Product UI uses light mode as default.
- The app is table- and evidence-led; charts are secondary.
- Generated explanations never replace structured evidence.
- No dead navigation in hackathon build.
- Desktop-first for authoring/investigation; mobile remains usable for review.

## 2. Route map

```text
/app
/app/:workspace/:project/overview
/app/:workspace/:project/runs
/app/:workspace/:project/runs/:runId
/app/:workspace/:project/cases/:caseId
/app/:workspace/:project/replays/:replayId
/app/:workspace/:project/suites
/app/:workspace/:project/suites/:suiteId
/app/:workspace/:project/missions
/app/:workspace/:project/missions/new
/app/:workspace/:project/missions/:missionId
/app/:workspace/:project/contracts/:contractId
/app/:workspace/:project/violations
/app/:workspace/:project/chaos
/app/:workspace/:project/targets
/app/:workspace/:project/agents
/app/:workspace/:project/integrations
/app/:workspace/:project/api-keys
/app/:workspace/settings/team
/app/:workspace/settings/audit
/app/:workspace/settings
```

MVP must implement only routes that have real functionality.

## 3. Global shell

### Left navigation

Expanded 232px, collapsible to 64px.

Top:
- COMRDY wordmark;
- project selector.

Sections:
- Overview;
- Runs;
- Test suites;
- Missions;
- Violations;
- Chaos;
- Targets;
- Integrations;
- API keys.

Bottom:
- Docs;
- Settings;
- user.

### Top utility bar

- breadcrumb;
- global environment badge;
- optional command/search trigger;
- right-side contextual actions.

Do not duplicate page title in both sidebar and topbar.

## 4. `/app` - workspace/project chooser

Purpose: orientation if user belongs to multiple projects.

Content:
- recent projects table/list;
- `New project` action;
- recent run status.

For single-project hackathon hosted demo, redirect directly to overview.

## 5. Overview

### Header
`Overview`
Secondary text: target + selected time range.

### Reliability strip
A full-width horizontal group:

```text
Transaction Reliability 96.0%
False Success Rate       2.0%
Hard Failure Rate        2.0%
Prevented Invalid Value  $428.00
```

Each metric includes a small delta only if a real previous period exists.

### Trend
Line chart: ATR by run/date.

### Violation ranking
Horizontal bars:
- Value drift;
- Selection drift;
- Retry drift;
- Refund drift.

### Latest runs table
Columns:
- Run;
- Suite;
- Cases;
- ATR;
- False success;
- Critical;
- Target;
- Started.

### Empty state
If no runs: replace dashboard with one focused starter action, not zero-value charts.

## 6. Runs list

Header:
- `Runs`
- `Run suite` primary action.

Toolbar:
- search ID/name;
- result/classification filter;
- suite;
- target;
- agent;
- date.

Table:
- Run ID;
- Suite;
- Status;
- Cases;
- ATR;
- False success;
- Critical violations;
- Prevented value;
- Started;
- Duration.

Click row -> run detail.

## 7. Run detail

### Header
Title: suite name.
Subline:
`Run R-1048 · Demo Store · Browser Agent v3 · Seed 48031`

Actions:
- `Replay failures`;
- `Export results`;
- overflow with cancel only while running.

### Status strip
- current state;
- progress cases complete/total;
- ATR;
- false successes;
- hard failures;
- prevented invalid value.

### Live event banner
Only while active:
`7 of 9 missions complete. 2 agents still running.`

No animated gradient/progress hero.

### Cases table
Columns:
- Mission;
- Result;
- First drift;
- Authorization;
- Capture;
- Amount;
- Duration;
- Agent;
- Evidence.

Row click -> case detail.

### Filters
Result filter chips:
`All / Pass / False success / Hard fail / Infra`

These are compact segmented controls, not colorful pills.

### Right panel optional
During live run, selected case can show compact activity. On completion, hide by default.

## 8. Case / Transaction detail

The product signature page.

### Hero/header area
Not a marketing hero. Compact operational header.

Title:
`False success blocked`

Subtitle:
`Ocean Shell · Size changed from M to S before authorization.`

Right state block:
```text
AUTHORIZED  $139.00
CAPTURE     BLOCKED
```

Metadata:
- case ID;
- mission;
- run;
- target;
- agent;
- seed.

### Section A - Intent Lineage
Full width.
Sticky attribute column.
Checkpoint columns.

First drift is the strongest semantic highlight on the entire page.

### Section B - Failed invariants
Compact table:
- invariant;
- expected;
- observed;
- checkpoint;
- severity;
- evidence.

### Section C - Payment timeline
Vertical chronological list.

### Section D - Agent trajectory
Collapsible list of significant actions, not token-by-token chain-of-thought.
Show observable actions/tool calls/pages only.

### Section E - Raw evidence
Tabs:
- state;
- PayPal;
- browser;
- screenshots;
- event log.

Raw JSON uses evidence console dark surface.

### Sticky actions
- Replay transaction;
- Add regression case;
- Copy evidence link.

## 9. Replay compare

### Header
`Replay comparison`

Two run/case identifiers.

Control:
`Changed variable: Chaos profile - Shipping +25 -> Off`

### Outcome summary
Two columns:

```text
ORIGINAL                   REPLAY
False success blocked      Pass
First drift: Checkout      No drift
Total: $174                $139
Capture: blocked           captured
```

### Diff view
GitHub-like split normalized diff.

Tabs:
- Intent Lineage;
- State diff;
- Event diff;
- Payment diff.

### Conclusion
Generated root-cause note is optional and labeled `Suggested explanation`.

## 10. Test suites list

Table:
- Suite;
- missions;
- target;
- agent;
- chaos profile;
- policy;
- last result;
- last run.

Actions:
- Run;
- Duplicate;
- Archive.

## 11. Test suite detail

Header:
- name;
- `Run suite`;
- edit.

Sections:
1. Missions table with order/enable.
2. Execution configuration.
3. Chaos profile.
4. Pass/fail policy.
5. Run history.

Policy editor uses explicit numeric fields and switches.

## 12. Missions list

Table:
- Mission;
- tags;
- current contract version;
- status;
- last outcome;
- updated.

CTA: `New mission`.

## 13. New mission

### Step 1 - mandate
Large textarea + examples button.

### Step 2 - compile
Loading state is factual:
`Compiling hard constraints…`

### Step 3 - contract review
Two-pane layout:
- source mandate;
- constraints table.

Actions:
- Edit mandate;
- Edit contract;
- Save;
- Run now.

Do not show an AI chat panel.

## 14. Mission detail

Tabs:
- Contract;
- Run history;
- Variants;
- Settings.

Contract version switcher.

## 15. Contract detail

Read-only by default.

Header:
- version;
- locked status;
- hash;
- compiler metadata.

Sections:
- source mandate;
- constraints;
- JSON;
- usage history.

Editing creates a new version.

## 16. Violations

Purpose: cross-run issue triage.

Table:
- Code;
- Category;
- Severity;
- Count;
- Affected missions;
- Last seen;
- Trend;
- Verified fix?.

Selecting a violation opens evidence examples and linked remediations.

## 17. Chaos

### Profile list
Rows:
- Profile;
- Rules;
- Last used;
- enabled.

### Rule editor
Fields:
- trigger checkpoint;
- predicate;
- mutation;
- value;
- probability;
- once/repeat;
- target safety validation.

Preview translates technical rule to plain English.

Example:
`Before authorization, add $25 to shipping once when product is Ocean Shell.`

## 18. Targets

Rows:
- Target;
- URL;
- Environment;
- Platform;
- Capabilities;
- Health;
- Last verified.

Target detail:
- connection;
- auth;
- capability test;
- safety restrictions;
- recent runs.

Production target has a prominent immutable badge; Chaos toggle is unavailable.

## 19. Agent profiles

Rows:
- name;
- runner;
- provider/model;
- prompt version;
- last used;
- active.

Profile detail avoids exposing secret keys.

## 20. Integrations

Rows/cards allowed because integrations are discrete actionable objects.

### PayPal Sandbox integration
Displays:
- Verified / degraded;
- Client ID masked;
- credential fingerprint;
- webhook status;
- last verified;
- reconnect/remove.

### Browser runner
- status;
- concurrency;
- region;
- last health check.

## 21. API keys

List:
- name;
- prefix;
- scopes;
- created;
- last used;
- expires;
- revoke.

Create modal:
- name;
- scopes;
- expiration.

Secret reveal page:
`Copy this key now. COMRDY will not show it again.`

## 22. Audit log

Mercury-style dense chronological table.

Columns:
- Time;
- Actor;
- Action;
- Resource;
- Details.

Filters:
- actor;
- resource;
- action;
- date.

## 23. Settings

Minimal sections:
- Workspace;
- Data retention;
- Notifications later;
- Danger zone.

No giant preference catalog in MVP.

## 24. Auth screens

Simple centered form, maximum 420px.

- white background;
- COMRDY wordmark;
- email/OAuth;
- no illustration;
- no gradient.

## 25. Onboarding screens

Use a narrow focused frame with a small progress indicator `1 of 4`.

The product itself appears as soon as the first run begins.

## 26. Loading/skeleton rules

- tables: 6-8 row skeleton;
- lineage: fixed-size grid skeleton;
- detail pages: title and section skeletons;
- never use shimmer excessively;
- live run uses real event states rather than indefinite skeleton.

## 27. Toasts

Use only for short confirmation:
- `API key created.`
- `Replay queued.`
- `PayPal Sandbox verified.`

Errors that need action belong inline, not toast-only.

## 28. URL/share behavior

Run/case/replay filters encoded in URL where useful.
Evidence links can be shared within workspace permissions.
No public evidence URLs by default.
