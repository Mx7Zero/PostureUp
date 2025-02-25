// TestComponent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TestComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>PostureUp Test</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'purple'
  },
  text: {
    color: 'white',
    fontSize: 24
  }
});