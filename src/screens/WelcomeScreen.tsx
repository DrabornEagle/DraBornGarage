import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Image
        source={require('../../assets/draborngarage-welcome.png')}
        style={styles.image}
        resizeMode="contain"
        fadeDuration={0}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Başla"
        onPress={onStart}
        style={styles.startHitArea}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  startHitArea: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    bottom: '4.2%',
    height: '10.8%',
    borderRadius: 24,
  },
});
