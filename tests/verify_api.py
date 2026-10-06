"""End-to-end API checks using only Python's standard library and the .NET SDK."""

import contextlib
import json
import math
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DOTNET = shutil.which("dotnet") or "/usr/local/share/dotnet/dotnet"
DLL = ROOT / "backend/bin/Debug/net8.0/InstrumentDashboard.dll"


@contextlib.contextmanager
def server(csv=None):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    with tempfile.TemporaryFile() as log:
        env = dict(os.environ)
        if csv:
            env["CsvPath"] = str(csv)
        process = subprocess.Popen(
            [DOTNET, str(DLL), "--urls", f"http://127.0.0.1:{port}"],
            env=env,
            stdout=log,
            stderr=log,
        )
        base = f"http://127.0.0.1:{port}"
        try:
            for _ in range(100):
                if process.poll() is not None:
                    log.seek(0)
                    raise RuntimeError(log.read().decode())
                try:
                    request(base, "/api/instruments")
                    break
                except urllib.error.URLError:
                    time.sleep(0.1)
            else:
                raise RuntimeError("API did not start in 10 seconds")
            yield base
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)


def request(base, path, status=200):
    try:
        response = urllib.request.urlopen(base + path, timeout=3)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        assert response.code == status, (path, response.code, status)
        return json.load(response)


def close(actual, expected):
    assert math.isclose(actual, expected, abs_tol=1e-8), (actual, expected)


subprocess.run([DOTNET, "build", str(ROOT / "backend"), "--nologo"], check=True)
with server() as base:
    tickers = request(base, "/api/instruments")
    assert len(tickers) == 200 and tickers == sorted(tickers)
    for ticker in tickers:
        prices = request(base, f"/api/prices/{ticker}")
        assert len(prices) == 30
        assert [p["date"] for p in prices] == sorted(p["date"] for p in prices)
        stats = request(base, f"/api/prices/{ticker}/stats")
        assert all(math.isfinite(v) for v in stats.values())
        close(
            stats["totalReturnPercent"],
            (prices[-1]["price"] / prices[0]["price"] - 1) * 100,
        )
    assert request(base, "/api/prices/tick0001") == request(
        base, "/api/prices/TICK0001"
    )
    for suffix in ["", "/stats"]:
        assert "message" in request(base, "/api/prices/UNKNOWN" + suffix, 404)
print(
    "PASS: 200 instruments, all 6,000 prices, statistics responses, casing, sorting, and 404s"
)

with tempfile.TemporaryDirectory() as directory:
    csv = Path(directory) / "prices.csv"
    cases = {
        "RECOVERY": ([100, 120, 90, 108], (8, math.sqrt(0.045) * 100, 25)),
        "FLAT": ([100, 100, 100], (0, 0, 0)),
        "SINGLE": ([100], (0, 0, 0)),
        "RISING": ([100, 110, 121], (21, 0, 0)),
        "FALLING": ([100, 90, 81], (-19, 0, 19)),
    }
    lines = ["date,ticker,price"]
    for ticker, (prices, _) in cases.items():
        lines.extend(
            f"2026-01-{i+1:02d},{ticker},{price}"
            for i, price in reversed(list(enumerate(prices)))
        )
    csv.write_text("\n".join(lines))
    with server(csv) as base:
        for ticker, (_, expected) in cases.items():
            stats = request(base, f"/api/prices/{ticker}/stats")
            for key, value in zip(
                ["totalReturnPercent", "dailyVolatilityPercent", "maxDrawdownPercent"],
                expected,
            ):
                close(stats[key], value)
    print(
        "PASS: known statistics for recovery, flat, single, rising, and falling series"
    )
    invalid = [
        ("wrong,header", "line 1"),
        ("date,ticker,price\n2026-01-01,A", "line 2"),
        ("date,ticker,price\n2026-01-01,,100", "line 2"),
        ("date,ticker,price\n2026-99-99,A,100", "line 2"),
        ("date,ticker,price\n2026-01-01,A,NaN", "line 2"),
        ("date,ticker,price\n2026-01-01,A,0", "line 2"),
        ("date,ticker,price\n2026-01-01,A,100\n2026-01-01,a,101", "line 3"),
        ("date,ticker,price\n", "no prices"),
    ]
    for content, expected in invalid:
        csv.write_text(content)
        try:
            with server(csv):
                raise AssertionError("Invalid CSV unexpectedly accepted")
        except RuntimeError as error:
            assert expected in str(error), str(error)
    print(
        "PASS: invalid CSV headers, columns, tickers, dates, prices, duplicates, and empty data"
    )
