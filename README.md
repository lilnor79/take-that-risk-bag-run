# TAKE THAT RISK: BAG RUN — updated game

## What's already built
- Simple PLAY screen using the supplied cover art.
- One-thumb drag movement; five different obstacle/cash/guard layouts that cycle forever, with growing payouts and guard difficulty.
- The only exit is at the top, visibly locked until every cash bundle on the current level is collected. Escaping advances a level and keeps the accumulated bag.
- First capture: KEEP MY MONEY to bank the run, or RISK IT to continue with the bag and freshly replenished cash. A second capture after risking it wipes the bag to $0.
- Character drawn as a small top-down black-beanie/camo-puffer/cargos/duffel silhouette, not a literal cutout of the cover photo.
- Username, personal best, share score via phone's share sheet, replay, and worldwide top 100 leaderboard UI.
- Your supplied instrumental, starting after PLAY, looping, with mute and volume controls saved locally.

## Upload to GitHub Pages (free)
1. Create a PUBLIC repository at https://github.com/new (for example, `take-that-risk-bag-run`).
2. **Upload ALL these files to the repository root:** `index.html`, `game.js`, `config.js`, `cover.png`, `instrumental.mp3`, `supabase.sql` (optional to upload), and `README.md` (optional). Do not upload only index.html.
3. Under repository Settings > Pages, choose Deploy from a branch > `main` > `/(root)` > Save.
4. Visit `https://YOUR-USERNAME.github.io/take-that-risk-bag-run/` when Pages finishes publishing.

## Connect the worldwide leaderboard (free Supabase tier)
1. Create a project at https://supabase.com/dashboard.
2. Enable **Anonymous Sign-ins** under Authentication > Providers.
3. Open SQL Editor and run `supabase.sql` once. If you already ran an earlier version, existing policies may exist; no need to rerun the same SQL.
4. Copy the project URL and **publishable/anon** key from Supabase's Connect/API settings. Put both in `config.js` and commit the updated file to GitHub.
5. Test by opening the game on two separate devices/browsers: post a score from one, view leaderboard on the other.
6. Never place a Supabase secret/service_role key into `config.js` or your public GitHub repository.

## Honest limitations
- **The leaderboard cannot be truly live until you supply your own Supabase URL/key and run the SQL.** Until then the leaderboard clearly says it is unconnected. It shows the top 100 global scores once configured.
- **Scores are client-reported and therefore vulnerable to cheating.** Don't offer prizes or claim verified records until server-side score validation and rate limiting are added.
- Anonymous sign-in makes one highest score per browser account; clearing browser data may reset the identity.
- The five maps have different obstacles and pickups, but visuals are still simple 2D prototype art. Please playtest on an actual phone before a public launch.
- Confirm you have permission to publicly distribute the instrumental in a game.
