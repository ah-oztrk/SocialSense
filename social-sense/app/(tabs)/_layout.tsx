import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure this is installed

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitle: '',
        tabBarActiveTintColor: '#FFFFFF', // active icon text color
        tabBarInactiveTintColor: '#FFFFFF', // inactive icon text color
        tabBarStyle: {
          backgroundColor: '#007AFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 70,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assist"
        options={{
          title: 'Assist',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="happy" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Forum',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Logout',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="log-out" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}