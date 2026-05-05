# Sigil — Техническое Требование

## 1. Обзор проекта

### 1.1 Что это
MCP Apps сервер с интерактивными chart-виджетами, которые рендерятся inline в AI-хостах (Claude, ChatGPT, VS Code Copilot, Microsoft Copilot, Goose). Пользователь подключает сервер один раз — AI-ассистент начинает визуализировать данные интерактивными графиками вместо текстовых таблиц.

### 1.2 Ключевой дифференциатор
Все существующие MCP chart серверы (`@antv/mcp-server-chart`, `@ax-crew/chartjs-mcp-server`, `mcp-echarts`) генерируют **статичные PNG-картинки или HTML-сниппеты**. Sigil — первый сервер на **MCP Apps** расширении, который рендерит **живые интерактивные виджеты** в sandboxed iframe с hover, zoom, click и экспортом.

### 1.3 Целевая аудитория
Пользователи Claude, ChatGPT, VS Code Copilot, которые работают с числовыми данными: аналитики, менеджеры, разработчики, исследователи.

### 1.4 Цели проекта
- Занять имя `sigil` на npm рабочим пакетом (v0.1.0)
- Валидировать MCP Apps pipeline от сервера до рендера в Claude
- Создать контент для персонального бренда (статья, демо-видео)
- Получить 100+ GitHub stars за первый месяц

---

## 2. Технологический стек

| Слой | Технология | Обоснование |
|------|------------|-------------|
| **MCP Server** | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` | Официальный SDK для MCP Apps |
| **Server Transport** | Express + `StreamableHTTPServerTransport` | HTTP для remote-режима |
| **Stdio Transport** | `StdioServerTransport` | Для локального запуска через `npx` |
| **Chart Library** | Recharts | Декларативный React API, tooltips/responsive/animations из коробки, хорошо бандлится в single-file. Если bundle size станет проблемой — миграция на Chart.js или uPlot (каждый виджет изолирован) |
| **UI Framework** | React 18+ | Требуется для Recharts |
| **Bundler** | Vite + `vite-plugin-singlefile` | Бандлинг каждого виджета в один HTML-файл |
| **Language** | TypeScript | Строгая типизация для tool schemas и данных |
| **Dev Tunneling** | cloudflared | Проброс localhost для тестирования с Claude web |

### 2.1 Ключевые npm-зависимости

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "@modelcontextprotocol/ext-apps": "latest",
    "express": "^4.x",
    "recharts": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-singlefile": "latest",
    "@types/react": "^18.x",
    "typescript": "^5.x"
  }
}
```

---

## 3. Архитектура

### 3.1 Как работает MCP Apps

```
Пользователь → пишет промпт → AI-хост (Claude)
  → видит доступные тулы с описаниями
  → решает вызвать render_bar_chart
  → отправляет tool call с параметрами на MCP-сервер
  → сервер возвращает данные + хост рендерит связанный HTML-виджет
  → пользователь видит интерактивный график в iframe внутри чата
```

### 3.2 Механика MCP Apps

1. Тул декларирует `_meta.ui.resourceUri` → указывает на `ui://` ресурс
2. Хост может предзагрузить UI ещё до вызова тула
3. HTML-ресурс рендерится в sandboxed iframe (нет доступа к parent DOM, cookies, localStorage)
4. Двусторонняя коммуникация через JSON-RPC over postMessage
5. Виджет получает данные через `app.ontoolresult`
6. Виджет может вызывать другие тулы через `app.callServerTool()`

### 3.3 Два режима дистрибуции

**Stdio (локальный)** — пользователь прописывает в конфиге Claude Desktop / VS Code:
```json
{
  "mcpServers": {
    "sigil": {
      "command": "npx",
      "args": ["-y", "sigil"]
    }
  }
}
```
Никакого хостинга не нужно — npm-пакет скачивается и запускается локально.

**HTTP (remote)** — для Claude web (Custom Connectors). Сервер доступен по HTTPS URL. Нужен хостинг (Railway, Cloudflare Workers, или cloudflared tunnel для разработки).

### 3.4 Структура проекта

```
Sigil/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── server.ts                 # MCP server entry point (HTTP)
│   ├── stdio.ts                  # MCP server entry point (stdio)
│   ├── tools/                    # Tool definitions + input schemas
│   │   ├── bar-chart.ts
│   │   ├── line-chart.ts
│   │   ├── pie-chart.ts
│   │   └── table.ts
│   └── widgets/                  # React widget entry points
│       ├── shared/
│       │   ├── theme.ts          # Design tokens, dark/light
│       │   └── export-utils.ts   # Copy CSV/PNG helpers
│       ├── bar-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       ├── line-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       ├── pie-chart/
│       │   ├── index.html
│       │   └── App.tsx
│       └── table/
│           ├── index.html
│           └── App.tsx
├── dist/                         # Bundled single-file HTMLs (build output)
├── README.md
└── LICENSE                       # MIT
```

