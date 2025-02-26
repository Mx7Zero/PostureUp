// App.tsx
import 'react-native-gesture-handler'; // This MUST be the first import
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Navigation from './Navigation';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <Navigation />
    </>
  );
}