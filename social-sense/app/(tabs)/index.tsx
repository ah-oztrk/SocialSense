import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StatusBar, ScrollView } from 'react-native';
import { CustomDropdown } from '@/components/Dropdown';

export default function HomeScreen() {
  const [assistant, setAssistant] = useState('Text Simplification');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  const options = [
    { label: 'Text Simplification', value: 'textSimplification' },
    { label: 'Emotion Detection', value: 'emotionDetection' },
    { label: 'Norm Detection', value: 'normDetection' },
  ];

  const handleSubmit = async () => {
    try {
      const res = await fetch('https://57e9-159-20-69-20.ngrok-free.app/generate_formatted/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: assistant,
          prompt: query,
          stream: true,
        }),
      });

      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error('API error:', error);
      setResponse('Something went wrong.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F3E7E6] px-4 pt-10">
      <View className="items-center mb-6">
        <Text className="text-3xl font-bold text-[#3C3163] mb-4">Assist</Text>
      </View>

      <Text className="text-lg font-semibold text-[#605081] mb-2">Choose Assistant:</Text>
      <View className="border border-[#84709F] rounded mb-6 overflow-hidden bg-white">
        <CustomDropdown
          options={options}
          selectedValue={assistant}
          onValueChange={setAssistant}
        />
      </View>

      <Text className="text-lg font-semibold text-[#605081] mb-2">Your Query:</Text>
      <TextInput
        className="border border-[#84709F] p-3 rounded bg-white mb-6 text-black"
        placeholder="Type your question..."
        placeholderTextColor="#84709F"
        value={query}
        onChangeText={setQuery}
        multiline
      />

      <Pressable
        onPress={handleSubmit}
        className="bg-[#A78FBC] py-3 rounded mb-6"
      >
        <Text className="text-white font-bold text-center text-lg">Submit</Text>
      </Pressable>

      {response ? (
        <View className="bg-white p-4 rounded border border-[#84709F]">
          <Text className="text-[#3C3163] font-semibold mb-2">Response:</Text>
          <Text className="text-black">{response}</Text>
        </View>
      ) : null}

      <StatusBar barStyle="dark-content" />
    </ScrollView>
  );
}
