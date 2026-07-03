import os
import httpx
import json
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
FASTAPI_ENDPOINT = os.environ.get("FASTAPI_ENDPOINT", "http://localhost:8002/api/log/quick")
BOT_API_KEY = os.environ.get("BOT_API_KEY")

# Optional: lock the bot to your personal Telegram user ID for security.
# Set TELEGRAM_ALLOWED_CHAT_ID in .env to your numeric Telegram user/chat ID.
ALLOWED_CHAT_ID = os.environ.get("TELEGRAM_ALLOWED_CHAT_ID")


def _is_authorised(chat_id: int) -> bool:
    """Return True if no allowlist is set (open) or if the chat ID matches."""
    if not ALLOWED_CHAT_ID:
        return True
    return str(chat_id) == str(ALLOWED_CHAT_ID)


def _format_summary(data: dict) -> str:
    """Build a human-readable summary from the API response payload."""
    message = data.get("message", "Workout logged.")
    parsed = data.get("data", {})
    entries = parsed.get("entries", []) if parsed else []

    if not entries:
        return f"✅ {message}"

    lines = [f"✅ {message}", ""]
    lines.append("📋 *Logged sets:*")

    # Group by exercise for a cleaner display
    grouped: dict[str, list] = {}
    for entry in entries:
        name = entry.get("exercise_name", "Unknown")
        grouped.setdefault(name, []).append(entry)

    for exercise, sets in grouped.items():
        set_parts = []
        for s in sets:
            weight = s.get("weight")
            unit = s.get("unit", "kg")
            reps = s.get("reps", "?")
            rir = s.get("rir")
            failure = s.get("failure", False)

            if weight is not None:
                part = f"{weight}{unit} × {reps}"
            else:
                part = f"{reps} reps (bodyweight)"

            if failure:
                part += " 🔥"
            elif rir is not None:
                part += f" (RIR {rir})"

            set_parts.append(part)

        lines.append(f"• *{exercise}*: {', '.join(set_parts)}")

    date_str = entries[0].get("date", "") if entries else ""
    if date_str:
        lines.append(f"\n📅 Date: {date_str}")

    return "\n".join(lines)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start — show welcome message."""
    await update.message.reply_text(
        "👋 *Welcome to RepCount Bot!*\n\n"
        "Just send me your workout in plain text and I'll log it for you.\n\n"
        "*Examples:*\n"
        "• `bench press 100kg 3x8, squat 120kg 4x5`\n"
        "• `yesterday: deadlift 5 plates 1x5, rdl 80kg 3x10 rir 2`\n"
        "• `OHP 60kg 4x6 to failure, lat pulldown 70kg 3x12`\n\n"
        "I'll parse it with AI and log each set directly to your Supabase database. 💪",
        parse_mode="Markdown",
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help."""
    await update.message.reply_text(
        "📖 *RepCount Bot Help*\n\n"
        "*Commands:*\n"
        "/start — Show welcome message\n"
        "/help — Show this help message\n\n"
        "*Logging a workout:*\n"
        "Just send any text message describing your workout. You can include:\n"
        "• Exercise name, weight, sets × reps\n"
        "• Units: kg, lbs, plates\n"
        "• Effort: `to failure`, `rir 2`\n"
        "• Dates: `today`, `yesterday`, or a specific date\n\n"
        "The AI will extract each set and log it to your database.",
        parse_mode="Markdown",
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle any plain text message as a raw workout log."""
    chat_id = update.message.chat_id

    if not _is_authorised(chat_id):
        await update.message.reply_text("⛔ Unauthorised.")
        return

    user_text = update.message.text.strip()
    if not user_text:
        return

    await update.message.reply_text("⏳ Parsing your workout with AI...")

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                FASTAPI_ENDPOINT,
                json={"raw_text": user_text},
                headers={"X-Bot-API-Key": BOT_API_KEY},
            )
            response.raise_for_status()
            data = response.json()

        summary = _format_summary(data)
        await update.message.reply_text(summary, parse_mode="Markdown")

    except httpx.HTTPStatusError as error:
        try:
            detail = error.response.json().get("detail", str(error))
        except Exception:
            detail = str(error)
        await update.message.reply_text(
            f"❌ *Backend error ({error.response.status_code}):* {detail}",
            parse_mode="Markdown",
        )
    except httpx.TimeoutException:
        await update.message.reply_text(
            "⌛ *Request timed out.* The backend took too long to respond. Try again in a moment.",
            parse_mode="Markdown",
        )
    except Exception as error:
        await update.message.reply_text(
            f"❌ *Unexpected error:* {str(error)}",
            parse_mode="Markdown",
        )


def main():
    if not TELEGRAM_TOKEN:
        raise RuntimeError("TELEGRAM_TOKEN is not set. Add it to backend/.env")
    if not BOT_API_KEY:
        raise RuntimeError("BOT_API_KEY is not set. Add it to backend/.env")

    print(f"🤖 Starting RepCount Telegram Bot...")
    print(f"📡 FastAPI endpoint: {FASTAPI_ENDPOINT}")
    print(f"🔒 Chat allowlist: {ALLOWED_CHAT_ID or 'disabled (open)'}")

    application = Application.builder().token(TELEGRAM_TOKEN).build()
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("✅ Bot is running. Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
