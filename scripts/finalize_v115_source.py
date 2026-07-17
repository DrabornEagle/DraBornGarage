from pathlib import Path

wrapper_path = Path('src/notifications/NotificationContextV115.tsx')
wrapper = wrapper_path.read_text(encoding='utf-8')
old_effect = """    if (!session?.user || !base.preferences.push_notifications_enabled) return;
    void registerPushNotifications();
    const listener = AppState.addEventListener('change', (state) => {
"""
new_effect = """    if (!session?.user || !base.preferences.push_notifications_enabled) return;
    void registerPushNotifications();
    void refreshPushHealth();
    const listener = AppState.addEventListener('change', (state) => {
"""
if old_effect in wrapper:
    wrapper = wrapper.replace(old_effect, new_effect, 1)
elif new_effect not in wrapper:
    raise SystemExit('NotificationContextV115 initial health effect not found')
wrapper_path.write_text(wrapper, encoding='utf-8')

migration_path = Path('supabase/migrations/20260717023000_v1_1_5_reliable_push_actions_refresh.sql')
migration = migration_path.read_text(encoding='utf-8')
migration = migration.replace(
    "'draborngarage-appointment-action-reminders','*/5 * * * *'",
    "'draborngarage-appointment-action-reminders','* * * * *'",
)
if "'draborngarage-appointment-action-reminders','* * * * *'" not in migration:
    raise SystemExit('Appointment reminder cron was not updated')
migration_path.write_text(migration, encoding='utf-8')
