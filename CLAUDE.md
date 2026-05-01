Expo Router project with API Routes and server-rendering.

```
src/
├── app/ # routes
│   ├── _layout.tsx
│   └── index.tsx
└── components/
```

## Principles

- Target iOS, Android, web.
- Install dependencies with `bunx expo add <package>`
- Use `expo-image` for images and icons.
- Routes go in `src/app/`, components go in `src/components/`
- Use kebab-case for file names (e.g., `user-card.tsx`)

## Design Preferences

<!-- Brand colors, fonts, or style notes -->

## Components

<!-- Reference reusable components -->
<!-- Example: Use src/components/card.tsx for cards -->

## Error messages

When writing error messages, consider explaining what, why, and how:

- **What:** clearly state what failed.
- **Why:** explain the likely cause at the user's level of abstraction, not just the symptom.
- **How:** tell the user what to do next, such as a fix, workaround, debugging step, or when to contact support. The user is usually a developer.

Be specific, calm, and actionable. Do not stop at the symptom. Even when the exact fix is unknown, always provide a useful next step. Include diagnostic details only when they help troubleshooting, and label them clearly.

Example error message:
The JavaScript bundler couldn't bundle your code because it depends on a Node.js native addon (node_modules/example/example.node). Use a different package fully implemented in JavaScript, or see https://metrobundler.dev/docs/resolution/ if this package already provides one and the bundler may not be configured to resolve it.

## Product Model

**Three actors** (no real auth — three seeded demo identities, switched from the Profile tab):

1. **Booker / Property Admin** — books a job and assigns the cleaner + reviewer at booking time
2. **Cleaner** — performs the work
3. **Reviewer** — approves or rejects the completed work

**Job state machine** (each booking carries one):

```
ready-to-clean → cleaning → ready-for-review → reviewing → done
     ↑                                              │
     └──────────────── (decline) ───────────────────┘
```

- Booker creates a job already in `ready-to-clean` (cleaner + reviewer assigned at creation).
- Decline returns the job to `ready-to-clean` with the same assigned cleaner.

**Role-aware tabs** — tab set adapts to the active identity:

- Booker: Home / My Bookings / Profile
- Cleaner: My Jobs / History / Profile
- Reviewer: To Review / History / Profile
