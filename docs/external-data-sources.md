# External Data Sources

## Goal
This flow pulls real market, news, and disclosure inputs before the existing snapshot generator runs.

## News provider order
1. Naver Search API
2. GNews
3. Local cache
4. File snapshot fallback

## Disclosure provider order
1. Open DART list API
2. Local cache
3. File disclosure fallback

## New scripts
- `npm run etl:fetch:market`
- `npm run etl:fetch:news`
- `npm run etl:fetch:disclosures`
- `npm run etl:sync:external`
- `npm run etl:refresh:external`

## Data flow
1. `fetch-market-source.mjs`
   Pulls watchlist market data from Yahoo chart API and writes `data/raw/external-market.json`.
2. `fetch-news-source.mjs`
   Pulls watchlist news from Naver Search API first, falls back to GNews, then cache/file, and writes `data/raw/external-news.json`.
3. `fetch-disclosures-source.mjs`
   Pulls watchlist disclosures from Open DART and writes `data/raw/external-disclosures.json`.
4. `sync-external-raw.mjs`
   Converts external payloads into the existing raw files:
   - `data/raw/market-snapshot.json`
   - `data/raw/news-snapshot.json`
   It merges:
   - external news
   - DART disclosures
   - curated admin news
5. `generate-snapshots.mjs`
   Builds `data/live/*.json` for the app and API.

## Watchlist
`data/config/watchlist.json`

When `SWING_RADAR_FOCUSED_WATCHLIST_ENABLED=true`, the default external refresh watchlist is narrowed to:
- manual watchlist entries
- recent daily candidates
- recent daily candidate history
- top slice of the universe watchlist

This lets the daily external fetch keep 6-month price/news/disclosure history for the symbols that matter most without pulling the full universe every run.

Each item can contain:
- `ticker`
- `company`
- `sector`
- `marketSymbol`
- `newsQuery`
- `newsQueries`
- `newsQueriesKr`
- `requiredKeywords`
- `blockedKeywords`
- `dartCorpCode`
- `market`

## Required env
```env
SWING_RADAR_MARKET_PROVIDER=yahoo
SWING_RADAR_MARKET_LOOKBACK_RANGE=6mo
SWING_RADAR_FOCUSED_WATCHLIST_ENABLED=true
SWING_RADAR_FOCUSED_WATCHLIST_TOP_UNIVERSE=80
SWING_RADAR_FOCUSED_WATCHLIST_RECENT_CANDIDATES=40
SWING_RADAR_FOCUSED_WATCHLIST_RECENT_RUNS=5
SWING_RADAR_FOCUSED_WATCHLIST_RECENT_HISTORY_PER_RUN=20
SWING_RADAR_NEWS_PROVIDER=naver
SWING_RADAR_NAVER_CLIENT_ID=replace-with-naver-client-id
SWING_RADAR_NAVER_CLIENT_SECRET=replace-with-naver-client-secret
SWING_RADAR_NEWS_API_KEY=replace-with-gnews-api-key
SWING_RADAR_NEWS_MAX_ITEMS=5
SWING_RADAR_DISCLOSURE_PROVIDER=dart
SWING_RADAR_DART_API_KEY=replace-with-open-dart-api-key
SWING_RADAR_DISCLOSURE_LOOKBACK_DAYS=21
SWING_RADAR_DISCLOSURE_MAX_ITEMS=5
SWING_RADAR_RAW_DATA_DIR=./data/raw
```

## Recommended local run order
```powershell
cd C:\Users\eugen\Documents\SwingRadar
& "C:\Program Files\nodejs\npm.cmd" run etl:fetch:market
& "C:\Program Files\nodejs\npm.cmd" run etl:fetch:news
& "C:\Program Files\nodejs\npm.cmd" run etl:fetch:disclosures
& "C:\Program Files\nodejs\npm.cmd" run etl:sync:external
& "C:\Program Files\nodejs\npm.cmd" run etl:generate
```

Or run the full chain:
```powershell
& "C:\Program Files\nodejs\npm.cmd" run etl:refresh:external
```

## Notes
- Yahoo is used for price and volume history.
- Naver Search API is the recommended primary provider for Korean stock news.
- GNews remains a secondary provider and is still useful when Naver coverage is thin.
- Open DART is used as a first-class event source for disclosures such as earnings, treasury stock, contracts, capital raises, and biotech milestones.
- When both live providers fail, the pipeline falls back to cached news first and file snapshots second.
- Disclosure payloads are merged into the event stream as `[공시] ...` items.
- Validation and tracking raw files are still sourced from the existing local snapshots for now.
