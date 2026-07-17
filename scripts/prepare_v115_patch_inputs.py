from pathlib import Path

# Normalize the current report-card copy so the main patch can swap the cards
# without depending on historical subtitle/accent wording.
report_path = Path('src/components/ReportsDashboard.tsx')
report_text = report_path.read_text(encoding='utf-8')
actual = '''      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Ekip, tahsilat ve servis özeti" icon="business" accent={colors.cyan} onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Kendi işlerin ve kayıtların" icon="person" accent={colors.orange} onPress={() => setViewMode('personal')} />'''
normalized = '''      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Toplam gelir ve tüm Ustalar" icon="business" accent={colors.primary} onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Yalnız kendi işlerin" icon="person" accent={colors.cyan} onPress={() => setViewMode('personal')} />'''
if actual in report_text:
    report_text = report_text.replace(actual, normalized, 1)
elif normalized not in report_text:
    raise SystemExit('report source normalization match not found')
report_path.write_text(report_text, encoding='utf-8')

# Keep the generated source compatible with Expo SDK 54. The SDK 54
# expo-audio config plugin supports microphonePermission and
# recordAudioAndroid; background options are runtime options, not plugin keys.
patch_path = Path('scripts/apply_v115_live_notifications_refresh.py')
patch = patch_path.read_text(encoding='utf-8')
patch = patch.replace(
    '{"microphonePermission": False, "recordAudioAndroid": False, "enableBackgroundPlayback": False, "enableBackgroundRecording": False}',
    '{"microphonePermission": False, "recordAudioAndroid": False}',
)
patch = patch.replace(
    'const player = createAudioPlayer(source, { downloadFirst: true });',
    'const player = createAudioPlayer(source);',
)
# Avoid referencing refreshPushHealth in a hook dependency array before that
# callback has been initialized. Delivery health is refreshed by the active
# app-state effect immediately below it.
patch = patch.replace(
    '"        setPushError(null);\\n        void refreshPushHealth();\\n        return true;"',
    '"        setPushError(null);\\n        return true;"',
)
patch = patch.replace(
    'wrapper.replace("  }, [base.preferences.push_notifications_enabled, fail, pushStatus, session?.user]);", "  }, [base.preferences.push_notifications_enabled, fail, pushStatus, refreshPushHealth, session?.user]);")',
    'wrapper.replace("  }, [base.preferences.push_notifications_enabled, fail, pushStatus, session?.user]);", "  }, [base.preferences.push_notifications_enabled, fail, pushStatus, session?.user]);")',
)
patch_path.write_text(patch, encoding='utf-8')

# Correct plain-SQL invocation and make INSERT timestamp handling avoid any
# reference to OLD on INSERT operations.
migration_path = Path('supabase/migrations/20260717023000_v1_1_5_reliable_push_actions_refresh.sql')
migration = migration_path.read_text(encoding='utf-8')
migration = migration.replace(
    'perform public.notification_enqueue_pending_appointment_actions();',
    'select public.notification_enqueue_pending_appointment_actions();',
)
start = migration.index('create or replace function public.set_work_order_timestamps()')
end = migration.index('drop trigger if exists work_order_status_timestamps_insert', start)
safe_timestamp_function = '''create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if new.status in ('repair_started'::public.work_order_status,'in_progress'::public.work_order_status)
       and new.started_at is null then
      new.started_at=now();
    end if;
    if new.status='testing'::public.work_order_status and new.testing_started_at is null then
      new.testing_started_at=now();
    end if;
    if new.status in ('ready'::public.work_order_status,'completed'::public.work_order_status) then
      new.ready_at=coalesce(new.ready_at,now());
      new.completed_at=coalesce(new.completed_at,now());
    end if;
    if new.status='delivered'::public.work_order_status and new.delivered_at is null then
      new.delivered_at=now();
    end if;
    new.queue_updated_at=coalesce(new.queue_updated_at,now());
    return new;
  end if;

  if new.status in ('repair_started'::public.work_order_status,'in_progress'::public.work_order_status)
     and old.status is distinct from new.status and new.started_at is null then
    new.started_at=now();
  end if;
  if new.status='testing'::public.work_order_status
     and old.status is distinct from new.status and new.testing_started_at is null then
    new.testing_started_at=now();
  end if;
  if new.status in ('ready'::public.work_order_status,'completed'::public.work_order_status)
     and old.status is distinct from new.status then
    new.ready_at=coalesce(new.ready_at,now());
    new.completed_at=coalesce(new.completed_at,now());
  end if;
  if new.status='delivered'::public.work_order_status
     and old.status is distinct from new.status and new.delivered_at is null then
    new.delivered_at=now();
  end if;
  if old.status is distinct from new.status then
    new.queue_updated_at=now();
  end if;
  return new;
end;
$$;

'''
migration = migration[:start] + safe_timestamp_function + migration[end:]
migration_path.write_text(migration, encoding='utf-8')
