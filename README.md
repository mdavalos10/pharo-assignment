# Instrument Price Dashboard

A React dashboard with a C#/.NET API, using the prices in `backend/Data/prices.csv`. Search for a ticker to see its daily prices and statistics, or select up to three instruments to compare them.

## Run locally

Prerequisites: .NET 8 SDK and Node.js 20.19+ (or 22.12+).

Terminal 1, from the repository root:

```sh
dotnet run --project backend --urls http://localhost:5000
```

Terminal 2:

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite and keep both terminals running. Vite forwards `/api` requests to port 5000.

To build the frontend, run `npm run build` from `frontend`. The build writes to `frontend/dist`; the API isn't configured to serve those files.

## API

- `GET /api/instruments`: sorted tickers.
- `GET /api/prices/{ticker}`: chronological `{date, price}` points; unknown tickers return 404.
- `GET /api/prices/{ticker}/stats`: `totalReturnPercent`, `dailyVolatilityPercent`, `maxDrawdownPercent`; unknown tickers return 404.

The API reads the CSV into memory at startup. Ticker matching is case insensitive. To use a different file, set `CsvPath` in the configuration.

The parser expects the same unquoted, three-column format as the supplied CSV. Startup fails if the file is empty or contains invalid headers, the wrong number of columns, blank tickers, invalid dates, nonpositive or nonfinite prices, or duplicate ticker/date pairs.

## Calculations and display

- Total return: `(last / first - 1) * 100`.
- Daily simple returns: `current / previous - 1` (29 observations for 30 closing prices).
- Daily volatility: population standard deviation of those returns, multiplied by 100; not annualized.
- Maximum drawdown: largest `1 - price / runningPeak`, multiplied by 100. A 10% drop is shown as 10%, rather than -10%.
- Single-point series have zero volatility and drawdown.
- The chart shows closing prices by default. The comparison checkbox rebases each series to 100 at its first close. Statistics always use the original prices.

## AI assistance

I defined the project architecture and directed the backend and frontend organization. OpenAI Codex assisted with implementation, tests, and documentation.

## Backend structure

- `Controllers/InstrumentsController.cs`: HTTP routes, responses, and 404 handling.
- `Models/`: price and statistics response records.
- `Services/IInstrumentService.cs`: contract between controller and data/calculation logic.
- `Services/InstrumentService.cs`: CSV loading, ticker lookup, and statistics.
- `Data/prices.csv`: supplied dataset, copied to build and publish output.
- `Program.cs`: dependency injection, startup loading, and controller registration.

## Tests

Run the checks from the repository root:

```sh
python3 tests/verify_api.py
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

The API tests require Python 3. The script builds the backend, starts temporary servers on free ports, and shuts them down when finished. It checks all 200 instruments and 6,000 price points, date ordering, ticker lookup, and 404 responses. It also checks the calculations against flat, rising, falling, recovering, and single-point series, and tests that invalid CSV files are rejected.

The frontend tests cover search, empty results, the three-instrument selection limit, comparison modes, loading, and retrying failed requests. They use jsdom with mocked API responses and fixed chart dimensions.

Both builds and test suites passed at the last check. The browser tool couldn't connect, so the chart layout still needs a manual check at desktop and mobile widths.

## Submission

The submission ZIP includes the backend, frontend, CSV, tests, lockfile, and README. Dependencies and generated build files are excluded. The app runs locally without a database.

## Frontend structure

- `src/main.tsx`: mounts React and imports global styles.
- `src/App.tsx`: page layout, selected instruments, and request lifecycle (including cancellation).
- `src/components/InstrumentSearch.tsx`: searchable ticker list and selection controls.
- `src/components/PriceChart.tsx`: price chart, comparison normalization, and loading/error states.
- `src/components/StatsPanel.tsx`: statistics table.
- `src/components/chartColors.ts`: shared chart and statistics colors.
- `src/api/instruments.ts`: typed API requests.
- `src/types/instruments.ts`: shared price, statistics, and instrument interfaces.
- `src/styles.css`: dashboard styling.

Run `npm run typecheck` from `frontend` to check TypeScript, or `npm run build` to check types and build the app. Source files are in `src`; `dist` contains the generated build.

Run `npm run lint` from `frontend` to check for lint errors, or `npm run lint:fix` to fix what ESLint can automatically. Any remaining errors need to be fixed by hand.
