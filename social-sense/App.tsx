import "./global.css"
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ExpoRoot } from 'expo-router';

export default function App() {
  const ctx = require.context('./app');
  
  return (
    <AuthProvider>
      <ExpoRoot context={ctx} />
    </AuthProvider>
  );
}