import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";

type MainPageProps = {
  username?: string;
};

export default function MainPage({ username = "User" }: MainPageProps) {
  const { width } = useWindowDimensions();

  return (
    
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingHorizontal: width * 0.06 }]}>
          <Text style={styles.greeting}>
            Welcome, <Text style={styles.username}>{username} 👋</Text>
          </Text>
          <Text style={styles.subheading}>This is Social Sense</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.intro}>
            Social Sense is a safe and supportive space designed to help people navigate the social world. Whether
            it’s understanding social norms, detecting emotions, or simplifying
            complex communication, we’re here for you!
          </Text>

          <Text style={styles.sectionHeader}>What can you do here?</Text>

          {features.map((f, i) => (
            <View key={i} style={styles.featureBox}>
              <Text style={styles.featureTitle}>{f.icon} {f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const features = [
  {
    icon: "🧠",
    title: "Social Context Help",
    desc: "Ask about social norms and receive guidance.",
  },
  {
    icon: "😊",
    title: "Emotion Detection",
    desc: "Analyze text to uncover the emotions within it.",
  },
  {
    icon: "✍️",
    title: "Simplify Text",
    desc: "Break down complex sentences for better understanding.",
  },
  {
    icon: "💬",
    title: "Forum",
    desc: "Engage with the community, ask questions or share advice.",
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  username: {
    fontWeight: "bold",
  },
  subheading: {
    fontSize: 18,
    color: "#e0f0ff",
    marginTop: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  intro: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 14,
  },
  featureBox: {
    backgroundColor: "#f0f6ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: "#444",
  },
});