# Design System & UI Style Guide

This document contains the complete style specification, color tokens, typography, component CSS, and responsive layout guidelines used in the application. Use this guide to replicate or clone the exact visual design for any other web application.

---

## 1. Visual Identity Overview

* **Design Theme**: Clean, high-contrast, accessible light theme ("Community Flag Theme").
* **Key Principles**:
  * Crisp off-white and pure white card surfaces (`#FFFFFF`, `#F8FAFC`).
  * Slate borders (`#E2E8F0`, `#CBD5E1`) without heavy or muddy dark neumorphic shadows.
  * Deep emerald flag green (`#008A2E`, `#42B06F`) as the primary brand and positive action color.
  * Ocean & sky blue (`#2C82C9`, `#256CAA`) for financial metrics, links, and secondary accents.
  * Warm gold / amber (`#F59E0B`, `#D97706`, `#FEF3C7`) for admin roles, top podiums, and badges.
  * Touch-first and mobile PWA responsiveness (touch targets $\ge 44\text{px}$, safe-area padding, iOS zoom prevention).

---

## 2. Color Palette & Tokens

### Brand & Accent Colors

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `primary` | `#008A2E` | Primary brand green, active tab background, highlight borders |
| `primary-hover` | `#007326` | Darker hover shade for primary green |
| `primary-button` | `#42B06F` | Solid primary button background (hover: `#369b60`, border: `#389E62`) |
| `primary-glow` | `rgba(0, 138, 46, 0.15)` | Focus ring box-shadows |
| `primary-light` | `#EBF7EE` | Soft emerald badge background |
| `grass-green` | `#7BCC53` | Secondary brand light grass green |
| `grass-green-light`| `#F2FAEE` | Soft grass green tint |
| `secondary` | `#2C82C9` | Ocean/Sky blue for amounts, links, secondary badges |
| `secondary-hover` | `#236EA9` | Hover state for blue elements |
| `secondary-light` | `#F4F9FD` | Very light icy blue background for tab containers and pages |
| `accent-gold` | `#F59E0B` / `#D97706` | Gold medal, admin role badges, alerts |
| `accent-gold-light`| `#FEF3C7` | Gold badge background, medal background |
| `accent-purple` | `#7C3AED` / `#6D28D9` | Ward committee tags, category badges |
| `accent-purple-light`| `#F5F3FF`| Purple badge background |
| `danger` | `#DC2626` / `#B91C1C` | Delete buttons, errors, cancellation warnings |
| `danger-light` | `#FEF2F2` | Error banner & soft danger button background |

### Neutral & Surface Colors

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `bg-main` | `#F8FAFC` | Page background canvas |
| `bg-surface` | `#F4F9FD` | Secondary background canvas |
| `bg-card` | `#FFFFFF` | Card surfaces, inputs, modal containers |
| `border-subtle` | `#E2E8F0` | Subtle dividers, card borders |
| `border-active` | `#CBD5E1` | Input outlines, active table borders, card hover borders |
| `text-primary` | `#0F172A` | Headings, primary high-contrast text |
| `text-secondary`| `#334155` | Body text, labels, secondary descriptions |
| `text-muted` | `#64748B` | Table column headers, timestamps, helper notes |
| `text-placeholder`| `#94A3B8` | Form input placeholder text |

---

## 3. Typography & Hierarchy

* **Primary Font**: `Plus Jakarta Sans`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
* **Google Font Link**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  ```
  *(Or in CSS: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');`)*

### Type Scale

| Element | Size | Weight | Line Height / Letter Spacing |
| :--- | :--- | :--- | :--- |
| **Hero / Modal Heading** | `1.25rem` – `1.5rem` | `800` | `1.2` / `-0.02em` |
| **Section Title** | `1.05rem` – `1.15rem` | `800` | `1.3` / `-0.01em` |
| **Stat Numbers** | `1.35rem` – `1.6rem` | `800` | `1.2` |
| **Body Primary** | `0.95rem` – `1.0rem` | `500` / `600` | `1.5` |
| **Body Secondary** | `0.85rem` – `0.9rem` | `400` / `500` | `1.4` |
| **Table Headers / Badges** | `0.70rem` – `0.75rem`| `700` | Uppercase, `letter-spacing: 0.03em` |

---

## 4. Spacing, Radii, Shadows & Safe Areas

```css
:root {
  --font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03);

  /* Border Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.22s ease;

  /* PWA Mobile Safe Area Insets */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

---

## 5. Core CSS Component Classes

### Cards & Surfaces
```css
.glass-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.glass-card:hover {
  border-color: #CBD5E1;
}

.glass-card-interactive {
  transition: transform var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.glass-card-interactive:active {
  transform: scale(0.99);
}

@media (hover: hover) {
  .glass-card-interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: #CBD5E1;
  }
}
```

### Buttons
```css
/* Primary Action Button (Touch target min-height: 44px) */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #42B06F;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 11px 20px;
  min-height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid #389E62;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}

