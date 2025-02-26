// screens/PostureDetectionScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';

const PostureDetectionScreen = () => {
  // Keep the screen awake during posture detection
  useKeepAwake();
  
  // State variables
  const [isEnabled, setIsEnabled] = useState(false);
  const [phoneAngle, setPhoneAngle] = useState(90);
  const [isGoodPosture, setIsGoodPosture] = useState(true);
  const [hasBrightnessPermission, setHasBrightnessPermission] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState(null);
  
  // References
  const subscription = useRef(null);
  
  // Constants
  const GOOD_POSTURE_ANGLE = 80; // Minimum angle for good posture
  
  // Request brightness permission
  const requestPermissions = async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const brightness = await Brightness.getBrightnessAsync();
        setOriginalBrightness(brightness);
        setHasBrightnessPermission(true);
        return true;
      } else {
        console.log('Brightness permission denied');
        setHasBrightnessPermission(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting brightness permission:', error);
      return false;
    }
  };
  
  // Calculate phone angle from accelerometer data
  const calculatePhoneAngle = (data) => {
    const { y } = data;
    if (y === null) return 90;
    
    // Clamp y value between -1 and 1
    const clampedY = Math.max(-1, Math.min(1, y));
    
    // Calculate angle in degrees
    return Math.abs(Math.asin(clampedY) * (180 / Math.PI));
  };
  
  // Set screen brightness based on posture - ON/OFF only, no gradual dimming
  const updateBrightness = async (isGood) => {
    if (!hasBrightnessPermission) return;
    
    try {
      if (isGood) {
        // Good posture - full brightness
        await Brightness.setBrightnessAsync(1);
      } else {
        // Bad posture - nearly black (very low brightness)
        await Brightness.setBrightnessAsync(0.05);
      }
    } catch (error) {
      console.error('Error updating brightness:', error);
    }
  };
  
  // Toggle posture detection
  const togglePostureDetection = async (value) => {
    setIsEnabled(value);
    
    if (value) {
      // Start posture detection
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;
      
      // Set up accelerometer subscription
      Accelerometer.setUpdateInterval(500); // Check every 500ms
      subscription.current = Accelerometer.addListener(data => {
        const angle = calculatePhoneAngle(data);
        setPhoneAngle(angle);
        
        const newPostureState = angle >= GOOD_POSTURE_ANGLE;
        if (newPostureState !== isGoodPosture) {
          setIsGoodPosture(newPostureState);
          updateBrightness(newPostureState);
        }
      });
    } else {
      // Stop posture detection
      if (subscription.current) {
        subscription.current.remove();
      }
      
      // Restore original brightness
      if (originalBrightness !== null && hasBrightnessPermission) {
        await Brightness.setBrightnessAsync(originalBrightness);
      }
    }
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
      
      // Restore original brightness
      if (originalBrightness !== null && hasBrightnessPermission) {
        Brightness.setBrightnessAsync(originalBrightness)
          .catch(error => console.error('Error restoring brightness:', error));
      }
    };
  }, [originalBrightness, hasBrightnessPermission]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Posture Detection</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Phone Angle</Text>
        <Text style={styles.angleText}>{Math.round(phoneAngle)}°</Text>
        <View style={styles.postureIndicator}>
          <Text style={[
            styles.postureText, 
            isGoodPosture ? styles.goodPostureText : styles.badPostureText
          ]}>
            {isGoodPosture ? 'Good Posture ✅' : 'Poor Posture - Adjust Your Phone ⚠️'}
          </Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Posture Assistant</Text>
        <Text style={styles.description}>
          When enabled, your screen will turn OFF when your phone is held at an angle 
          below {GOOD_POSTURE_ANGLE}°, and turn back ON when raised to eye level.
        </Text>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Screen Darkening:</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#4a90e2' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={togglePostureDetection}
            value={isEnabled}
          />
          <Text style={styles.switchStatus}>{isEnabled ? 'ON' : 'OFF'}</Text>
        </View>
        
        <Text style={styles.permissionText}>
          Brightness Permission: {hasBrightnessPermission ? 'Granted ✅' : 'Not Granted ❌'}
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <Text style={styles.instruction}>• Hold your phone at eye level ({GOOD_POSTURE_ANGLE}°+) to maintain good posture.</Text>
        <Text style={styles.instruction}>• The screen will turn OFF when you're holding the phone at a lower angle.</Text>
        <Text style={styles.instruction}>• Raise the phone back to eye level to turn the screen back ON.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  angleText: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  postureIndicator: {
    alignItems: 'center',
  },
  postureText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  goodPostureText: {
    color: '#4CAF50',
  },
  badPostureText: {
    color: '#F44336',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  switchStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
  },
});

export default PostureDetectionScreen;