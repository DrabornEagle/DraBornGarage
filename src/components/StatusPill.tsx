import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { WorkOrderStatus } from '../types';

export const statusLabels: Record<WorkOrderStatus, string> = {
  opened: 'Kayıt Açıldı',
  received: 'Teslim Alındı',
  queued: 'Sıraya Alındı',
  precheck: 'Ön Kontrol',
  price_entered: 'Ücret Girildi',
  approval_waiting: 'Onay Bekliyor',
  repair_started: 'Tamire Başlandı',
  extra_approval_waiting: 'Ek Onay Bekliyor',
  parts_waiting: 'Parça Bekliyor',
  testing: 'Test Ediliyor',
  ready: 'Motor Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
  waiting: 'Bekliyor',
  in_progress: 'İşlemde',
  completed: 'Tamamlandı',
};

export function StatusPill({ status }: { status: WorkOrderStatus }) {
  const { colors } = useTheme();
  const color = ['opened', 'received', 'queued', 'waiting'].includes(status)
    ? colors.orange
    : ['precheck', 'price_entered', 'approval_waiting'].includes(status)
      ? colors.primary2
      : ['repair_started', 'in_progress', 'parts_waiting', 'extra_approval_waiting'].includes(status)
        ? colors.primary
        : ['testing', 'ready', 'completed'].includes(status)
          ? colors.green
          : status === 'delivered'
            ? colors.cyan
            : colors.red;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1C`, borderColor: `${color}40` }]}> 
      <Text style={[styles.text, { color }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 10, fontWeight: '900' },
});
