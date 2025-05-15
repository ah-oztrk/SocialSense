import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/authService';

export default function LogoutScreen() {
  useEffect(() => {
    // Show logout confirmation when the screen loads
    showLogoutConfirmation();
  }, []);

  const showLogoutConfirmation = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Go back to the home tab if they cancel
            router.replace('/(tabs)');
          }
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: handleSignOut
        }
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await authService.logout();
      // Use the /auth/login route instead of /(auth)/login to be consistent
      router.replace('/auth/login');
    } catch (err) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logout</Text>
      </View>
      
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Signing out...</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.manualButton}
        onPress={showLogoutConfirmation}
      >
        <Text style={styles.buttonText}>Tap to sign out manually</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#007AFF',
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  manualButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 