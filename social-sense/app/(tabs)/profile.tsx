// ... importlar (aynı kalıyor)
import React, { useEffect, useState, useCallback } from 'react';
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
  RefreshControl
} from 'react-native';
import { userService, UserUpdateData } from '@/services/userService';
import DefaultAvatar from '../../assets/images/PngItem_6490124.png';
import { Picker } from '@react-native-picker/picker';
import { historyService, History } from '@/services/historyService';
import { queryService } from '@/services/queryService';

const { width } = Dimensions.get('window');
const genderOptions = ['Male', 'Female', 'Non-Binary', 'Prefer Not to Say'];

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState<UserUpdateData>({});

  const [histories, setHistories] = useState<History[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [queriesByHistory, setQueriesByHistory] = useState<{ [key: string]: any[] }>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
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

  const fetchHistories = async () => {
    setHistoryLoading(true);
    try {
      const data = await historyService.getUserHistories();
      setHistories(data || []);
      const queriesMap: { [key: string]: any[] } = {};
      for (const history of data) {
        const queryPromises = history.query_set.map((qid) =>
          queryService.getQueryById(qid).catch(() => null)
        );
        const queries = (await Promise.all(queryPromises)).filter(Boolean);
        queriesMap[history.history_id] = queries;
      }

      setQueriesByHistory(queriesMap);
    } catch (err) {
      console.error('Error fetching histories:', err);
      setHistories([]);
    } finally {
      setHistoryLoading(false);
    }
  };


  useEffect(() => {
    fetchUserData();
    fetchHistories();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchUserData(), fetchHistories()]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
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
      <ScrollView contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
      >

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
              onChangeText={(text) => setEditData((prev) => ({ ...prev, age: parseInt(text) || 0 }))}
            />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editData.gender}
                onValueChange={(value) => setEditData((prev) => ({ ...prev, gender: value }))}
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

        <Text style={styles.sectionTitle}>Your Past Queries</Text>

        {historyLoading && (
          <ActivityIndicator size="small" color="#007AFF" />
        )}

        {!historyLoading && histories.length === 0 && (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <Text style={styles.noHistoryText}>You have no history yet.</Text>
          </View>)}
        {!historyLoading && histories.length > 0 && (
          histories.map((history) => (
            <View key={history.history_id} style={styles.historyItem}>
              {queriesByHistory[history.history_id]?.map((query) => (
                <View key={query.id} style={styles.queryBox}>
                  <Text style={styles.queryText}>🧠 {query.query}</Text>
                  <Text style={styles.responseText}>💬 {query.response}</Text>
                  <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                    <Pressable
                      onPress={async () => {
                        try {
                          console.log('[DEBUG] Trying to remove query with ID:', query.id);
                          console.log('[DEBUG] User ID:', history.user_id);
                          
                          // Format the query ID to match the pattern in query_set
                          const expectedQueryId = `qry_${history.user_id}_${query.id}`;
                          console.log('[DEBUG] Looking for query ID pattern:', expectedQueryId);
                          
                          // Find the query in the history's query_set
                          const queryToRemove = history.query_set.find(qid => 
                            qid.startsWith(`qry_${history.user_id}`)
                          );
                          
                          if (!queryToRemove) {
                            console.error('[DEBUG] Query not found in history. Query ID:', query.id);
                            console.error('[DEBUG] Available queries:', history.query_set);
                            Alert.alert('Error', 'Could not find query in history.');
                            return;
                          }

                          console.log('[DEBUG] Found query to remove:', queryToRemove);
                          await historyService.removeQueryFromHistory(history.history_id, queryToRemove);
                          
                          const updatedHistories = await historyService.getUserHistories();
                          setHistories(updatedHistories);

                          const updatedQueriesMap: { [key: string]: any[] } = {};
                          for (const h of updatedHistories) {
                            const queryPromises = h.query_set.map((qid) =>
                              queryService.getQueryById(qid).catch(() => null)
                            );
                            const queries = (await Promise.all(queryPromises)).filter(Boolean);
                            updatedQueriesMap[h.history_id] = queries;
                          }
                          setQueriesByHistory(updatedQueriesMap);
                        } catch (err) {
                          console.error('Error removing query:', err);
                          Alert.alert('Error', 'Failed to remove query.');
                        }
                      }}
                    >
                      <Text style={{ color: 'red', fontSize: 13 }}>Remove Query</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Clear All History Button */}
        {histories.length > 0 && (
          <Pressable
            style={[styles.updateButton, { backgroundColor: 'red', marginTop: 30 }]}
            onPress={async () => {
              Alert.alert(
                'Confirm',
                'Are you sure you want to clear all history?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        for (const h of histories) {
                          await historyService.deleteHistory(h.history_id);
                        }
                        setHistories([]);
                        setQueriesByHistory({});
                        Alert.alert('Success', 'All history cleared.');
                      } catch (err) {
                        console.error('Error clearing history:', err);
                        Alert.alert('Error', 'Failed to clear history.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.updateButtonText}>Clear All History</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#007AFF',
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
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f0f0',
    resizeMode: 'cover',
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
    marginTop: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
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
  },
  pickerContainer: {
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  noHistoryText: {
    fontSize: 16,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  historyItem: {
    backgroundColor: '#eef4ff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  queryBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  queryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  responseText: {
    fontSize: 13,
    color: '#555',
    marginTop: 5,
  },
});
