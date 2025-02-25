import { Stack } from 'expo-router';
import React from 'react';

// The simplest possible layout
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}