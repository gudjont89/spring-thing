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

## Polls

Anyone can create a poll at `#/` by listing 2–15 options, optionally giving a question (voters see "Please vote" without one), choosing how many votes each person gets, and choosing how long voting lasts (1–5 minutes). The number of votes must be lower than the number of options. Each person can pick up to that many different options. The poll can be shared as a link (`#/p/<pollId>`) or QR code. Nobody signs in: the app silently signs each browser in with Firebase Anonymous Auth, and Security Rules allow one ballot per anonymous account. The browser that created a poll cannot vote in it. Someone who opens a private window or clears site data can vote again. A vote cannot be changed once cast. Results stay hidden until then, and are then shown once, without live updates.

Data lives in Firestore under `polls/{pollId}`, with one ballot document per voter in `polls/{pollId}/votes/{uid}`. Polls cannot be changed after they are created. Security Rules use the poll's `createdAt` server timestamp and `durationMinutes` to refuse new ballots after the deadline, and to refuse reading other people's ballots before it.

One-time Firebase setup:

1. In the Firebase console, under **Authentication > Sign-in method**, enable **Anonymous**.
2. Deploy the Security Rules in `firestore.rules`, either by pasting them into **Firestore Database > Rules** or with:

   ```sh
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   ```

## Deploying to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo settings, under **Pages**, set **Source** to **GitHub Actions**.
3. Under **Settings > Secrets and variables > Actions > Variables**, add each `VITE_FIREBASE_*` value from `.env.example`.
4. In the Firebase console, under **Authentication > Settings > Authorized domains**, add `<user>.github.io`.

Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

The Firebase web config is public by design. Protect your data with Firestore Security Rules.

## todo

Plot bar charts over time. Say the poll lasts 2 minutes and the ballots come in at 15 s, 32 s, 49 s, 1m10s, 1m13s and 1m41s. Wait for 1 second before displaying anything, but then start at 15 s and move the bars for the equivalent of 15 s. The total time should be about 30 seconds.

Voting types:
n votes per ballot
ranked voting (Schulze, paired rating)
Eurovision (12, 10, 8-1)

Pick names and avatars, optionally display them while viewing the results

Add progress bar on voting page