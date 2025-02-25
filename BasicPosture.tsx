import React, { useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";

// A completely static component with no motion detection or effects
export default function BasicPosture() {
  const [count, setCount] = useState(0);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic Posture App</Text>
      <Text style={styles.text}>This is a minimal component.</Text>
      <Text style={styles.text}>Count: {count}</Text>
      <Button 
        title="Increment" 
        onPress={() => setCount(prev => prev + 1)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20
  },
  text: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 20
  }
});