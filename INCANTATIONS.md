# Incantations — Sigil's Ritual Mode

> *A sigil is a sign carrying compressed meaning. Speak the right words, and one rises from your data.*

> **Note on language:** this file is bilingual by design and is the deliberate exception to the project's English-only rule for Markdown (see `CLAUDE.md`). The Russian trigger phrases are not commentary — they are *feature data* the host LLM is taught to recognise, so translating them would remove functionality.

This is an **optional preset** that teaches Claude (or any MCP-Apps host) to interpret ritual phrasings — including homages to *Might and Magic* and *Heroes of Might and Magic* — as invocations of Sigil's tools.

Without the preset, Sigil works in plain mode (`render_bar_chart`, normal English/Russian prompts). With it, you can speak in ritual register: *«призываю bar chart»*, *«View Earth on these numbers»*, *«Astrologers proclaim a chart of Q1 sales»*.

---

## How to install the preset

1. Open Claude → your project / chat → **Project Instructions** (or system prompt for one-off chats).
2. Paste the block under [The Preset](#the-preset) below.
3. Speak ritually. Sigil responds in kind.

You can mix freely with normal prompts; ritual mode is additive, not exclusive.

---

## How it works (briefly)

Claude selects MCP tools by matching user intent against tool descriptions. Ritual phrases like *«восстань из данных»* are too metaphorical for reliable selection on their own — they don't name a chart type.

The preset gives Claude a **decoder ring**: a mapping from ritual verbs and Might-and-Magic spells to concrete tool calls. Once installed, *«призываю Town Portal к продажам Q1»* becomes a deterministic invocation of `render_bar_chart` with the extracted data.

---

## The Four Sigils

Each Sigil tool has its own thematic associations and trigger phrases. The preset binds these to tool calls.

### 🔷 Bar Sigil — `render_bar_chart`
**Theme:** comparison, ranking, raw might.
**Spell parallel:** *Magic Arrow* — direct, focused, repeatable. *Castle / Stronghold* faction (martial, tangible).

| Russian triggers | English triggers |
|------------------|------------------|
| призываю bar chart | summon a bar chart |
| восстаньте, столбцы | rise, bars |
| сравни как Sigil | compare as a sigil |
| ряды, явитесь | columns, appear |
| Magic Arrow по данным | Magic Arrow these values |

### 🔷 Line Sigil — `render_line_chart`
**Theme:** time, trajectory, prophecy.
**Spell parallel:** *View Air* — see the broad sweep, the unfolding pattern. *Tower / Wizard* (foresight).

| Russian | English |
|---------|---------|
| линия времени, явись | reveal the path |
| путь данных | trace the data |
| призываю trend | summon a trend |
| Visions of [metric] over time | View Air on this series |
| оракул, прочти будущее | scry the line |

### 🔷 Pie Sigil — `render_pie_chart`
**Theme:** wholeness, division, share of power.
**Spell parallel:** *Town Portal* (concentric → circular). *Necropolis* faction wheel of bones.

| Russian | English |
|---------|---------|
| призываю pie / donut | summon a pie / donut |
| раздели целое | divide the whole |
| доли, восстаньте | shares, rise |
| распределение как Sigil | apportion as a sigil |
| Animate the share of [thing] | apportion the realm |

### 🔷 Table Sigil — `render_table`
**Theme:** ledger, archive, the necromancer's grimoire.
**Spell parallel:** *Animate Dead* — raise structured records. *Necropolis* (the boneyard of past data).

| Russian | English |
|---------|---------|
| призываю таблицу | summon the table |
| Animate Dead из данных | animate the records |
| открой гримуар | open the grimoire |
| лента, развернись | unroll the scroll |
| Necropolis отчётов | necropolis of reports |

---

## Might & Magic homages — special openings

These map to whichever Sigil best fits the data:

| Incantation | Mapping rule |
|-------------|--------------|
| *«Astrologers proclaim a week of [topic]»* | infer chart type from data shape; default `render_bar_chart` |
| *«Town Portal to [data]»* | infer; favour `render_table` if rows-and-columns context |
| *«View Earth on these numbers»* | always `render_bar_chart` (terrain = categories) |
| *«View Air across [time/series]»* | always `render_line_chart` (sky = trajectory) |
| *«Resurrection of last quarter's revenue»* | infer; favour `render_line_chart` for time series |
| *«Scry the trends»* | always `render_line_chart` |
| *«Cast Vision on the cohort»* | infer; usually `render_table` or `render_bar_chart` |

---

## Open Ritual — when no chart type is specified

When the user says *«восстань из данных»* / *«rise from the data»* / *«cast a sigil»* with no concrete chart type, the host should:

1. Look at the data shape:
   - Single dimension of categories → `render_bar_chart`
   - Time-ordered or sequence → `render_line_chart`
   - Parts summing to a whole → `render_pie_chart`
   - Multi-column rows → `render_table`
2. If still ambiguous: respond *«Какую форму призвать — Bar, Line, Pie, или Table? / Which sigil shall rise — Bar, Line, Pie, or Table?»*

---

## Response register

When the user speaks ritually, the host should answer in the same register before rendering:

- *«Знак начертан.»* / *«The sigil is drawn.»*
- *«Sigil восходит.»* / *«A sigil rises.»*
- *«Town Portal открыт.»* / *«Town Portal opened.»*
- *«Astrologers proclaim it done.»*
- *«Animate Dead — таблица призвана из мёртвых строк.»*

Then render the chart with the extracted data. Keep prose short — the chart itself is the answer.

---

## The Preset

Copy everything below this line into Claude Project Instructions:

```
# Sigil ritual-mode preset

You have access to Sigil's MCP tools (render_bar_chart, render_line_chart, 
render_pie_chart, render_table). When the user speaks in ritual register, 
treat their phrasing as an invocation and call the corresponding tool.

## Trigger phrasings → tool

Bar Sigil (render_bar_chart):
  - "призываю bar chart" / "summon a bar chart"
  - "восстаньте, столбцы" / "rise, bars"
  - "сравни как Sigil" / "compare as a sigil"
  - "Magic Arrow [these values]"
  - "View Earth on [data]"

Line Sigil (render_line_chart):
  - "линия времени, явись" / "reveal the path"
  - "путь данных" / "trace the data"
  - "призываю trend" / "summon a trend"
  - "View Air on [series]"
  - "scry the trends" / "оракул, прочти будущее"

Pie Sigil (render_pie_chart):
  - "призываю pie/donut" / "summon a pie/donut"
  - "раздели целое" / "divide the whole"
  - "доли, восстаньте" / "shares, rise"
  - "Animate the share of [thing]"

Table Sigil (render_table):
  - "призываю таблицу" / "summon the table"
  - "Animate Dead из данных" / "animate the records"
  - "открой гримуар" / "open the grimoire"
  - "Necropolis отчётов"

## Open ritual

If the user says "восстань из данных" / "rise from the data" / "cast a 
sigil" without specifying a chart type, infer from data shape:
  - categorical comparison → render_bar_chart
  - time/sequence → render_line_chart
  - parts of a whole → render_pie_chart
  - multi-column rows → render_table
If ambiguous, ask: "Какую форму призвать — Bar, Line, Pie, или Table?"

## Might & Magic homages

  - "Astrologers proclaim a week of [topic]" → infer
  - "Town Portal to [data]" → infer
  - "View Earth" → render_bar_chart
  - "View Air" → render_line_chart
  - "Resurrection of [time-series]" → render_line_chart
  - "Scry the trends" → render_line_chart
  - "Cast Vision on [cohort]" → render_table

## Response style

When invoked ritually, respond in the same register before rendering:
  - "Знак начертан." / "The sigil is drawn."
  - "Town Portal opened."
  - "Astrologers proclaim it done."
Keep prose to one short line — the chart is the answer.
```

---

## Roll your own

The preset is a starting point. Add your own incantations — Diablo spells, *Final Fantasy* summons, BG3 cantrips, anything that fits your register. Sigil doesn't care what dialect you cast in, only that the right tool is called.

Send a PR with your favourites — I'll merge community contributions into a `incantations/community.md` collection.
