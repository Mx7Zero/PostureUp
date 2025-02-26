// app/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from 'react-native';

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <Drawer 
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#121212' : '#f5f5f5',
        },
        headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
        drawerActiveTintColor: '#4a90e2',
        drawerInactiveTintColor: '#333',
      }}
    >
      {/* Define your screens here */}
      <Drawer.Screen
        name="index" // This corresponds to app/index.tsx
        options={{ 
          title: "Home",
          drawerLabel: "Home"
        }}
      />
      <Drawer.Screen
        name="posture-detection" // This corresponds to app/posture-detection.tsx
        options={{ 
          title: "Posture Detection",
          drawerLabel: "Posture Detection"
        }}
      />
      <Drawer.Screen
        name="profile" // This corresponds to app/profile.tsx
        options={{ 
          title: "Profile",
          drawerLabel: "Profile"
        }}
      />
      <Drawer.Screen
        name="exercises" // This corresponds to app/exercises.tsx
        options={{ 
          title: "Exercises",
          drawerLabel: "Exercises"
        }}
      />
    </Drawer>
  );
}