.btn-primary:hover {
  background: #369b60;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Secondary Crisp White Button */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #FFFFFF;
  color: #0F172A;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 10px 18px;
  min-height: 42px;
  border-radius: var(--radius-md);
  border: 1px solid #E2E8F0;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  background: #F1F5F9;
  border-color: #CBD5E1;
}

.btn-secondary:active {
  background: #E2E8F0;
  transform: scale(0.98);
}

/* 40x40 Square Icon Button */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  color: #334155;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background: #F8FAFC;
  color: #0F172A;
  border-color: #CBD5E1;
}

/* Soft Danger Action Button */
.btn-danger-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FECACA;
  border-radius: var(--radius-sm);
  padding: 5px 9px;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-danger-ghost:hover {
  background: #FEE2E2;
  border-color: #F87171;
}
```

### Status & Category Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge-emerald {
  background: #EBF7EE;
  color: #008A2E;
  border: 1px solid #A5D6B8;
}

.badge-blue {
  background: #EDF4FA;
  color: #256CAA;
  border: 1px solid #B8D4EE;
}

.badge-gold {
  background: #FEF3C7;
  color: #92400E;
  border: 1px solid #FCD34D;
}

.badge-purple {
  background: #F5F3FF;
  color: #6D28D9;
  border: 1px solid #DDD6FE;
}

.badge-red {
  background: #FEF2F2;
  color: #B91C1C;
  border: 1px solid #FECACA;
}
```

### Form Input Controls
> [!NOTE]
> `font-size: 1rem` (16px) is required on inputs to prevent iOS Safari from automatically zooming into the page on focus.

```css
.input-field {
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: var(--radius-md);
  padding: 11px 14px;
  font-size: 1rem;
  color: #0F172A;
  font-family: inherit;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
  min-height: 44px;
}

.input-field:focus {
  border-color: #008A2E;
  box-shadow: 0 0 0 3px rgba(0, 138, 46, 0.15);
}

.input-field::placeholder {
  color: #94A3B8;
}
```

### Progress Bars
```css
.progress-container {
  width: 100%;
  height: 10px;
  background: #E2E8F0;
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #42B06F;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}
```

### Single-Line Horizontal Scrollable Tab Strip
```css
.tab-strip {
  display: flex;
  flex-wrap: nowrap !important;
  align-items: stretch;
  gap: 4px;
  background: #F4F9FD;
  padding: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid #E2E8F0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: #CBD5E1 transparent;
}

.tab-strip-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  padding: 6px 11px;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: #334155;
  transition: all var(--transition-fast);
  min-height: 36px;
}

.tab-strip-btn.active {
  background: #008A2E;
  color: #FFFFFF;
  box-shadow: var(--shadow-sm);
}

@media (min-width: 840px) {
  .tab-strip-btn {
    flex: 1 1 auto;
    font-size: 0.80rem;
    padding: 7px 10px;
  }
}
```

### Responsive Modal Dialog & Mobile Bottom Sheet
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  overflow-y: auto;
}

.modal-content {
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  overscroll-behavior: contain;
}

/* On mobile phones (< 640px), modal becomes a slide-up bottom sheet */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-content {
    max-width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    max-height: 90dvh;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
```

### Sticky PWA Navigation Bar
```css
.pwa-navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  padding: calc(8px + var(--safe-area-top)) clamp(10px, 3vw, 16px) 8px clamp(10px, 3vw, 16px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  width: 100%;
}

.pwa-navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}
```

---

## 6. Tailwind CSS Configuration Alternative

If your destination project is built using Tailwind CSS, add this to your `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#008A2E',
          hover: '#007326',
          btn: '#42B06F',
          'btn-hover': '#369b60',
          light: '#EBF7EE',
          grass: '#7BCC53',
          'grass-light': '#F2FAEE',
          blue: '#2C82C9',
          'blue-hover': '#236EA9',
          'blue-light': '#F4F9FD',
          gold: '#F59E0B',
          'gold-dark': '#D97706',
          'gold-light': '#FEF3C7',
          purple: '#7C3AED',
          'purple-light': '#F5F3FF',
        },
        surface: {
          canvas: '#F8FAFC',
          light: '#F4F9FD',
          card: '#FFFFFF',
          border: '#E2E8F0',
          'border-focus': '#CBD5E1',
        },
        content: {
          primary: '#0F172A',
          secondary: '#334155',
          muted: '#64748B',
        }
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
};
```

---

## 7. Recommended Packages & Meta Configuration

* **Icon Library**: `lucide-react`
  ```bash
  npm install lucide-react
  ```
* **Celebration Confetti**: `canvas-confetti`
  ```bash
  npm install canvas-confetti && npm install -D @types/canvas-confetti
  ```
* **HTML Viewport Tag (in `index.html`)**:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
  <meta name="theme-color" content="#FFFFFF" />
  ```
