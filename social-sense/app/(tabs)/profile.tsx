import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { userService, UserUpdateData } from '@/services/userService';
import DefaultAvatar from '../../assets/images/PngItem_6490124.png';
import { Picker } from '@react-native-picker/picker';


const { width } = Dimensions.get('window');

const genderOptions = ['Male', 'Female', 'Non-Binary', 'Prefer Not to Say'];

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState<UserUpdateData>({});


  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profileData = await userService.getUserProfile();
        setUser(profileData);
        setEditData({
          username: profileData.username,
          email: profileData.email,
          name: profileData.name,
          age: profileData.age,
          gender: profileData.gender,
        });
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const updated = await userService.updateUserProfile(editData);
      setUser(updated);
      Alert.alert('Success', 'Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.avatarContainer}>
          <Image
            source={user?.avatar ? { uri: user.avatar } : DefaultAvatar}
            style={styles.avatar}
            resizeMode="cover"
          />
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>

          {user.age ? <Text style={styles.info}>Age: {user.age}</Text> : null}
          {user.gender ? <Text style={styles.info}>Gender: {user.gender}</Text> : null}
        </View>

        {!editing && (
          <Pressable style={styles.updateButton} onPress={() => setEditing(true)}>
            <Text style={styles.updateButtonText}>Update Profile</Text>
          </Pressable>
        )}

        {editing && (
          <View style={styles.editSection}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editData.username}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, username: text }))}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={editData.email}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, email: text }))}
            />

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(text) => setEditData((prev) => ({ ...prev, name: text }))}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editData.age?.toString()}
              onChangeText={(text) =>
                setEditData((prev) => ({ ...prev, age: parseInt(text) || 0 }))
              }
            />

            <Text style={styles.label}>Gender</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={editData.gender}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, gender: value }))
                  }
                  style={styles.picker}
                >
                  {genderOptions.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>


            <Pressable style={styles.updateButton} onPress={handleUpdate} disabled={updating}>
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Save Changes</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#007AFF', // Mavi ton
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
 avatar: {
  width: 90,
  height: 90,
  borderRadius: 45, // dairesel
  marginBottom: 12,
  borderWidth: 2,
  borderColor: '#007AFF',
  backgroundColor: '#f0f0f0',
  resizeMode: 'cover', // içeriği düzgün kırpar
},
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  editSection: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    color: '#333',
  },
  input: {
    backgroundColor: '#f0f6ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
});
