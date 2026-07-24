import discord
import requests
from discord.ext import commands

BASE_URL = "https://ultimateshittylist.space/api"
TOKEN = "YOUR_DISCORD_BOT_TOKEN"

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix=commands.when_mentioned_or("!"), intents=intents)


def api_get(path, params=None):
    try:
        r = requests.get(BASE_URL + path, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}
    return {"ok": False, "error": "HTTP " + str(r.status_code)}


@bot.event
async def on_ready():
    print(f"USL Bot logged in as {bot.user}")


@bot.command(name="levels", aliases=["list", "top"])
async def cmd_levels(ctx, page: int = 1):
    """Show level list (paginated)"""
    data = api_get("/demons", {"page": page - 1, "limit": 10})
    if not data.get("ok"):
        await ctx.send(f"Error: {data.get('error', 'unknown')}")
        return

    embed = discord.Embed(
        title=f"Level List (page {data['page']} of {data['pages']})",
        description=data["levels"][:4096],
        color=discord.Color.blue(),
    )
    embed.set_footer(text=f"Total levels: {data['total']} | !levels <page>")
    await ctx.send(embed=embed)


@bot.command(name="search", aliases=["find"])
async def cmd_search(ctx, *, query: str):
    """Search levels by name or creator"""
    if not query:
        await ctx.send("Usage: !search <name/creator>")
        return
    data = api_get("/demons/search", {"q": query})
    if not data.get("ok"):
        await ctx.send(f"Error: {data.get('error', 'unknown')}")
        return
    if not data["total"]:
        await ctx.send(f"No levels found matching `{query}`")
        return

    desc = f"**Search:** `{query}` — {data['total']} result(s)\n\n" + data["levels"]
    if len(desc) > 4096:
        desc = desc[:4093] + "..."

    embed = discord.Embed(
        title="Level Search Results",
        description=desc,
        color=discord.Color.green(),
    )
    await ctx.send(embed=embed)


@bot.command(name="level", aliases=["demon", "info"])
async def cmd_level(ctx, demon_id: int):
    """Show detailed info about a specific level"""
    data = api_get(f"/demons/{demon_id}", {"format": "json"})
    if not data.get("ok"):
        await ctx.send(f"Level #{demon_id} not found")
        return

    embed = discord.Embed(
        title=f"#{data['position']} {data['name']}",
        description=(
            f"**Difficulty:** {data['difficulty']}\n"
            f"**Creator:** {data['creator'] or '—'}\n"
            f"**Verifier:** {data['verifier'] or '—'}\n"
            f"**Level ID:** {data['level_id'] or '—'}\n"
            f"**Requirement:** {data['requirement']}%\n"
            f"**Points:** {data['points']}"
        ),
        color=discord.Color.purple(),
    )
    if data.get("shittylist_equiv"):
        embed.add_field(name="Equivalent to", value=data["shittylist_equiv"], inline=False)
    if data["records"]:
        top = "\n".join(
            f"{r['username']} — {r['progress']}%"
            for r in data["records"][:10]
        )
        embed.add_field(name=f"Records ({len(data['records'])})", value=top, inline=False)
    if data.get("video_url"):
        embed.url = data["video_url"]

    await ctx.send(embed=embed)


if __name__ == "__main__":
    bot.run(TOKEN)
