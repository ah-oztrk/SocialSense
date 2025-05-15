import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { authService } from '../services/authService';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const [authState, setAuthState] = useState({
    isChecking: true,
    isLoggedIn: false
  });

  // Check auth state directly with the service
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isLoggedIn = await authService.isLoggedIn();
        setAuthState({
          isChecking: false,
          isLoggedIn
        });
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthState({
          isChecking: false,
          isLoggedIn: false
        });
      }
    };

    checkAuth();
  }, []);

  if (authState.isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (authState.isLoggedIn) {
    return <Redirect href="/(tabs)" />;
  } else {
    // Using any type to bypass TypeScript path restrictions
    return <Redirect href={"/auth/login" as any} />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
}); 