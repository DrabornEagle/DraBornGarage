import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AnimatedPressable } from './AnimatedPressable';

type BoundaryProps = {
  children: React.ReactNode;
  fallback: (error: Error, reset: () => void) => React.ReactNode;
};

type BoundaryState = { error: Error | null };

class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('DraBornGarage recovered from an application error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}

function RecoveryScreen({ error, reset }: { error: Error; reset: () => void }) {
  const { signOut } = useAuth();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DraBornGarage • Güvenli Kurtarma</Text>
        <Text style={styles.title}>Uygulama kapanmadan hata yakalandı</Text>
        <Text style={styles.body}>Oturum veya bildirim başlatılırken beklenmeyen bir sorun oluştu. Önce yeniden dene; devam ederse oturumu temizleyip tekrar giriş yap.</Text>
        <View style={styles.errorBox}><Text selectable style={styles.errorText}>{error.message || 'Bilinmeyen uygulama hatası'}{error.stack ? `\n\n${error.stack.split('\n').slice(0, 10).join('\n')}` : ''}</Text></View>
        <AnimatedPressable onPress={reset} style={styles.primary}><Text style={styles.primaryText}>Yeniden Dene</Text></AnimatedPressable>
        <AnimatedPressable onPress={() => signOut()} style={styles.secondary}><Text style={styles.secondaryText}>Oturumu Temizle</Text></AnimatedPressable>
      </ScrollView>
    </View>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <Boundary fallback={(error, reset) => <RecoveryScreen error={error} reset={reset} />}>{children}</Boundary>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#071019' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  eyebrow: { color: '#35E0C1', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900' },
  body: { color: '#AAB6C5', fontSize: 15, lineHeight: 23 },
  errorBox: { borderWidth: 1, borderColor: '#F05A67AA', borderRadius: 16, padding: 14, backgroundColor: '#F05A6712' },
  errorText: { color: '#FFD6DA', fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondary: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#526176' },
  secondaryText: { color: '#D8E1EC', fontSize: 15, fontWeight: '900' },
});
