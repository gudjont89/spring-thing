# spring-thing

Static site built with Vite + React + TypeScript, using Firebase from the browser, deployed to GitHub Pages.

## Development

```sh
npm install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

Firebase is initialized in `src/firebase.ts`, which exports `app`, `auth` and `db` (Firestore).

## Deploying to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo settings, under **Pages**, set **Source** to **GitHub Actions**.
3. Under **Settings > Secrets and variables > Actions > Variables**, add each `VITE_FIREBASE_*` value from `.env.example`.
4. In the Firebase console, under **Authentication > Settings > Authorized domains**, add `<user>.github.io`.

Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

The Firebase web config is public by design. Protect your data with Firestore Security Rules.
