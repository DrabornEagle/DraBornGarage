from pathlib import Path
import json

app_path = Path('App.tsx')
app = app_path.read_text()
app = app.replace("import { SystemBars } from 'react-native-edge-to-edge';", "import { StatusBar } from 'expo-status-bar';")
app = app.replace("return <SystemBars style={resolvedMode === 'dark' ? 'light' : 'dark'} />;", "return <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />;")
if 'SystemBars' in app:
    raise SystemExit('SystemBars replacement incomplete')
app_path.write_text(app)

notification_path = Path('src/notifications/NotificationContextV101.tsx')
notification = notification_path.read_text()
listener_start = notification.index("  useEffect(() => {\n    mountedRef.current = true;")
listener_end_marker = "\n  }, []);"
listener_end = notification.index(listener_end_marker, listener_start) + len(listener_end_marker)
new_listener = '''  useEffect(() => {
    mountedRef.current = true;
    ensureAndroidChannels().catch(() => undefined);

    const api = Notifications as typeof Notifications & Record<string, unknown>;
    if (typeof api.getPermissionsAsync === 'function') {
      Promise.resolve(Notifications.getPermissionsAsync())
        .then((status) => mountedRef.current && setPermissionStatus(status.status))
        .catch(() => undefined);
    }

    let receivedListener: { remove?: () => void } | null = null;
    if (typeof api.addNotificationReceivedListener === 'function') {
      try {
        receivedListener = Notifications.addNotificationReceivedListener((notification) => {
          const data = notification.request.content.data || {};
          const notificationId = typeof data.notificationId === 'string'
            ? data.notificationId
            : typeof data.notification_id === 'string'
              ? data.notification_id
              : null;
          if (!notificationId) return;
          const ids = receivedSystemNotificationIdsRef.current;
          ids.add(notificationId);
          while (ids.size > 350) {
            const oldest = ids.values().next().value;
            if (typeof oldest !== 'string') break;
            ids.delete(oldest);
          }
        });
      } catch {
        receivedListener = null;
      }
    }

    return () => {
      mountedRef.current = false;
      if (typeof receivedListener?.remove === 'function') receivedListener.remove();
    };
  }, []);'''
notification = notification[:listener_start] + new_listener + notification[listener_end:]

response_start = notification.index("  useEffect(() => {\n    let lastResponseKey = '';")
response_end_marker = "\n  }, [refresh]);"
response_end = notification.index(response_end_marker, response_start) + len(response_end_marker)
new_response = '''  useEffect(() => {
    let lastResponseKey = '';
    const handleResponse = (event: Notifications.NotificationResponse | null) => {
      if (!event) return;
      const data = event.notification.request.content.data || {};
      const responseKey = `${event.notification.request.identifier}:${event.actionIdentifier}`;
      if (lastResponseKey === responseKey) return;
      lastResponseKey = responseKey;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : typeof data.notification_id === 'string' ? data.notification_id : undefined;
      if (notificationId) supabase.rpc('notification_mark_read', { p_notification_id: notificationId }).then(() => refresh());
      setNavigationTarget({
        targetTab: typeof data.targetTab === 'string' ? data.targetTab : typeof data.target_tab === 'string' ? data.target_tab : undefined,
        targetSection: typeof data.targetSection === 'string' ? data.targetSection : typeof data.target_section === 'string' ? data.target_section : undefined,
        notificationId,
        data: data as Record<string, unknown>,
      });
      setOpen(false);
    };
    const api = Notifications as typeof Notifications & {
      getLastNotificationResponse?: () => Notifications.NotificationResponse | null;
      getLastNotificationResponseAsync?: () => Promise<Notifications.NotificationResponse | null>;
      addNotificationResponseReceivedListener?: typeof Notifications.addNotificationResponseReceivedListener;
    };
    if (typeof api.getLastNotificationResponseAsync === 'function') api.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    else if (typeof api.getLastNotificationResponse === 'function') handleResponse(api.getLastNotificationResponse());
    let response: { remove?: () => void } | null = null;
    if (typeof api.addNotificationResponseReceivedListener === 'function') {
      try {
        response = api.addNotificationResponseReceivedListener(handleResponse);
      } catch {
        response = null;
      }
    }
    return () => {
      if (typeof response?.remove === 'function') response.remove();
    };
  }, [refresh]);'''
notification = notification[:response_start] + new_response + notification[response_end:]
notification_path.write_text(notification)

center_path = Path('src/notifications/NotificationCenterScreen.tsx')
center = center_path.read_text()
if 'if (!open) return null;' not in center:
    target = "  }, [tab, notifications, upcoming]);\n\n  const permissionLabel"
    if target not in center:
        raise SystemExit('Notification center guard target not found')
    center = center.replace(target, "  }, [tab, notifications, upcoming]);\n\n  if (!open) return null;\n\n  const permissionLabel", 1)
center_path.write_text(center)

boundary_path = Path('src/components/AppErrorBoundary.tsx')
boundary = boundary_path.read_text()
if 'error.stack.split' not in boundary:
    old = "<View style={styles.errorBox}><Text selectable style={styles.errorText}>{error.message || 'Bilinmeyen uygulama hatası'}</Text></View>"
    new = "<View style={styles.errorBox}><Text selectable style={styles.errorText}>{error.message || 'Bilinmeyen uygulama hatası'}{error.stack ? `\\n\\n${error.stack.split('\\n').slice(0, 10).join('\\n')}` : ''}</Text></View>"
    if old not in boundary:
        raise SystemExit('Error diagnostics target not found')
    boundary = boundary.replace(old, new, 1)
boundary_path.write_text(boundary)

app_json_path = Path('app.json')
app_json = json.loads(app_json_path.read_text())
app_json['expo']['version'] = '1.0.8'
app_json['expo']['android']['versionCode'] = 26
app_json['expo']['ios']['buildNumber'] = '26'
app_json_path.write_text(json.dumps(app_json, ensure_ascii=False, indent=2) + '\n')

package_path = Path('package.json')
package = json.loads(package_path.read_text())
package['version'] = '1.0.8'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n')

lock_path = Path('package-lock.json')
lock = json.loads(lock_path.read_text())
lock['version'] = '1.0.8'
if '' in lock.get('packages', {}):
    lock['packages']['']['version'] = '1.0.8'
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n')
