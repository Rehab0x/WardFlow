# WardFlow v2 Design Plan

## Product Feel

WardFlow v2 should feel like a quiet clinical workstation, not a marketing dashboard. The interface should prioritize scanning, repeated use, and low-friction data entry during ward work.

The visual target is compact, neutral, and information-dense.

## Design Principles

- Data first. Layout, spacing, and typography should make clinical data easier to compare.
- Status color only. Color is reserved for clinical or workflow state.
- No decorative gradients, large hero areas, oversized cards, or ornamental icon bubbles.
- Desktop-first for entry and charting. Mobile-first for lookup, notes, and quick review.
- Stable dimensions. Patient rows, toolbar buttons, tabs, and table cells should not resize during interaction.
- Use icons for repeated tools, with tooltips where meaning is not obvious.
- Korean text should be clean, short, and consistent.

## Palette

Base:

- Page: `zinc-50`
- Surface: `white`
- Border: `zinc-200`
- Primary text: `zinc-900`
- Body text: `zinc-700`
- Secondary text: `zinc-500`
- Hint text: `zinc-400`
- Hover: `zinc-100`

Status:

- Warning: amber
- Danger: red
- Success/done: muted zinc unless clinically important

Avoid:

- Cyan/sky/blue as the dominant brand color.
- Purple gradients.
- Large colored backgrounds.
- Shadow-heavy cards.
- Rounded pill-heavy decoration.

## Typography

Rules:

- Use two weights mainly: 400 and 500.
- Use `font-mono tabular-nums` for room numbers, dates, times, D-days, lab values, counts, and registration numbers.
- Keep headings small inside the app. This is a working tool, not a landing page.
- Avoid negative letter spacing except restrained heading `tracking-tight` already used in local conventions.

Suggested scale:

- Page title: `text-[22px] font-medium`
- Section title: `text-[12px] font-medium`
- Body row: `text-[12px]`
- Row prefix: `font-mono text-[10.5px]`
- Count: `font-mono text-[22px] font-medium`
- Pill: `font-mono text-[10px] font-medium`

## App Shell

Desktop layout:

```text
------------------------------------------------
Top bar: WardFlow | search | actions | user
------------------------------------------------
Patient rail | Main workspace | Context panel
Patient list | Patient tabs    | Alerts/Lab/Meds
------------------------------------------------
```

Mobile layout:

```text
Top bar
Search / selected patient summary
Main content
Bottom nav for Today, Patients, Add, Lab, Settings
```

The patient rail should be dense and durable:

- admitted
- consult
- discharged/archive
- search by room, name, registration number
- quick add patient
- status indicators inline

## Main Screens

### Today

Purpose: morning and daily review.

Sections:

- patient counts
- reminders
- antibiotics
- abnormal/recent labs
- today schedules
- recent progress notes
- global notice

Behavior:

- Empty sections still show their count as `0`.
- Rows are clickable and navigate directly to the relevant patient tab.
- Critical items sort upward.

### Patient Workspace

Purpose: one patient, one working surface.

Header:

- room
- name
- sex/age
- registration number
- admission day
- tags
- attention toggle
- discharge/archive actions

Tabs:

- Overview
- Charting
- Lab
- Medications
- Notes
- Schedule

Context panel:

- current antibiotics
- active reminders
- latest abnormal labs
- today schedules

### Charting

Purpose: structured entry and OCS copy.

Design:

- form sections, not nested cards
- compact labels
- persistent copy action
- template insertion panel
- preview/copy format must be predictable

### Lab

Purpose: compare values over time.

Design:

- table first
- abnormal cells highlighted only where needed
- trend opens from a value or column header
- import result clearly separates matched and unmatched patients

### Medications

Purpose: current medication review and antibiotic duration tracking.

Design:

- active meds first
- antibiotics visually distinct by status, not by decoration
- paste import preview before save
- long-term antibiotic warning visible in Today and patient workspace

### Notes

Purpose: fast progress note and reminder entry.

Design:

- timeline list
- reminder date is visible in row prefix
- quick add at top
- search across current patient and global notes

## Components To Build First

- `AppShellV2`
- `TopBar`
- `PatientRail`
- `PatientRow`
- `StatusDot` or compact status icon group
- `WorkspaceHeader`
- `WorkspaceTabs`
- `ContextPanel`
- `DataSection`
- `MetricTile`
- `ClinicalRow`
- `ClinicalPill`
- `LabValueCell`
- `CopyBar`

## Copy Guidelines

Use short Korean labels:

- `오늘`
- `입원`
- `협진`
- `퇴원`
- `주의`
- `알림`
- `항생제`
- `검사`
- `일정`
- `메모`
- `차팅`
- `복사`
- `저장`
- `가져오기`
- `복원`

Avoid explanatory in-app text unless a destructive action or migration needs clarity.

## First UI Milestone

Rebuild these first:

1. App shell and top bar.
2. Patient rail.
3. Today page.
4. Patient workspace header and tabs.

After these are stable, rebuild each tab surface.

