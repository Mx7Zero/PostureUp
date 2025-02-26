import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';

const PostureDetectionScreen = () => {
  useKeepAwake();

  const [isDetecting, setIsDetecting] = useState(false);
  const [phoneAngle, setPhoneAngle] = useState(90);
  const [currentBrightness, setCurrentBrightness] = useState(1);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [positionType, setPositionType] = useState('upright');
  const [rawX, setRawX] = useState(0);
  const [rawY, setRawY] = useState(0);
  const [rawZ, setRawZ] = useState(0);

  const subscription = useRef(null);
  const originalBrightness = useRef(null);
  const lastGoodPosture = useRef(true);

  const GOOD_POSTURE_ANGLE = 60;

  const requestBrightnessPermission = async () => {
    try {
      console.log("Requesting brightness permission...");
      if (Platform.OS === 'ios') {
        const { status } = await Brightness.requestPermissionsAsync();
        console.log("Permission status:", status);
        setPermissionStatus(status);
        if (status !== 'granted') {
          Alert.alert("Permission Required", "Brightness control permission needed.");
          return false;
        }
      }
      const brightness = await Brightness.getBrightnessAsync();
      console.log("Current brightness:", brightness);
      originalBrightness.current = brightness;
      return true;
    } catch (error) {
      console.error("Error requesting permission:", error);
      Alert.alert("Error", "Could not request brightness permission");
      return false;
    }
  };

  const setScreenBrightness = async (value) => {
    try {
      console.log("Setting brightness to:", value);
      setCurrentBrightness(Math.max(0, value)); // UI shows 0 for negative values
      await Brightness.setBrightnessAsync(value);
      if (Platform.OS === 'android') {
        await Brightness.setSystemBrightnessAsync(value);
      }
      const newBrightness = await Brightness.getBrightnessAsync();
      console.log("Brightness set, actual value:", newBrightness);
      return true;
    } catch (error) {
      console.error("Error setting brightness:", error);
      return false;
    }
  };

  const makeScreenBlack = async () => {
    try {
      console.log("Making screen black - aiming for maximum darkness");
      // Try extremely low value or negative value
      // Some devices interpret negative values as "as dark as possible"
      await setScreenBrightness(-1);

      // Fallback options if above doesn't work
      if (Platform.OS === 'ios') {
        // iOS alternative - very close to 0
        await setScreenBrightness(0.001);
      } else {
        // Android alternative
        await setScreenBrightness(0);
      }

      const actualBrightness = await Brightness.getBrightnessAsync();
      console.log("Actual brightness after making black:", actualBrightness);
      setCurrentBrightness(0); // UI shows 0% regardless of actual value
      return true;
    } catch (error) {
      console.error("Error making screen black:", error);
      // Last resort
      await setScreenBrightness(0);
      setCurrentBrightness(0);
      return false;
    }
  };

  const determinePhonePosition = (data) => {
    const { x, y, z } = data;
    setRawX(x);
    setRawY(y);
    setRawZ(z);

    const clampedY = Math.max(-1, Math.min(1, y));
    const angle = Math.abs(Math.asin(clampedY) * (180 / Math.PI));
    setPhoneAngle(angle);

    let position;
    console.log(`Angle: ${angle.toFixed(1)}°, Z: ${z.toFixed(3)}`);

    if (angle >= GOOD_POSTURE_ANGLE) {
      position = 'upright';
    } else if (angle < 30) {
      if (z > 0.5) {
        position = 'above-face';
      } else if (z < -0.5) {
        position = 'looking-down';
      } else {
        position = 'looking-down';
      }
    } else {
      if (z < 0) {
        position = 'looking-down';
      } else {
        position = 'upright';
      }
    }

    return position;
  };

  const startDetection = async () => {
    try {
      const hasPermission = await requestBrightnessPermission();
      if (!hasPermission) return;

      Accelerometer.setUpdateInterval(500);
      subscription.current = Accelerometer.addListener(data => {
        const position = determinePhonePosition(data);
        setPositionType(position);

        const isGoodPosture = position === 'upright' || position === 'above-face';

        if (isGoodPosture !== lastGoodPosture.current) {
          lastGoodPosture.current = isGoodPosture;
          if (isGoodPosture) {
            setScreenBrightness(1);
          } else {
            makeScreenBlack();
          }
        }
      });

      setIsDetecting(true);
    } catch (error) {
      console.error("Error starting detection:", error);
      Alert.alert("Error", "Failed to start posture detection");
    }
  };

  const stopDetection = async () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    if (originalBrightness.current !== null) {
      await setScreenBrightness(originalBrightness.current);
    }
    setIsDetecting(false);
  };

  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
      if (originalBrightness.current !== null) {
        Brightness.setBrightnessAsync(originalBrightness.current)
          .catch(err => console.error("Error restoring brightness:", err));
      }
    };
  }, []);

  const getPositionText = () => {
    switch (positionType) {
      case 'upright':
        return "Good Posture ✅";
      case 'above-face':
        return "Lying Down Position ✅";
      case 'looking-down':
        return "Poor Posture - Adjust Your Phone ⚠️";
      default:
        return "Detecting Position...";
    }
  };

  const isGoodPosition = () => {
    return positionType === 'upright' || positionType === 'above-face';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Posture Detection</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phone Angle: {Math.round(phoneAngle)}°</Text>
        <Text style={[
          styles.postureText,
          isGoodPosition() ? styles.goodPosture : styles.badPosture
        ]}>
          {getPositionText()}
        </Text>
        <Text style={styles.brightnessText}>
          Screen Brightness: {Math.round(currentBrightness * 100)}%
        </Text>
        <Text style={styles.permissionText}>
          Position: {positionType}
        </Text>
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Raw Sensor Values:</Text>
          <Text style={styles.debugText}>X: {rawX.toFixed(3)}</Text>
          <Text style={styles.debugText}>Y: {rawY.toFixed(3)}</Text>
          <Text style={styles.debugText}>Z: {rawZ.toFixed(3)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <Text style={styles.instruction}>• Hold at eye level (60°+) for good posture.</Text>
        <Text style={styles.instruction}>• Screen goes black when looking down.</Text>
        <Text style={styles.instruction}>• Stays bright when lying down looking up.</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isDetecting ? styles.stopButton : styles.startButton
        ]}
        onPress={isDetecting ? stopDetection : startDetection}
      >
        <Text style={styles.buttonText}>
          {isDetecting ? "Stop Detection" : "Start Detection"}
        </Text>
      </TouchableOpacity>

      {isDetecting && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={makeScreenBlack}
        >
          <Text style={styles.buttonText}>
            Test Screen Black
          </Text>
        </TouchableOpacity>
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  postureText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  goodPosture: {
    color: '#4CAF50',
  },
  badPosture: {
    color: '#F44336',
  },
  brightnessText: {
    fontSize: 16,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 10,
  },
  debugContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  instruction: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PostureDetectionScreen;