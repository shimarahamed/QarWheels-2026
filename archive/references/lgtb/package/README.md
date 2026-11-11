# react-native-floating-tab-bar-glass

A beautiful, glassmorphic, floating bottom tab bar for React Native and Expo projects. It supports `react-native-reanimated` for smooth fluid animations and `expo-blur` for native blur effects.

## Installation

```bash
npm install react-native-floating-tab-bar-glass
```

Also install peer dependencies if you haven't already:
```bash
npm install @react-navigation/bottom-tabs expo-blur react-native-reanimated react-native-safe-area-context
```

## Usage with Expo Router

```tsx
import { Tabs } from 'expo-router';
import { FloatingTabBar } from 'react-native-floating-tab-bar-glass';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const isDark = true; // Use your app's color scheme here

  return (
    <Tabs
      tabBar={(props) => (
        <FloatingTabBar 
          {...props} 
          isDark={isDark} 
          activeColor={isDark ? '#FFF' : '#000'}
          inactiveColor={isDark ? '#999' : '#888'}
        />
      )}
      screenOptions={{
        contentStyle: {
          paddingBottom: 80, // Add padding to avoid content being hidden behind the floating tab bar
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## Props

The component accepts all standard `BottomTabBarProps` from `@react-navigation/bottom-tabs`, plus:

- `isDark` (boolean): Sets the theme of the tab bar (dark or light mode). Defaults to `false`.
- `activeColor` (string): Color of the focused tab icon/label.
- `inactiveColor` (string): Color of the unfocused tab icons/labels.
- `blurIntensity` (number): The intensity of the blur background. Defaults to 40 for dark mode and 70 for light mode.
