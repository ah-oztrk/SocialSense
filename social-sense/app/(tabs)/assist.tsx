import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  StatusBar,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';

// Get screen dimensions for responsive tweaks
const { width: screenWidth } = Dimensions.get('window');

export default function AssistScreen() {
  const navigation = useNavigation();
  const isDark = false;

  //const [assistant, setAssistant] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  const options = [
    { label: 'Text Simplification', value: 'textSimplification' },
    { label: 'Emotion Detection', value: 'emotiondetection' },
    { label: 'Norm Analysis', value: 'socialNorm' },
  ];

  type AssistantType = 'textSimplification' | 'emotiondetection' | 'socialNorm';
  const [assistant, setAssistant] = useState<AssistantType | ''>('');

  const handleSubmit = async () => {
    if (!assistant || !query.trim()) {
      setResponse('Please select an assistant and enter a prompt.');
      return;
    }


    const modelMap: Record<AssistantType, string> = {
      textSimplification: 'textSimplification',
      emotiondetection: 'emotiondetection',
      socialNorm: 'socialNorm',
    };


    try {
      setResponse('Loading...');


      const token = await authService.getToken(); //Get token from storage

      if (!token) {
        setResponse('Not authenticated. Please login again.');
        return;
      }

      const res = await fetch('https://81fc-159-20-69-4.ngrok-free.app/query/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          model_name: modelMap[assistant as AssistantType],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Unknown error occurred');
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (error: any) {
      console.error('API error:', error);
      setResponse(`Error: ${error.message}`);
    }
  };


  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: screenWidth < 360 ? 12 : 20,
      paddingTop: 40,
      paddingBottom: 30,
      flexGrow: 1,
      backgroundColor: isDark ? '#000' : '#fff',
    },
    backButton: {
      position: 'absolute',
      top: 40,
      left: 20,
      zIndex: 1,
    },
    heading: {
      fontSize: screenWidth < 360 ? 24 : 28,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginTop: 40,
      marginBottom: 10,
      alignSelf: 'center',
    },
    subheading: {
      fontSize: 16,
      color: isDark ? '#ccc' : '#333',
      textAlign: 'center',
      marginBottom: 20,
    },
    dropdownWrapper: {
      borderWidth: 1,
      borderColor: isDark ? '#888' : '#007AFF',
      borderRadius: 10,
      marginBottom: 16,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
      overflow: 'hidden',
      minHeight: 50,
      justifyContent: 'center',
    },
    picker: {
      flex: 1,
      color: isDark ? '#00AFFF' : '#007AFF',
      fontSize: 16,
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    historyButton: {
      alignSelf: 'flex-end',
      backgroundColor: isDark ? '#3d3d6b' : '#E5E5FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 12,
    },
    historyText: {
      color: isDark ? '#cfcaff' : '#6B4EFF',
      fontWeight: '600',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#333',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? '#888' : '#007AFF',
      borderRadius: 10,
      padding: 12,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 16,
      fontSize: 15,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#1a1a1a' : '#fff',
    },
    askButton: {
      backgroundColor: '#007AFF',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    askButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
    },
    responseBox: {
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#ccc',
      borderRadius: 10,
      padding: 12,
      minHeight: 100,
      textAlignVertical: 'top',
      backgroundColor: isDark ? '#1a1a1a' : '#F9F9F9',
      fontSize: 15,
      color: isDark ? '#fff' : '#000',
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : 'black'} />
      </TouchableOpacity>

      <Text style={styles.heading}>Assistants</Text>
      <Text style={styles.subheading}>
        Choose your assistant and enter your prompt, then use the "ask" button for an answer!
      </Text>

      <View style={styles.dropdownWrapper}>
        <Picker
          selectedValue={assistant}
          onValueChange={(itemValue: AssistantType | '') => setAssistant(itemValue)}
          style={styles.picker}
          prompt="Select Assistant"
          mode="dropdown"
        >
          {!assistant && (
            <Picker.Item label="Select Assistant" value="" enabled={false} />
          )}
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Your Question</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your prompt here..."
        placeholderTextColor={isDark ? '#aaa' : '#999'}
        value={query}
        onChangeText={setQuery}
        multiline
      />

      <Pressable style={styles.askButton} onPress={handleSubmit}>
        <Text style={styles.askButtonText}>Ask!</Text>
      </Pressable>

      <TextInput
        style={styles.responseBox}
        editable={false}
        multiline
        value={response || 'The generated answer will appear here...'}
        placeholderTextColor={isDark ? '#aaa' : '#999'}
      />

      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    </ScrollView>
  );
}
