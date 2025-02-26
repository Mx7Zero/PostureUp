// Navigation.tsx - Remove TestFunctions
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

// Import screens
import HomeScreen from './screens/HomeScreen';
import PostureDetectionScreen from './screens/PostureDetectionScreen';
import ProfileScreen from './screens/ProfileScreen';
import ExercisesScreen from './screens/ExercisesScreen';
// Remove the TestFunctions import

// Create the drawer navigator
const Drawer = createDrawerNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Drawer.Navigator 
        initialRouteName="Home"
        screenOptions={{
          drawerActiveTintColor: '#4a90e2',
          drawerInactiveTintColor: '#333',
        }}
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Posture Detection" component={PostureDetectionScreen} />
        <Drawer.Screen name="Profile" component={ProfileScreen} />
        <Drawer.Screen name="Exercises" component={ExercisesScreen} />
        {/* Remove the TestFunctions screen */}
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;