---

## 4. MVP: 4 тула

### 4.1 render_bar_chart

**Input Schema:**
```typescript
{
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  orientation?: "vertical" | "horizontal"; // default: "vertical"
  xlabel?: string;
  ylabel?: string;
}
```

**Tool Description (критично для tool selection):**
```
Render an interactive bar chart. Use when comparing discrete categories,
showing rankings, or displaying distribution across groups. Supports
horizontal and vertical orientations with hover tooltips.
```

### 4.2 render_line_chart

**Input Schema:**
```typescript
{
  title: string;
  series: Array<{
    name: string;
    data: Array<{ x: string | number; y: number }>;
  }>;
  xlabel?: string;
  ylabel?: string;
}
```

**Tool Description:**
```
Render an interactive line chart with one or more series. Use for
time-series data, trends, progress tracking, or any continuous data.
Supports multiple series overlay and hover crosshair.
```

### 4.3 render_pie_chart

**Input Schema:**
```typescript
{
  title: string;
  data: Array<{ label: string; value: number; color?: string }>;
  variant?: "pie" | "donut"; // default: "donut"
}
```

**Tool Description:**
```
Render an interactive pie or donut chart. Use for showing proportions,
market share, budget breakdown, or composition of a whole.
Hover to see exact percentages.
```

### 4.4 render_table

**Input Schema:**
```typescript
{
  title: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  rows: Array<Record<string, string | number>>;
  sortable?: boolean; // default: true
  filterable?: boolean; // default: true
}
```

**Tool Description:**
```
Render an interactive data table with sorting and filtering.
Use when the user needs to explore, compare, or drill into
structured data. Supports column sorting and text search.
```

---

## 5. Интерактивность (все виджеты)

### 5.1 Обязательно (MVP)
- Hover tooltips с точными значениями
- Click-to-highlight сегмент/серию
- Responsive layout (адаптация под размер iframe)
- Dark/light theme (определяется по `prefers-color-scheme`)

### 5.2 Phase 2
- Кнопка "Copy as CSV"
- Кнопка "Copy as PNG"
- Анимация при загрузке данных

---

## 6. Дизайн

### 6.1 Подход
Собрать скриншоты chart-дизайнов из reference-продуктов (Vercel Analytics, Linear, PostHog, Stripe Dashboard), закинуть в Claude, сгенерировать design token set.

### 6.2 Design Token Set (структура)

```typescript
interface ChartDesignTokens {
  // Палитра для серий данных (10 цветов; графики wrap-around'ят по `i % length`)
  seriesColors: string[];

  // Фоны
  background: string;
  surfaceBackground: string; // tooltip, legend

  // Текст
  textPrimary: string;
  textSecondary: string;  // axis labels, legend
  textMuted: string;      // grid labels

  // Grid & Axes
  gridLine: string;
  axisLine: string;

  // Tooltip
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;

  // Общие
  borderRadius: number;
  fontFamily: string;
  fontSize: { label: number; title: number; tooltip: number };
}
```

### 6.3 Dark / Light Theme
Определяется через `prefers-color-scheme` media query. Оба набора токенов определяются в `shared/theme.ts` и применяются через CSS-переменные.

---

## 7. План реализации

### Phase 1 — MVP: Bar Chart E2E (Дни 1–3)

**День 1: Скелет проекта**
- [ ] `npm init`, установка зависимостей
- [ ] Настройка Vite + `vite-plugin-singlefile` для бандлинга виджетов
- [ ] Express + MCP SDK + ext-apps: регистрация одного тула `render_bar_chart`
- [ ] Простейший HTML-виджет (без React) — убедиться что iframe рендерится

**День 2: Первый виджет**
- [ ] React + Recharts внутри виджета bar-chart
- [ ] `app.ontoolresult` → парсинг данных → рендер BarChart
- [ ] Hover tooltips, responsive container
- [ ] Тестирование через `cloudflared tunnel` + Claude Custom Connector

**День 3: Полировка bar chart**
- [ ] Design tokens (dark/light theme)
- [ ] Click-to-highlight
- [ ] Horizontal/vertical orientation
- [ ] Edge cases: пустые данные, длинные лейблы, большие датасеты

### Phase 2 — Полный набор (Дни 4–5)

**День 4: Остальные виджеты**
- [ ] `render_line_chart` — multiple series, crosshair tooltip
- [ ] `render_pie_chart` — pie/donut variant, percentage labels
- [ ] `render_table` — sortable columns, text search filter

**День 5: Экспорт и полировка**
- [ ] Copy as CSV для всех виджетов
- [ ] Copy as PNG (html2canvas или recharts native)
- [ ] Тестирование всех тулов с разными промптами в Claude
- [ ] Итерация tool descriptions для лучшего tool selection

### Phase 3 — Публикация (День 6)

