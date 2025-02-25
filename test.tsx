// test.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function DiagnosticComponent() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>PostureUp Diagnostic Screen</Text>
        <Text style={styles.subText}>Checking basic rendering...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'orange', // Bright color for visibility
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black'
  },
  subText: {
    fontSize: 16,
    color: 'gray'
  }
});