# 🎨 BotCriptoFy Frontend

> **Astro SSR + React 19 + Tailwind CSS v4** - Modern, Fast, Beautiful

[![Astro](https://img.shields.io/badge/Astro-v5.11-blueviolet?style=flat-square&logo=astro)](https://astro.build)
[![React](https://img.shields.io/badge/React-v19.2-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4.1-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

---

## 🎯 Overview

This is the **frontend** of BotCriptoFy, built with cutting-edge web technologies for optimal performance and developer experience. Features server-side rendering, partial hydration, and a beautiful design system inspired by OpenAI DevDay.

### ✨ Key Features

- 🚀 **Astro v5.11** - Zero-JS by default, SSR optimized
- ⚛️ **React 19.2** - Latest React with server components
- 🎨 **Tailwind CSS v4.1** - JIT compilation with custom design system
- 🎭 **Framer Motion** - Smooth animations
- 🔐 **Authentication Pages** - Complete auth flow (login, register, password reset)
- 🧩 **15+ UI Components** - Reusable design system
- 📱 **Fully Responsive** - Mobile-first design
- ♿ **Accessible** - WCAG 2.1 compliant
- ⚡ **Lightning Fast** - <100KB bundle size

---

## 📁 Project Structure

```bash
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # OAuth buttons, forms
│   │   │   └── OAuthButtons.tsx
│   │   └── ui/             # Design system
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── StatCard.tsx
│   │       ├── BackgroundBeams.tsx
│   │       ├── GradientBackground.tsx
│   │       ├── DottedGlowBackground.tsx
│   │       └── HighlightBracket.tsx
│   │
│   ├── layouts/            # Page layouts
│   │   └── Layout.astro    # Base layout with head/footer
│   │
│   ├── pages/              # File-based routing
│   │   ├── index.astro     # Landing page
│   │   ├── login.astro     # Login page
│   │   ├── register.astro  # Registration
│   │   ├── forgot-password.astro
│   │   └── change-password.astro
│   │
│   ├── styles/             # Global styles
│   │   └── globals.css     # Tailwind + custom CSS
│   │
│   └── utils/              # Helper functions
│       └── cn.ts           # className merger
│
├── public/                 # Static assets
│   └── favicon.svg
│
├── astro.config.mjs        # Astro configuration
├── tailwind.config.mjs     # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies & scripts
```

---

## 🚀 Quick Start

### Prerequisites

- **Bun** v1.3+ (or Node.js v18+)

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Open http://localhost:4321
```

---

## 🧞 Commands

All commands are run from the `frontend/` directory:

| Command | Action |
|---------|--------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server at `localhost:4321` |
| `bun run build` | Build production site to `./dist/` |
| `bun run preview` | Preview production build locally |
| `bun run astro add` | Add Astro integration |
| `bun run astro check` | Check for errors |
| `bun run astro info` | Show system info |

---

## 🎨 Design System

### Color Palette

```css
/* Primary */
--cyan-400: #5bb9ff;      /* Interactive elements */

/* Accent */
--neon-500: #a8ff35;      /* Highlights, CTAs */

/* Alert */
--coral-400: #ff8a5b;     /* Warnings, errors */

/* Background */
--dark-pure: #000000;     /* Pure black background */
--gray-950: #0a0a0a;      /* Cards, containers */
```

### UI Components

#### Basic Components
- `<Button>` - Primary, secondary, outline variants
- `<Input>` - Text, email, password with validation
- `<Card>` - Content containers
- `<StatCard>` - Statistics display

#### Advanced Components
- `<BackgroundBeams>` - Animated light beams
- `<GradientBackground>` - Animated gradients
- `<DottedGlowBackground>` - Interactive dotted background
- `<HighlightBracket>` - Highlighted text with colored brackets
- `<OAuthButtons>` - Social login buttons (Google, GitHub, Discord, Apple)

### Typography

- **Font**: Inter, system-ui
- **Display**: 72px - 144px (text-6xl to text-9xl)
- **Tracking**: Extra-tight (-0.08em)
- **Headings**: Bold 700

---

## 🔧 Configuration

### Adding New Pages

1. Create `.astro` file in `src/pages/`
2. Use `Layout.astro` as wrapper
3. Add route will be auto-generated

Example:

```astro
---
// src/pages/dashboard.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="Dashboard">
  <h1>Dashboard</h1>
</Layout>
```

### Adding New Components

1. Create `.tsx` file in `src/components/ui/`
2. Export component with TypeScript types
3. Import and use in pages

Example:

```tsx
// src/components/ui/NewComponent.tsx
interface NewComponentProps {
  title: string;
}

export const NewComponent = ({ title }: NewComponentProps) => {
  return <div>{title}</div>;
};
```

---

## 📖 Documentation

- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

---

## 🤝 Contributing

See main [AGENTS.md](../AGENTS.md) for development guidelines.

---

**Part of the BotCriptoFy Platform** | [Back to Main README](../README.md)
