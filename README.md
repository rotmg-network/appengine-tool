# AppEngine API Suite

A locally running browser-based REST client for testing Realm of the Mad God AppEngine API endpoints. It is built for fast endpoint exploration, environment-specific state, Unity-style request headers, cookie handling, and response inspection.

The app is similar in spirit to Postman or Insomnia, but focused on the RotMG AppEngine API shape and workflow.

## Features

- Browser REST client with a local proxy server
- Preset catalog for common RotMG API endpoints
- Editable built-in endpoint catalog in `src/endpointCatalog.ts`
- Add and remove custom sidebar endpoints from the UI
- Production, testing, and custom AppEngine environments
- Separate saved state per environment
- Query params, form body, raw body, headers, variables, and assertions
- Header modes: none, key-value form, or raw header text
- Dynamic variables such as `{{timestamp}}`, `{{unix}}`, `{{uuid}}`, `{{randomInt}}`, and `{{randomEmail}}`
- `{{clientToken}}` resolves to `MD5(guid + password)`
- Unity request headers by default
- Cookie jar support through the local proxy
- Request timeout and cancellation
- Response tabs for body, headers, cookies, timing, raw request, and raw response
- Response search, copy, and download controls
- Light and dark themes, defaulting to dark
- Import/export of all environment workspaces

## AppEngine Environments

Built-in environments:

| Env        | URL                                       |
| ---------- | ----------------------------------------- |
| Production | `https://realmofthemadgodhrd.appspot.com` |
| Testing    | `https://rotmgtesting.appspot.com`        |
| Testing2   | `https://realmtesting2.appspot.com`       |
| Testing3   | `https://rotmgtesting3.appspot.com`       |
| Testing4   | `https://rotmgtesting4.appspot.com`       |
| Testing5   | `https://rotmgtesting5.appspot.com`       |
| Custom     | `custom URL`                              |

Each environment stores its own draft request, params, body, headers, variables, saved requests, history, timeout, cookie toggle, and redirect toggle in `localStorage`

## Default Unity Headers

All new workspaces start with Unity client headers:

```ts
{
  "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
  "X-Unity-Version": "2021.3.16f1",
  "Content-Type": "application/x-www-form-urlencoded"
}
```

## Tech Stack

- React
- TypeScript
- Vite
- Express
- tough-cookie
- lucide-react

The frontend runs through Vite on `127.0.0.1:5173`.  
The API proxy runs on `127.0.0.1:8787`.

## Why there is a proxy

The browser app sends requests to the local Express proxy at `/api/send`  
The proxy then routes the request to AppEngine

This avoids browser CORS limitations and allows the tool to manage:

- Request cookies
- Raw request/response breakdowns
- Redirect behavior
- Request timeouts
- Unity-style headers

## Getting Started

```bash
npm install   # Install dependencies:
npm run dev   # Start the app in dev mode
npm start     # Start the app normally
```

Then open in a web browser: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

## Scripts

```bash
npm start          # Build the UI, then run the proxy + preview server together
npm run dev        # Run Vite and the Express proxy together (watch mode)
npm run dev:web    # Run only the Vite frontend
npm run dev:proxy  # Run only the Express proxy
npm run check      # Type-check the frontend and the server
npm run build      # Type-check and create production build
npm run preview    # Build preview: proxy + Vite preview together
npm test           # Run the Vitest unit tests
npm run lint       # Run ESLint
npm run format     # Format the codebase with Prettier
```

## Assertions

The Tests tab currently supports:

- Status code
- Body contains text
- Header exists
- Latency under a threshold
- Regex match
- Simple XML path existence

For XML path assertions, use slash-separated element names such as:

```text
Chars/Char/Equipment
```

## Import And Export

The export button writes a JSON collection containing all environment workspaces. Imports support both the current multi-environment format and the earlier single-environment format.

Exported data can include local variables and saved request parameters. Treat exported files as sensitive if they contain account identifiers, passwords, or access tokens.

## Project Layout

```text
.
├── server/
│   └── index.ts          # Local Express proxy (run with tsx)
├── src/
│   ├── components/        # React UI components
│   ├── lib/              # Pure helpers + their *.test.ts unit tests
│   ├── constants.ts      # Environments, choices, defaults
│   ├── endpointCatalog.ts # Built-in endpoint definitions
│   ├── types.ts          # Shared type definitions
│   ├── App.tsx           # Root component
│   ├── main.tsx          # React entry point
│   └── styles.css        # App styling and themes
├── index.html
├── package.json
├── tsconfig.json         # Frontend TypeScript config
├── tsconfig.server.json  # Server TypeScript config
├── eslint.config.js
└── vite.config.ts        # Vite + Vitest config
```

## Notes

- Cookie jars are held in proxy memory and reset when the proxy restarts.
- Browser-side app state is stored in `localStorage`.
- Custom endpoints are stored in `localStorage` and included in collection exports.
- Custom base URLs are limited to `http` and `https`.
- Proxy request timeouts are clamped between 1 second and 120 seconds.
