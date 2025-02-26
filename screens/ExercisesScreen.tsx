import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenProps } from '../types';

const ExercisesScreen: React.FC<ScreenProps> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Exercises Screen</Text>
      <Text style={styles.subtext}>Recommended posture exercises will appear here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});

export default ExercisesScreen;