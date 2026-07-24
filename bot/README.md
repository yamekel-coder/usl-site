# USL Discord Bot

Discord bot that displays Geometry Dash level lists from [Ultimate Shitty List](https://ultimateshittylist.space).

## Setup

```bash
cd bot
pip install -r requirements.txt
```

Edit `bot.py` — set `YOUR_DISCORD_BOT_TOKEN` and optionally `BASE_URL`.

## Run

```bash
python bot.py
```

## Commands

| Command | Description |
|---------|-------------|
| `!levels [page]` | Show level list (paginated) |
| `!search <query>` | Search levels by name/creator |
| `!level <id>` | Show detailed level info |
| `!top [count]` | Alias for !levels |

## API Endpoints (used by bot)

- `GET /api/demons?page=0&limit=10` — paginated level list
- `GET /api/demons/search?q=xxx` — search levels
- `GET /api/demons/5?format=json` — single level detail
