import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { WorkOrderStatus } from '../types';

const labels: Record<WorkOrderStatus, string> = {
  waiting: 'Bekliyor',
  in_progress: 'İşlemde',
  completed: 'Tamamlandı',
  delivered: 'Teslim edildi',
  cancelled: 'İptal',
};

export function StatusPill({ status }: { status: WorkOrderStatus }) {
  const { colors } = useTheme();
  const color = status === 'waiting' ? colors.orange : status === 'in_progress' ? colors.primary2 : status === 'completed' ? colors.green : status === 'delivered' ? colors.cyan : colors.red;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1C`, borderColor: `${color}40` }]}> 
      <Text style={[styles.text, { color }]}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 }, text: { fontSize: 11, fontWeight: '900' } });
