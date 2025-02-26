import { DrawerNavigationProp } from '@react-navigation/drawer';

// Define the parameter list for navigation
export type RootStackParamList = {
  Home: undefined;
  'Posture Detection': undefined;
  Profile: undefined;
  Exercises: undefined;
};

// Define the navigation prop type
export type NavigationProp = DrawerNavigationProp<RootStackParamList>;

// Define the props type for screens
export interface ScreenProps {
  navigation: NavigationProp;
}