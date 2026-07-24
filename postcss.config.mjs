const config = {
  plugins: {
    // Tailwind v4 (utility classes, used for layout/spacing across the app)
    "@tailwindcss/postcss": {},
    // Mantine's required PostCSS preset (component-level CSS variables, mixins)
    "postcss-preset-mantine": {},
    // Lets Mantine's breakpoint variables be used in plain CSS files
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};

export default config;
