import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, View, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';

import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { forumService, Question, Answer } from '@/services/forumService';
import { authService } from '@/services/authService';
import { API_BASE_URL } from '@/constants/Config';

const { width } = Dimensions.get('window');

export default function ForumScreen() {
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: Answer[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMyQuestions, setShowMyQuestions] = useState(false);
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});
  const [replyLoading, setReplyLoading] = useState<{ [key: string]: boolean }>({});
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const checkAuth = async () => {
    try {
      const isLoggedIn = await authService.isLoggedIn();
      if (!isLoggedIn) {
        // Redirect to login if not authenticated
        router.replace('/auth/login');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Auth check error:', err);
      router.replace('/auth/login');
      return false;
    }
  };

  const loadQuestions = async (showLoader = true) => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) return;

      if (showLoader) setLoading(true);
      setError(null);
      
      let fetchedQuestions;
      
      try {
        if (showMyQuestions) {
          fetchedQuestions = await forumService.getUserQuestions();
        } else {
          fetchedQuestions = await forumService.getQuestions();
        }
        
        // Successfully fetched questions (even if empty array)
        setQuestions(fetchedQuestions);
        setError(null);
      } catch (err) {
        // If error message indicates authentication issue, redirect to login
        if (err instanceof Error) {
          const errorMessage = err.message.toLowerCase();
          if (errorMessage.includes('authentication') || 
              errorMessage.includes('auth') || 
              errorMessage.includes('login') ||
              errorMessage.includes('token') ||
              errorMessage.includes('401') ||
              errorMessage.includes('403')) {
            console.log('Authentication error detected, redirecting to login');
            router.replace('/auth/login');
            return;
          }
        }
        throw err; // Re-throw the error to be caught by the outer catch block
      }

      // Only try to fetch answers if we have questions
      if (fetchedQuestions.length > 0) {
        const answersMap: { [key: string]: Answer[] } = {};
        for (const question of fetchedQuestions) {
          try {
            const questionAnswers = await forumService.getQuestionAnswers(question.question_id);
            answersMap[question.question_id] = questionAnswers;
          } catch (err) {
            console.error(`Error loading answers for question ${question.question_id}:`, err);
            answersMap[question.question_id] = [];
          }
        }
        setAnswers(answersMap);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load questions. Please try again later.';
      setError(errMsg);
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createSampleQuestion = async () => {
    try {
      setPosting(true);
      setError(null);
      await forumService.postQuestion(
        "Welcome to the Forum!",
        "This is a sample question to get the forum started. Feel free to reply or create your own questions!"
      );
      // Reload questions after creating sample
      await loadQuestions();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create sample question.';
      setError(errMsg);
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [showMyQuestions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadQuestions(false);
  }, [showMyQuestions]);

  const handlePostQuestion = async () => {
    if (!questionTitle.trim() || !questionContent.trim()) return;

    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    try {
      setPosting(true);
      setError(null);
      const postedQuestion = await forumService.postQuestion(questionTitle, questionContent);
      setQuestions(prev => [postedQuestion, ...prev]);
      setAnswers(prev => ({ ...prev, [postedQuestion.question_id]: [] }));
      setQuestionTitle('');
      setQuestionContent('');
      setShowQuestionForm(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to post question. Please try again.';
      setError(errMsg);
      console.error('Error posting question:', err);
    } finally {
      setPosting(false);
    }
  };

  const handlePostReply = async (questionId: string) => {
    const replyContent = replyInputs[questionId];
    if (!replyContent?.trim()) return;

    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    try {
      setReplyLoading(prev => ({ ...prev, [questionId]: true }));
      setError(null);
      const newAnswer = await forumService.postReply(questionId, replyContent);
      setAnswers(prev => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), newAnswer]
      }));
      setReplyInputs(prev => ({ ...prev, [questionId]: '' }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to post reply. Please try again.';
      setError(errMsg);
      console.error('Error posting reply:', err);
    } finally {
      setReplyLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleReplies = (questionId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const renderQuestion = (question: Question) => {
    const isExpanded = expandedReplies[question.question_id] || false;
    return (
      <Pressable key={question.question_id} style={styles.questionItem}>
        <View style={styles.questionContent}>
          <ThemedText style={styles.questionTitle}>{question.question_header || 'Untitled Question'}</ThemedText>
          <ThemedText numberOfLines={2} style={styles.questionText}>{question.question}</ThemedText>
          <View style={styles.questionMetaContainer}>
            <ThemedText style={styles.authorText}>
              Posted by {question.username || `User ${question.user_id}`}
            </ThemedText>
            <ThemedText style={styles.timestampText}>
              {new Date(question.creation_date).toLocaleString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Istanbul',
              })}
            </ThemedText>
          </View>
          <Collapsible
            title={isExpanded ? 'Hide replies...' : 'See replies...'}
            onToggle={() => toggleReplies(question.question_id)}
          >
            {answers[question.question_id]?.length > 0 ? (
              answers[question.question_id].map((answer) => (
                <ThemedView key={answer.answer_id} style={styles.replyItem}>
                  <ThemedText>{answer.answer}</ThemedText>
                  <View style={styles.replyMeta}>
                    <ThemedText style={styles.authorText}>
                      Posted by {answer.username || `User ${answer.user_id}`}
                    </ThemedText>
                    <ThemedText style={styles.timestampText}>
                      {new Date(answer.creation_date).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Istanbul',
                      })}
                    </ThemedText>
                  </View>
                </ThemedView>
              ))
            ) : (
              <ThemedText>No replies yet.</ThemedText>
            )}
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                value={replyInputs[question.question_id] || ''}
                onChangeText={(text) => setReplyInputs(prev => ({ ...prev, [question.question_id]: text }))}
                placeholder="Type your reply..."
                multiline
              />
              <Pressable
                style={[styles.replyButton, !replyInputs[question.question_id]?.trim() && styles.replyButtonDisabled]}
                onPress={() => handlePostReply(question.question_id)}
                disabled={!replyInputs[question.question_id]?.trim() || replyLoading[question.question_id]}
              >
                {replyLoading[question.question_id] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.replyButtonText}>Post Reply</ThemedText>
                )}
              </Pressable>
            </View>
          </Collapsible>
        </View>
      </Pressable>
    );
  };

  const checkDatabaseStatus = async () => {
    try {
      setShowDebug(true);
      const token = await authService.getToken();
      
      if (!token) {
        setDebugInfo({ error: "No authentication token found" });
        return;
      }
      
      const url = `${API_BASE_URL}/debug/db-status`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      
      setDebugInfo(data);
    } catch (err) {
      setDebugInfo({ error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6B4EFF']}
        />
      }
    >
      <ThemedView style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.title}>Forum</ThemedText>
          <ThemedText style={styles.subtitle}>
            Ask a question to the fellow Sensers or answer other asks!
          </ThemedText>
        </View>
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <View style={styles.buttonRow}>
            <Pressable style={styles.retryButton} onPress={() => loadQuestions()}>
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </Pressable>
            
            <Pressable style={styles.debugButton} onPress={checkDatabaseStatus}>
              <ThemedText style={styles.debugButtonText}>Diagnose</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      )}

      {showDebug && debugInfo && (
        <ThemedView style={styles.debugContainer}>
          <ThemedText style={styles.debugTitle}>Backend Status</ThemedText>
          <ScrollView style={styles.debugScroll}>
            <ThemedText style={styles.debugText}>
              {JSON.stringify(debugInfo, null, 2)}
            </ThemedText>
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={() => setShowDebug(false)}>
            <ThemedText style={styles.closeButtonText}>Close</ThemedText>
          </Pressable>
        </ThemedView>
      )}

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.createQuestionButton}
          onPress={() => setShowQuestionForm(!showQuestionForm)}
        >
          <IconSymbol size={20} name="plus.circle" color="#6B4EFF" />
          <ThemedText style={styles.createQuestionText}>
            {showQuestionForm ? 'Cancel' : 'Create New Question'}
          </ThemedText>
        </Pressable>

        <Pressable 
          style={styles.historyButton}
          onPress={() => setShowMyQuestions(!showMyQuestions)}
        >
          <IconSymbol size={20} name="clock.circle" color="#6B4EFF" />
          <ThemedText style={styles.historyText}>
            {showMyQuestions ? 'All Questions' : 'Your Interaction History'}
          </ThemedText>
        </Pressable>
      </View>

      {showQuestionForm && (
        <ThemedView style={styles.questionForm}>
          <TextInput
            style={styles.formInput}
            value={questionTitle}
            onChangeText={setQuestionTitle}
            placeholder="Question Title"
          />
          <TextInput
            style={[styles.formInput, { minHeight: 100 }]}
            value={questionContent}
            onChangeText={setQuestionContent}
            placeholder="Your Question"
            multiline
          />
          <Pressable
            style={[styles.postButton, (!questionTitle.trim() || !questionContent.trim()) && styles.postButtonDisabled]}
            onPress={handlePostQuestion}
            disabled={posting || !questionTitle.trim() || !questionContent.trim()}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.postButtonText}>Post Question</ThemedText>
            )}
          </Pressable>
        </ThemedView>
      )}

      <ThemedView style={styles.questionsContainer}>
        {loading && !questions.length ? (
          <ActivityIndicator size="large" color="#6B4EFF" />
        ) : questions.length > 0 ? (
          questions.map(renderQuestion)
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              {showMyQuestions 
                ? "You haven't asked any questions yet." 
                : "No questions have been asked yet. Be the first!"}
            </ThemedText>
            
            {!showMyQuestions && (
              <TouchableOpacity 
                style={styles.sampleButton}
                onPress={createSampleQuestion}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.sampleButtonText}>Create Sample Question</ThemedText>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 0,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  header: {
    marginTop: 0,
    marginBottom: 15,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#007AFF',
    width: '100%',
    alignSelf: 'center',
    minHeight: 180,
  },
  headerContent: {
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
    alignSelf: 'flex-start',
    color: '#FFFFFF',
    paddingLeft: 10,
    paddingTop: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 24,
    alignSelf: 'flex-start',
    paddingLeft: 10,
    paddingRight: 20,
    opacity: 0.9,
    flexWrap: 'wrap',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  createQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    width: width * 0.43,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 5,
  },
  createQuestionText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    width: width * 0.47,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 5,
  },
  historyText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  errorText: {
    color: '#d32f2f',
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  questionsContainer: {
    gap: 15,
    paddingHorizontal: 16,
  },
  questionItem: {
    flexDirection: 'row',
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  questionContent: {
    flex: 1,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  questionMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 12,
    color: '#808080',
  },
  timestampText: {
    fontSize: 12,
    color: '#808080',
  },
  replyItem: {
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f0f6ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  replyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  replyInputContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  replyButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  replyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  questionForm: {
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  postButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#808080',
    textAlign: 'center',
    marginBottom: 20,
  },
  sampleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  sampleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  debugButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugContainer: {
    backgroundColor: '#f0f6ff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugScroll: {
    maxHeight: 300,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  closeButton: {
    backgroundColor: '#607D8B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});