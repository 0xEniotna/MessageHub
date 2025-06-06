#!/usr/bin/env python3
"""
Telegram Group Message Sender

This tool allows you to send messages to multiple Telegram groups and users
using your personal account via the Telegram API.
"""

import asyncio
import os
import sys
from typing import List, Optional
from telethon import TelegramClient, errors
from telethon.tl.types import Chat, Channel, User
from dotenv import load_dotenv

class TelegramSender:
    def __init__(self):
        # Load environment variables
        load_dotenv('config.env')
        
        self.api_id = os.getenv('API_ID')
        self.api_hash = os.getenv('API_HASH')
        self.phone_number = os.getenv('PHONE_NUMBER')
        
        if not all([self.api_id, self.api_hash, self.phone_number]):
            raise ValueError("Missing required environment variables. Please check your config.env file.")
        
        # Initialize Telegram client
        self.client = TelegramClient('session', int(self.api_id), self.api_hash)
    
    def load_message(self, filename: str = 'message.txt') -> str:
        """Load message from a text file, ignoring comments."""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                lines = []
                for line in f:
                    # Skip comment lines (starting with #)
                    if not line.strip().startswith('#'):
                        lines.append(line.rstrip())
                
                # Join lines and remove leading/trailing whitespace
                message = '\n'.join(lines).strip()
                return message
        except FileNotFoundError:
            print(f"❌ Error: {filename} not found. Please create it and add your message.")
            return ""
        except Exception as e:
            print(f"❌ Error reading {filename}: {e}")
            return ""
    
    def load_groups(self, filename: str = 'groups.txt') -> List[str]:
        """Load group and user identifiers from a text file."""
        targets = []
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Skip empty lines and comments
                    if line and not line.startswith('#'):
                        targets.append(line)
        except FileNotFoundError:
            print(f"❌ Error: {filename} not found. Please create it and add your target identifiers.")
            return []
        
        return targets
    
    async def connect_and_auth(self):
        """Connect to Telegram and authenticate."""
        print("🔗 Connecting to Telegram...")
        await self.client.connect()
        
        if not await self.client.is_user_authorized():
            print("📱 Authentication required. Sending code to your phone...")
            await self.client.send_code_request(self.phone_number)
            
            code = input("Enter the code you received: ")
            try:
                await self.client.sign_in(self.phone_number, code)
            except errors.SessionPasswordNeededError:
                password = input("Two-factor authentication enabled. Enter your password: ")
                await self.client.sign_in(password=password)
        
        print("✅ Successfully authenticated!")
    
    async def get_entity_from_dialogs(self, identifier: str):
        """Get entity from dialogs - useful for private group chats."""
        try:
            # Search through dialogs to find the entity
            async for dialog in self.client.iter_dialogs():
                entity = dialog.entity
                
                # Check if this matches our identifier
                if str(entity.id) == identifier.lstrip('-'):
                    return entity
                elif hasattr(entity, 'username') and entity.username and f"@{entity.username}" == identifier:
                    return entity
                elif hasattr(entity, 'title') and entity.title and entity.title.lower() == identifier.lower():
                    return entity
            
            return None
        except Exception as e:
            print(f"❌ Error searching dialogs for '{identifier}': {e}")
            return None

    async def get_entity(self, identifier: str):
        """Get the entity (group, channel, or user) from identifier."""
        try:
            # First, try the identifier as-is
            entity = await self.client.get_entity(identifier)
            return entity
        except Exception as e1:
            # If it's a numeric ID, try different formats for groups
            if identifier.isdigit():
                try:
                    # Try with negative sign
                    negative_id = f"-{identifier}"
                    entity = await self.client.get_entity(negative_id)
                    return entity
                except Exception as e2:
                    try:
                        # Try with -100 prefix (supergroup format)
                        supergroup_id = f"-100{identifier}"
                        entity = await self.client.get_entity(supergroup_id)
                        return entity
                    except Exception as e3:
                        # Last resort: search through dialogs (for private group chats)
                        print(f"🔍 Standard entity resolution failed, searching dialogs for private group chat...")
                        entity = await self.get_entity_from_dialogs(identifier)
                        if entity:
                            return entity
                        
                        print(f"❌ Error getting entity '{identifier}': Tried all formats and dialog search")
                        print(f"   This might be a private group chat you can't access or don't have permission to message")
                        return None
            else:
                # For non-numeric identifiers, also try dialog search
                entity = await self.get_entity_from_dialogs(identifier)
                if entity:
                    return entity
                
                print(f"❌ Error getting entity '{identifier}': {e1}")
                return None
    
    async def send_message_to_entity(self, entity, message: str) -> bool:
        """Send a message to a specific entity (group, channel, or user)."""
        try:
            await self.client.send_message(entity, message)
            
            # Get entity name for display
            if isinstance(entity, User):
                if entity.username:
                    entity_name = f"@{entity.username}"
                else:
                    entity_name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                    if not entity_name:
                        entity_name = f"User {entity.id}"
                entity_type = "👤"
            elif hasattr(entity, 'title'):
                entity_name = entity.title
                entity_type = "📁"
            elif hasattr(entity, 'username'):
                entity_name = f"@{entity.username}"
                entity_type = "📁"
            else:
                entity_name = str(entity.id)
                entity_type = "📁"
            
            print(f"✅ Message sent to: {entity_type} {entity_name}")
            return True
        except Exception as e:
            print(f"❌ Failed to send message: {e}")
            return False
    
    async def send_to_multiple_targets(self, targets_file: str = 'groups.txt', message_file: str = 'message.txt'):
        """Send a message to multiple groups and users."""
        # Load message from file
        message = self.load_message(message_file)
        if not message:
            print("❌ No message found. Please add your message to message.txt")
            return
        
        # Load targets from file
        targets = self.load_groups(targets_file)
        if not targets:
            print("❌ No targets found. Please add groups/users to groups.txt")
            return
        
        print(f"📋 Found {len(targets)} targets to send to...")
        
        # Connect and authenticate
        await self.connect_and_auth()
        
        # Verify and display all targets before sending
        print(f"\n🔍 Verifying targets...")
        print("-" * 60)
        
        verified_targets = []
        failed_targets = []
        
        for target_id in targets:
            entity = await self.get_entity(target_id)
            if entity is None:
                failed_targets.append(target_id)
                continue
            
            # Get entity details for display
            if isinstance(entity, User):
                if entity.username:
                    entity_name = f"@{entity.username}"
                    display_name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                    if display_name:
                        entity_name += f" ({display_name})"
                else:
                    entity_name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                    if not entity_name:
                        entity_name = f"User {entity.id}"
                entity_type = "👤"
            elif hasattr(entity, 'title'):
                entity_name = entity.title
                if hasattr(entity, 'username') and entity.username:
                    entity_name += f" (@{entity.username})"
                entity_type = "📁"
            elif hasattr(entity, 'username'):
                entity_name = f"@{entity.username}"
                entity_type = "📁"
            else:
                entity_name = str(entity.id)
                entity_type = "📁"
            
            verified_targets.append((entity, entity_type, entity_name, target_id))
            print(f"✅ {entity_type} {entity_name}")
        
        # Show failed targets if any
        if failed_targets:
            print(f"\n❌ Failed to verify {len(failed_targets)} target(s):")
            for failed_target in failed_targets:
                print(f"   • {failed_target}")
        
        # Show summary and ask for confirmation
        print(f"\n📊 Receiver Summary:")
        print(f"✅ Verified targets: {len(verified_targets)}")
        print(f"❌ Failed targets: {len(failed_targets)}")
        print(f"📝 Total in file: {len(targets)}")
        
        if not verified_targets:
            print("\n❌ No valid targets to send to. Please check your groups.txt file.")
            return
        
        # Ask for receiver confirmation
        print(f"\n⚠️  You are about to send a message to {len(verified_targets)} target(s).")
        confirm_receivers = input("Do you want to proceed with these receivers? (y/N): ").strip().lower()
        
        if confirm_receivers != 'y':
            print("❌ Message sending cancelled.")
            return
        
        # Show the message preview and ask for message confirmation
        print(f"\n📝 Message from {message_file}:")
        print("=" * 60)
        print(message)
        print("=" * 60)
        print(f"📏 Message length: {len(message)} characters")
        
        # Ask for message confirmation
        print(f"\n⚠️  Please review the message above.")
        confirm_message = input("Do you want to send this message? (y/N): ").strip().lower()
        
        if confirm_message != 'y':
            print("❌ Message sending cancelled.")
            print("💡 You can edit the message in message.txt and try again.")
            return
        
        # Send messages
        print(f"\n🚀 Sending messages...")
        successful_sends = 0
        failed_sends = 0
        
        for entity, entity_type, entity_name, target_id in verified_targets:
            print(f"\n📤 Sending to: {entity_type} {entity_name}")
            
            # Send message
            success = await self.send_message_to_entity(entity, message)
            if success:
                successful_sends += 1
            else:
                failed_sends += 1
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(1)
        
        # Final summary
        print(f"\n📊 Final Summary:")
        print(f"✅ Successful: {successful_sends}")
        print(f"❌ Failed: {failed_sends}")
        print(f"📝 Total attempted: {len(verified_targets)}")
        
        if failed_sends > 0:
            print(f"\n💡 Tip: Failed sends might be due to:")
            print(f"   • Rate limiting (try again later)")
            print(f"   • Insufficient permissions")
            print(f"   • Blocked by user/group")
    
    async def list_my_chats(self):
        """List all chats (groups, channels, and users) the user has."""
        await self.connect_and_auth()
        
        print("\n📋 Your chats:")
        print("-" * 60)
        
        groups_count = 0
        users_count = 0
        
        async for dialog in self.client.iter_dialogs():
            entity = dialog.entity
            
            if isinstance(entity, User):
                if entity.bot:
                    continue  # Skip bots
                
                users_count += 1
                if entity.username:
                    identifier = f"@{entity.username}"
                else:
                    identifier = str(entity.id)
                
                display_name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                if not display_name:
                    display_name = f"User {entity.id}"
                
                print(f"👤 {display_name}")
                print(f"   ID: {identifier}")
                print()
                
            elif isinstance(entity, (Chat, Channel)):
                groups_count += 1
                if hasattr(entity, 'username') and entity.username:
                    identifier = f"@{entity.username}"
                else:
                    identifier = str(entity.id)
                
                print(f"📁 {entity.title}")
                print(f"   ID: {identifier}")
                print()
        
        print(f"📊 Total: {groups_count} groups/channels, {users_count} users")
    
    async def search_by_name(self, search_term: str):
        """Search for groups/users by name and display their IDs."""
        await self.connect_and_auth()
        
        search_term_lower = search_term.lower()
        print(f"\n🔍 Searching for '{search_term}'...")
        print("-" * 60)
        
        found_results = []
        
        async for dialog in self.client.iter_dialogs():
            entity = dialog.entity
            
            if isinstance(entity, User):
                if entity.bot:
                    continue  # Skip bots
                
                # Check if search term matches user's name or username
                display_name = f"{entity.first_name or ''} {entity.last_name or ''}".strip()
                username = entity.username or ""
                
                if (search_term_lower in display_name.lower() or 
                    search_term_lower in username.lower()):
                    
                    if entity.username:
                        identifier = f"@{entity.username}"
                    else:
                        identifier = str(entity.id)
                    
                    if not display_name:
                        display_name = f"User {entity.id}"
                    
                    found_results.append(("👤", display_name, identifier))
                    
            elif isinstance(entity, (Chat, Channel)):
                # Check if search term matches group/channel title
                title = entity.title or ""
                username = getattr(entity, 'username', None) or ""
                
                if (search_term_lower in title.lower() or 
                    search_term_lower in username.lower()):
                    
                    if hasattr(entity, 'username') and entity.username:
                        identifier = f"@{entity.username}"
                    else:
                        identifier = str(entity.id)
                    
                    found_results.append(("📁", title, identifier))
        
        if found_results:
            print(f"✅ Found {len(found_results)} results:")
            print()
            for emoji, name, identifier in found_results:
                print(f"{emoji} {name}")
                print(f"   ID: {identifier}")
                print()
            
            # Ask if user wants to add any to groups.txt
            print("💡 Tip: Copy the ID(s) you want and add them to your groups.txt file")
            add_to_file = input("\nWould you like to add any of these IDs to groups.txt? (y/n): ").strip().lower()
            
            if add_to_file == 'y':
                print("\nEnter the IDs you want to add (one per line, press Enter twice when done):")
                ids_to_add = []
                while True:
                    id_input = input().strip()
                    if not id_input:
                        break
                    ids_to_add.append(id_input)
                
                if ids_to_add:
                    try:
                        with open('groups.txt', 'a', encoding='utf-8') as f:
                            f.write('\n')
                            for id_to_add in ids_to_add:
                                f.write(f"{id_to_add}\n")
                        print(f"✅ Added {len(ids_to_add)} ID(s) to groups.txt")
                    except Exception as e:
                        print(f"❌ Error adding to file: {e}")
        else:
            print("❌ No results found.")
            print("💡 Try searching with different keywords or check the spelling.")
    
    async def disconnect(self):
        """Disconnect from Telegram."""
        await self.client.disconnect()

async def main():
    """Main function with interactive menu."""
    sender = TelegramSender()
    
    try:
        while True:
            print("\n" + "="*50)
            print("🤖 Telegram Message Sender")
            print("="*50)
            print("1. Send message to groups/users")
            print("2. List my chats (groups & users)")
            print("3. Search for groups/users by name")
            print("4. Exit")
            print("-" * 50)
            
            choice = input("Choose an option (1-4): ").strip()
            
            if choice == '1':
                print("\n📝 Reading message from message.txt...")
                await sender.send_to_multiple_targets()
            
            elif choice == '2':
                await sender.list_my_chats()
            
            elif choice == '3':
                search_term = input("\n🔍 Enter search term (name or username): ").strip()
                if search_term:
                    await sender.search_by_name(search_term)
                else:
                    print("❌ Search term cannot be empty!")
            
            elif choice == '4':
                print("👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid choice. Please try again.")
    
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user. Goodbye!")
    
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
    
    finally:
        await sender.disconnect()

if __name__ == "__main__":
    asyncio.run(main()) 