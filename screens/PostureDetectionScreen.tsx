import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';

const PostureDetectionScreen = () => {
  useKeepAwake();

  // State variables
  const [isDetecting, setIsDetecting] = useState(false);
  const [phoneAngle, setPhoneAngle] = useState(90);
  const [currentBrightness, setCurrentBrightness] = useState(1);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [positionType, setPositionType] = useState('upright');
  const [isHeld, setIsHeld] = useState(true);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [rawX, setRawX] = useState(0);
  const [rawY, setRawY] = useState(0);
  const [rawZ, setRawZ] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  // References for mutable values in the accelerometer callback
  const subscription = useRef(null);
  const originalBrightness = useRef(null);
  const lastGoodPosture = useRef(true);
  const hapticActive = useRef(false);
  const lastMotionData = useRef([]);
  const stationaryTimeout = useRef(null);
  const lowPowerCooldown = useRef(false);
  const lowPowerModeRef = useRef(false); // Track low power mode independently

  // Constants
  const GOOD_POSTURE_ANGLE = 60;
  const MOTION_THRESHOLD = 0.05;
  const STATIONARY_READINGS = 6; // number of readings to decide stillness
  const STATIONARY_DURATION = 3000; // 3 seconds before low power mode
  const LOW_POWER_COOLDOWN = 5000; // prevent rapid toggling

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
      setCurrentBrightness(brightness);
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
      setCurrentBrightness(Math.max(0, value));
      await Brightness.setBrightnessAsync(value);
    } catch (error) {
      console.error("Error setting brightness:", error);
    }
  };

  // Dim the screen by setting brightness very low
  const makeScreenBlack = async () => {
    try {
      console.log("Making screen black");
      await setScreenBrightness(0.01);
    } catch (error) {
      console.error("Error making screen black:", error);
    }
  };

  // Trigger haptic feedback if not already active
  const triggerHaptic = async () => {
    if (hapticActive.current) return;
    try {
      console.log("Starting haptic feedback");
      hapticActive.current = true;
      Vibration.cancel();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 1000, 100, 1000], true);
      console.log("Haptic feedback activated");
    } catch (error) {
      console.error("Haptic failed:", error);
    }
  };

  // Stop any ongoing haptic feedback
  const stopHaptic = () => {
    if (!hapticActive.current) return;
    console.log("Stopping haptic feedback");
    Vibration.cancel();
    hapticActive.current = false;
  };

  // Use recent accelerometer readings to decide if the phone is stationary
  const detectStationary = (data) => {
    const { x, y, z } = data;
    lastMotionData.current.push({ x, y, z });
    if (lastMotionData.current.length > STATIONARY_READINGS) {
      lastMotionData.current.shift();
    }
    if (lastMotionData.current.length < STATIONARY_READINGS) return false;
    const avgX = lastMotionData.current.reduce((sum, d) => sum + d.x, 0) / STATIONARY_READINGS;
    const avgY = lastMotionData.current.reduce((sum, d) => sum + d.y, 0) / STATIONARY_READINGS;
    const avgZ = lastMotionData.current.reduce((sum, d) => sum + d.z, 0) / STATIONARY_READINGS;
    const varianceX = lastMotionData.current.every(d => Math.abs(d.x - avgX) < MOTION_THRESHOLD);
    const varianceY = lastMotionData.current.every(d => Math.abs(d.y - avgY) < MOTION_THRESHOLD);
    const varianceZ = lastMotionData.current.every(d => Math.abs(d.z - avgZ) < MOTION_THRESHOLD);
    // Check that the phone is relatively flat (z near ±1 or near 0)
    const isFlat = Math.abs(z) > 0.9 || Math.abs(z) < 0.1;
    const isStationary = varianceX && varianceY && varianceZ && isFlat;
    console.log(`Is stationary: ${isStationary}, X: ${x.toFixed(3)}, Y: ${y.toFixed(3)}, Z: ${z.toFixed(3)}`);
    return isStationary;
  };

  // Handle scheduling low power mode when stationary and cancel it when motion is detected
  const handleStationaryState = (stationary) => {
    if (stationary) {
      // If not already scheduled or in low power mode, schedule it.
      if (!stationaryTimeout.current && !lowPowerModeRef.current) {
        console.log("Scheduling low power mode...");
        stationaryTimeout.current = setTimeout(async () => {
          console.log("Phone detected as stationary, entering low power mode...");
          await enterLowPowerMode();
          stationaryTimeout.current = null;
        }, STATIONARY_DURATION);
      }
    } else {
      if (stationaryTimeout.current) {
        console.log("Motion detected, clearing stationary timeout");
        clearTimeout(stationaryTimeout.current);
        stationaryTimeout.current = null;
      }
      if (lowPowerModeRef.current) {
        console.log("Phone picked up, exiting low power mode...");
        exitLowPowerMode();
      }
      setIsHeld(true);
    }
  };

  const enterLowPowerMode = async () => {
    if (lowPowerModeRef.current || lowPowerCooldown.current) return;
    console.log("Entering Low Power Mode");
    await makeScreenBlack();
    stopHaptic();
    lowPowerModeRef.current = true;
    setIsLowPowerMode(true);
    setIsHeld(false);
    setPositionType('not-held');
    lowPowerCooldown.current = true;
    setTimeout(() => {
      console.log("Low power cooldown reset");
      lowPowerCooldown.current = false;
    }, LOW_POWER_COOLDOWN);
  };

  const exitLowPowerMode = async () => {
    if (!lowPowerModeRef.current) return;
    console.log("Exiting Low Power Mode");
    await setScreenBrightness(originalBrightness.current || 1);
    lowPowerModeRef.current = false;
    setIsLowPowerMode(false);
  };

  // Calculate phone angle and determine its posture position
  const calculatePhonePosition = (data) => {
    const { x, y, z } = data;
    setRawX(x);
    setRawY(y);
    setRawZ(z);
    const isLandscape = Math.abs(x) > Math.abs(y);
    const tiltAxis = isLandscape ? x : y;
    const clampedTilt = Math.max(-1, Math.min(1, tiltAxis));
    const angle = Math.abs(Math.asin(clampedTilt) * (180 / Math.PI));
    setPhoneAngle(angle);
    let position;
    if (angle >= GOOD_POSTURE_ANGLE) {
      position = 'upright';
    } else if (angle < 30) {
      position = z > 0.5 ? 'above-face' : 'looking-down';
    } else {
      position = 'looking-down';
    }
    setPositionType(position);
    return position;
  };

  // Start detection: request permissions, reset state, and listen to accelerometer
  const startDetection = async () => {
    try {
      const hasPermission = await requestBrightnessPermission();
      if (!hasPermission) return;
      // Reset states
      setPositionType('upright');
      lastGoodPosture.current = true;
      hapticActive.current = false;
      setIsHeld(true);
      setIsLowPowerMode(false);
      lowPowerModeRef.current = false;
      lastMotionData.current = [];

      Accelerometer.setUpdateInterval(500);
      subscription.current = Accelerometer.addListener(data => {
        const stationary = detectStationary(data);
        handleStationaryState(stationary);
        if (!stationary) {
          // Only perform posture detection if not in low power mode.
          if (!lowPowerModeRef.current) {
            const position = calculatePhonePosition(data);
            const isGoodPosture = (position === 'upright' || position === 'above-face');
            if (isGoodPosture !== lastGoodPosture.current) {
              lastGoodPosture.current = isGoodPosture;
              if (isGoodPosture) {
                setScreenBrightness(originalBrightness.current || 1);
                stopHaptic();
              } else {
                makeScreenBlack();
                triggerHaptic();
              }
            }
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
    if (stationaryTimeout.current) {
      clearTimeout(stationaryTimeout.current);
      stationaryTimeout.current = null;
    }
    await setScreenBrightness(originalBrightness.current || 1);
    stopHaptic();
    setIsHeld(true);
    setIsLowPowerMode(false);
    lowPowerModeRef.current = false;
    setIsDetecting(false);
  };

  useEffect(() => {
    return () => {
      if (subscription.current) {
        subscription.current.remove();
      }
      if (stationaryTimeout.current) {
        clearTimeout(stationaryTimeout.current);
      }
      if (originalBrightness.current !== null) {
        Brightness.setBrightnessAsync(originalBrightness.current).catch(err =>
          console.error("Error restoring brightness:", err)
        );
      }
      stopHaptic();
    };
  }, []);

  const getPositionText = () => {
    if (!isHeld || lowPowerModeRef.current) return "Phone Not Held 😴";
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

  const renderMainButton = () => (
    <TouchableOpacity
      style={[
        styles.mainButton,
        isDetecting ? styles.stopButton : styles.startButton,
      ]}
      onPress={isDetecting ? stopDetection : startDetection}
    >
      <Text style={styles.buttonText}>
        {isDetecting ? "Stop Detection" : "Start Detection"}
      </Text>
    </TouchableOpacity>
  );

  const testMakeBlack = () => makeScreenBlack();
  const testTriggerHaptic = () => triggerHaptic();
  const testRestoreBrightness = () => {
    setScreenBrightness(originalBrightness.current || 1);
    stopHaptic();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Posture Detection</Text>
      {renderMainButton()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phone Angle: {Math.round(phoneAngle)}°</Text>
        <Text
          style={[
            styles.postureText,
            isHeld && isGoodPosition() && !lowPowerModeRef.current ? styles.goodPosture : styles.badPosture,
          ]}
        >
          {getPositionText()}
        </Text>
        <Text style={styles.brightnessText}>
          Screen Brightness: {Math.round(currentBrightness * 100)}%
        </Text>
        <Text style={styles.positionText}>Position: {positionType}</Text>
        <Text style={styles.hapticText}>
          Haptic: {hapticActive.current ? "Active" : "Inactive"}
        </Text>
        <Text style={styles.hapticText}>Held: {isHeld ? "Yes" : "No"}</Text>
        <Text style={styles.hapticText}>
          Low Power Mode: {lowPowerModeRef.current ? "On" : "Off"}
        </Text>

        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setShowDebug(!showDebug)}
        >
          <Text style={styles.debugToggleText}>
            {showDebug ? "Hide Sensor Data" : "Show Sensor Data"}
          </Text>
        </TouchableOpacity>

        {showDebug && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Raw Sensor Values:</Text>
            <Text style={styles.debugText}>X: {rawX.toFixed(3)}</Text>
            <Text style={styles.debugText}>Y: {rawY.toFixed(3)}</Text>
            <Text style={styles.debugText}>Z: {rawZ.toFixed(3)}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <Text style={styles.instruction}>
          • Hold at eye level (60°+) or in landscape for good posture.
        </Text>
        <Text style={styles.instruction}>
          • Screen dims and buzzes when looking down.
        </Text>
        <Text style={styles.instruction}>
          • Dims screen and stops buzz when put down (after 3s).
        </Text>
      </View>

      {isDetecting && (
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity style={styles.testButton} onPress={testMakeBlack}>
            <Text style={styles.buttonText}>Test Black Screen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testTriggerHaptic}>
            <Text style={styles.buttonText}>Test Haptic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testRestoreBrightness}>
            <Text style={styles.buttonText}>Restore</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderMainButton()}
    </ScrollView>
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
    marginTop: 10,
    marginBottom: 10,
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
  positionText: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  hapticText: {
    fontSize: 16,
    marginBottom: 10,
  },
  debugToggle: {
    padding: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  debugToggleText: {
    fontSize: 14,
    color: '#555',
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
  mainButton: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  testButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PostureDetectionScreen;
