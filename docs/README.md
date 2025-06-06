# Telegram Message Sender

A Python tool that allows you to send messages to multiple Telegram groups and individual users using your personal account via the Telegram API.

## Features

- 📤 Send messages to multiple groups and users at once
- 📋 Easy target management via text file
- 🔐 Secure authentication with your personal account
- 📊 Detailed sending reports
- 📁 List all your chats (groups and users) to get their IDs
- 🚀 Interactive command-line interface
- 👤 Support for both groups and individual users

## Prerequisites

- Python 3.7 or higher
- A Telegram account
- Telegram API credentials (API ID and API Hash)

## Setup

### 1. Get Telegram API Credentials

1. Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your Telegram account
3. Create a new application
4. Note down your `API ID` and `API Hash`

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Your Credentials

1. Copy the example config file:

   ```bash
   cp config.env.example config.env
   ```

2. Edit `config.env` and add your credentials:
   ```
   API_ID=your_api_id_here
   API_HASH=your_api_hash_here
   PHONE_NUMBER=your_phone_number_here
   ```

### 4. Set Up Your Targets

Edit the `groups.txt` file and add the groups and users you want to send messages to. You can use:

- Group usernames: `@mygroup`
- Group IDs: `-1001234567890`
- User usernames: `@username`
- User IDs: `123456789`
- Group invite links: `https://t.me/joinchat/...`

Example `groups.txt`:

```
@example_group1
@example_group2
-1001234567890
@john_doe
987654321
```

### 5. Write Your Message

Edit the `message.txt` file and write the message you want to send:

```
# Write your message here
# Lines starting with # are comments and will be ignored
# Empty lines will be preserved in the message

Hello! This is my message.

You can write multiple lines here.
Emojis work too! 🚀✨

# Remember to save this file before running the tool
```

## Usage

Run the tool:

```bash
python telegram_sender.py
```

### Menu Options

1. **Send message to groups/users**: Send the message from `message.txt` to all targets in `groups.txt`
2. **List my chats (groups & users)**: Display all groups and users with their IDs
3. **Search for groups/users by name**: Find specific groups or users by searching their names
4. **Exit**: Close the application

### Two-Step Confirmation Process

When you choose to send messages, the tool will:

1. **Verify receivers**: Check all targets and show their names
2. **Confirm receivers**: Ask you to confirm the recipient list
3. **Show message**: Display the message from `message.txt`
4. **Confirm message**: Ask you to confirm the message content
5. **Send**: Only then will it send the messages

This double confirmation ensures you never send the wrong message to the wrong people!

### Search Feature

The search feature allows you to easily find groups or users by name:

1. Select option 3 from the main menu
2. Enter a search term (part of the name or username)
3. The tool will show all matching results with their IDs
4. You can optionally add the found IDs directly to your `groups.txt` file

Example searches:

- Search for "starknet" to find all Starknet-related groups
- Search for "john" to find users with "john" in their name
- Search for partial usernames or group titles

### First Time Setup

When you run the tool for the first time:

1. It will ask for a verification code sent to your phone
2. If you have two-factor authentication enabled, it will ask for your password
3. Your session will be saved for future use

## File Structure

```
telegram-bot/
├── telegram_sender.py      # Main application
├── requirements.txt        # Python dependencies
├── config.env.example     # Example configuration file
├── config.env             # Your configuration (create this)
├── groups.txt             # List of groups and users to send to
├── message.txt            # Your message content
├── session.session        # Telegram session (auto-generated)
└── README.md              # This file
```

## Security Notes

- Keep your `config.env` file secure and never share it
- The `session.session` file contains your authentication data - keep it private
- Consider adding `config.env` and `session.session` to your `.gitignore` if using version control

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**

   - Make sure you've created `config.env` with all required fields

2. **"Error getting entity"**

   - Check if the group/user username/ID is correct
   - Make sure you're a member of the group or have chatted with the user
   - For private groups, use the group ID instead of username

3. **"FloodWaitError"**

   - You're sending messages too quickly
   - The tool includes delays, but Telegram may still rate limit
   - Wait and try again later

4. **Authentication issues**
   - Delete the `session.session` file and run the tool again
   - Make sure your phone number includes the country code

### Getting IDs

If you don't know a group or user's ID:

1. Run the tool and select "List my chats (groups & users)"
2. Find your target in the list and copy its ID
3. Add the ID to your `groups.txt` file

## Rate Limiting

The tool includes a 1-second delay between messages to avoid Telegram's rate limits. For large numbers of targets, consider:

- Sending to smaller batches
- Increasing the delay in the code if needed
- Being mindful of Telegram's terms of service

## Important Notes

- **Groups**: You must be a member of the group to send messages
- **Users**: You can only send messages to users you've previously chatted with or who have initiated a conversation with you
- **Privacy**: Respect users' privacy and don't send unsolicited messages
- **Terms of Service**: Follow Telegram's terms of service and don't use for spam

## License

This tool is for educational and personal use. Please respect Telegram's terms of service and don't use it for spam or unauthorized messaging.

## Contributing

Feel free to submit issues and enhancement requests!
