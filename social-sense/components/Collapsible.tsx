import { PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CollapsibleProps {
  children: React.ReactNode;
  title: string;
  onToggle?: () => void;
  isOpen?: boolean;
}

export function Collapsible({ children, title, onToggle, isOpen = false }: CollapsibleProps) {
  const theme = useColorScheme() ?? 'light';

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color="#007AFF"
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <Text style={styles.headingText}>{title}</Text>
      </TouchableOpacity>
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginTop: 8,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f6ff',
    padding: 6,
    borderRadius: 6,
  },
  headingText: {
    fontWeight: '600',
    color: '#333',
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
    backgroundColor: '#fff',
  },
});