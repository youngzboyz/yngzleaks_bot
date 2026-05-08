# 🤖 YNGZ Leaks Bot - Commands

Discord bot with ticket system and moderation commands.

## 🎯 Slash Commands

### `/announce`
**Description:** Send an announcement to a channel  
**Permissions:** Administrator  
**Usage:** `/announce channel:#general message:Your announcement here`  
**Features:**
- Red embed with GIF
- Timestamp and author footer
- Custom message

---

### `/clear`
**Description:** Delete messages from the channel  
**Permissions:** Administrator  
**Usage:** `/clear amount:50`  
**Features:**
- Delete 1-100 messages
- Bulk delete for efficiency
- Confirmation message

---

### `/setupticket`
**Description:** Setup the ticket panel in current channel  
**Permissions:** Administrator  
**Usage:** `/setupticket`  
**Features:**
- Creates interactive panel with button
- Red embed with GIF
- Automatic ticket numbering
- Saves configuration to database

---

### `/tickets`
**Description:** Show all active tickets  
**Permissions:** Administrator  
**Usage:** `/tickets`  
**Features:**
- Lists all open tickets
- Shows ticket number, subject, channel
- Displays creation time
- Maximum 10 tickets per page

---

### `/closeticket`
**Description:** Close the current ticket  
**Permissions:** Administrator  
**Usage:** `/closeticket reason:Issue resolved`  
**Features:**
- Closes ticket in database
- Shows closing embed with GIF
- Deletes channel after 10 seconds
- Optional reason parameter

---

### `/info`
**Description:** Show server information  
**Permissions:** Administrator  
**Usage:** `/info`  
**Features:**
- Server ID, owner, member count
- Creation date
- Boost level and count
- Server icon and GIF

---

## 🔨 Prefix Commands

### `!ban`
**Description:** Ban a user from the server  
**Permissions:** Administrator  
**Usage:** `!ban @user reason`  
**Features:**
- Bans user permanently
- Red embed with GIF
- Logs to database
- Shows moderator and reason

---

## 🎫 Ticket System

### How it Works

1. **Admin runs `/setupticket`** in a channel
2. **Panel appears** with "📩 Create Ticket" button
3. **User clicks button** → Modal appears
4. **User fills:**
   - Ticket subject
   - Detailed description
5. **Bot creates:**
   - Private channel (ticket-0001-username)
   - Only user, staff, and bot can see it
   - Ticket embed with GIF
   - Claim and Close buttons

### Ticket Management

**Claim Button (👤):**
- Staff can claim the ticket
- Updates embed showing who's handling it
- Notifies user

**Close Button (🔒):**
- Shows confirmation dialog
- Updates database
- Deletes channel after 10 seconds

---

## 🔐 Permissions

**All commands require Administrator permissions.**

Only users with Administrator role can:
- Use any bot command
- Create ticket panels
- Manage tickets
- Use moderation commands

Regular users can only:
- Create tickets (via button)
- Send messages in their own tickets

---

## 🎨 Design Features

- ✅ **Red color** (#FF0000) for all embeds
- ✅ **GIF** in announcements and tickets
- ✅ **Italic success messages** with :verificado1: emoji
- ✅ **English language** for all messages
- ✅ **Timestamps** on all embeds
- ✅ **Professional appearance**

---

## 📝 Success Messages

All commands show:
```
*:verificado1: [Action] applied correctly*
```

Examples:
- *:verificado1: Announcement applied correctly*
- *:verificado1: Ticket panel setup applied correctly*
- *:verificado1: Ticket closed applied correctly*
- *:verificado1: Ban applied correctly*

---

## 🗄️ Database

The bot uses Supabase with these tables:

### `tickets`
- Stores all ticket information
- Tracks status (open/closed)
- Records creation and closure times

### `ticket_panels`
- Saves panel configuration
- One panel per server

### `moderation_logs`
- Logs all moderation actions
- Tracks moderator, target, reason

---

## 🚀 Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
DISCORD_TOKEN=your_bot_token
```

3. Run the bot:
```bash
npm start
```

4. Slash commands will register automatically

---

## 📋 Command List

**Slash Commands (/):**
- `/announce` - Send announcements
- `/clear` - Delete messages
- `/setupticket` - Create ticket panel
- `/tickets` - View active tickets
- `/closeticket` - Close current ticket
- `/info` - Server information

**Prefix Commands (!):**
- `!ban` - Ban users

---

## ⚠️ Important Notes

- Bot requires Administrator permissions to function
- Slash commands register automatically on startup
- All embeds use red color and include GIF
- Ticket channels are automatically deleted when closed
- Only administrators can use the bot

---

**Bot ready to use! 🎉**