- [ ] Stdio entry point (`src/stdio.ts`)
- [ ] `npm publish` как `sigil@0.1.0`
- [ ] README с:
  - GIF-демо каждого виджета
  - Инструкция подключения к Claude Desktop / VS Code / Claude web
  - Input schema reference
- [ ] Публикация на GitHub (MIT license)

### Phase 4 — Дистрибуция и бренд (День 7+)

- [ ] Публикация на MCPHub / Glama.ai / MCP Marketplace
- [ ] Twitter/LinkedIn пост с демо-видео
- [ ] Dev.to / Medium статья: "I Built the First Interactive Charts for Claude — Here's How"
- [ ] Сбор feedback, итерация

### Phase 5 — Расширение (по спросу)

- [ ] `render_heatmap`, `render_scatter`, `render_treemap`
- [ ] Combo charts (bar + line)
- [ ] Кастомизация через tool parameters (цвета, шрифты)
- [ ] Drill-down: вызов тулов из виджета (`app.callServerTool`)
- [ ] Интерактивные Mermaid-диаграммы (если есть спрос)

---

## 8. Тестирование

### 8.1 Dev flow
1. Запустить MCP-сервер локально: `npm run dev` → `http://localhost:3001`
2. В соседнем терминале: `npx cloudflared tunnel --url http://localhost:3001`
3. Скопировать HTTPS URL → Claude Settings → Connectors → Add custom connector
4. В чате Claude: "Покажи bar chart с данными: React 45%, Vue 30%, Angular 25%"
5. Убедиться что iframe рендерится, tooltips работают, theme корректная

### 8.2 Тестовые промпты для валидации tool selection
```
- "Покажи распределение расходов по категориям"     → pie_chart
- "Сравни продажи за Q1-Q4"                         → bar_chart
- "Покажи тренд температуры за последний год"        → line_chart
- "Выведи таблицу с сортировкой по revenue"          → table
- "Визуализируй эти данные: ..."                    → любой подходящий
```

### 8.3 Edge cases
- Пустой массив данных → graceful empty state
- 1 data point → корректный рендер
- 100+ data points → перформанс, скролл
- Очень длинные лейблы → truncation / rotation
- Unicode в лейблах
- Отрицательные значения
- Смешанные типы в таблице

---

## 9. Хостинг (для remote-режима)

### 9.1 Для разработки
`cloudflared tunnel` — бесплатно, без регистрации, временный URL.

### 9.2 Для продакшена (выбрать один)

| Вариант | Стоимость | Плюсы | Минусы |
|---------|-----------|-------|--------|
| Railway | ~$5/мес | Простой деплой, Git integration | Платный |
| Cloudflare Workers | Free tier | Бесплатно, глобальный edge | Ограничения Workers runtime |
| Render | Free tier | Бесплатный инстанс | Cold start на free tier |
| VPS (Hetzner) | ~€4/мес | Полный контроль | Нужен DevOps |

---

## 10. Риски и митигация

| Риск | Вероятность | Импакт | Митигация |
|------|-------------|--------|-----------|
| Claude не выбирает тул | Средняя | Высокий | Итерировать tool descriptions, тестировать разные формулировки |
| Anthropic встроит charts нативно | Низкая (краткосрочно) | Высокий | Расширять за пределы базовых графиков (drill-down, combo charts) |
| Iframe ограничивает UX | Средняя | Средний | Максимизировать интерактивность в рамках sandbox |
| Recharts bundle size слишком большой | Средняя | Средний | Профилировать, при необходимости → Chart.js или uPlot |
| MCP Apps spec изменится | Низкая | Средний | Следить за ext-apps changelog, обновлять SDK |
| Custom Connectors только на платных планах | Факт | Средний | Stdio-режим через npx покрывает Claude Desktop / VS Code бесплатно |

---

## 11. Open Questions

1. **Bundle size budget** — какой максимальный размер single-file HTML допустим? Нужен бенчмарк Recharts bundle.
2. **Iframe dimensions** — какой размер iframe выделяют разные хосты (Claude web, Desktop, VS Code)? Нужно тестировать.
3. **Remote hosting** — Railway vs Cloudflare Workers vs Render для demo-инстанса?
4. **Monorepo** — один пакет `sigil` со всеми виджетами (рекомендуется для простоты).
5. **GitHub org** — публиковать под личным аккаунтом или создать org `sigil`?

---

## 12. Метрики успеха

| Метрика | Цель (1 месяц) | Цель (3 месяца) |
|---------|----------------|-----------------|
| GitHub stars | 100+ | 500+ |
| npm weekly downloads | 50+ | 200+ |
| Маркетплейсы | Попадание в MCPHub / Glama.ai | Попадание в curated MCP lists |
| Контент | 1 статья + демо-видео | 3+ упоминания в сторонних обзорах |
| Tool selection rate | Claude вызывает тулы в 80%+ релевантных случаев | — |
