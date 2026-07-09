// Side-effect CSS imports (widget styles, Storybook preview) have no JS
// module shape; TypeScript 6 requires an explicit declaration for them
// (TS2882). Vite inlines the actual styles at build time.
declare module "*.css";
