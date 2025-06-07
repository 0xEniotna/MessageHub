print("🔧 Initializing scheduled message processor...")
scheduled_processor = ScheduledMessageProcessor(db_manager, telegram_manager, async_executor)

# Now restore existing sessions after all components are ready
print("🔄 Restoring existing Telegram sessions...")
run_async(telegram_manager.restore_existing_sessions())

print("✅ All components initialized!")

# Register globals for Flask app 