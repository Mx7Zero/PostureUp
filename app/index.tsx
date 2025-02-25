import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

export default function PostureUp() {
  const [poorPostureCount, setPoorPostureCount] = useState(0);
  const motionListenerRef = useRef<any>(null);
  const isMonitoringRef = useRef(false);

  useEffect(() => {
    // Ensure only one motion listener is active
    if (!isMonitoringRef.current) {
      startPostureMonitoring();
    }

    // Cleanup function
    return () => {
      stopPostureMonitoring();
    };
  }, []); // Empty dependency array to run only once

  const startPostureMonitoring = () => {
    if (isMonitoringRef.current) return;
    
    isMonitoringRef.current = true;
    console.log('Starting stable motion monitoring');

    motionListenerRef.current = DeviceMotion.addListener((motionData) => {
      if (!motionData?.rotation) return;

      const beta = Math.abs(motionData.rotation.beta * (180 / Math.PI));
      
      // Different thresholds for sitting and walking
      const sensitivityThresholds = {
        sitting: 45,  // More strict when sitting
        walking: 60   // More lenient when walking
      };

      const currentThreshold = beta > 30 ? sensitivityThresholds.walking : sensitivityThresholds.sitting;

      if (beta > currentThreshold) {
        setPoorPostureCount(prev => prev + 1);
        console.log(`Poor posture detected: ${beta.toFixed(2)}° > ${currentThreshold}°`);
      }
    });

    // Set a reasonable update interval
    DeviceMotion.setUpdateInterval(500); // 500ms between updates
  };

  const stopPostureMonitoring = () => {
    if (motionListenerRef.current) {
      motionListenerRef.current.remove();
      motionListenerRef.current = null;
      isMonitoringRef.current = false;
      console.log('Stopped motion monitoring');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Posture Monitoring Active</Text>
      <Text style={styles.subText}>Poor Posture Instances: {poorPostureCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0'
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  subText: {
    fontSize: 18,
    color: 'grey'
  }
});