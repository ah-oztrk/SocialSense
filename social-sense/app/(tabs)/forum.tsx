import { StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, View, Dimensions, RefreshControl, TouchableOpacity, Text, Modal } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Collapsible } from '@/components/Collapsible';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { forumService, Question, Answer } from '@/services/forumService';
import { authService } from '@/services/authService';
import { API_BASE_URL } from '@/constants/Config';

const { width } = Dimensions.get('window');

// Format date function to keep it consistent
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Define sort options
type SortOption = {
  id: string;
  label: string;
  description?: string;
};

const sortOptions: SortOption[] = [
  { id: 'default', label: 'Default', description: 'Default forum view' },
  { id: 'newest', label: 'Newest First', description: 'Show newest questions at the top' },
  { id: 'oldest', label: 'Oldest First', description: 'Show oldest questions at the top' },
  { id: 'most_replies', label: 'Most Replies', description: 'Questions with most answers first' },
  { id: 'recent_activity', label: 'Recent Activity', description: 'Recently answered questions first' },
  { id: 'alphabetical', label: 'A to Z', description: 'Sort questions alphabetically' },
  { id: 'your_questions', label: 'Your Questions', description: 'Show only questions you posted' },
];

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
  const [sortBy, setSortBy] = useState<string>('default');
  const [showSortModal, setShowSortModal] = useState(false);
  const [currentUserID, setCurrentUserID] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<{ [key: string]: boolean }>({});
  const [deleteAnswerLoading, setDeleteAnswerLoading] = useState<{ [key: string]: boolean }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAnswerConfirm, setShowDeleteAnswerConfirm] = useState<string | null>(null);

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
          console.log("Loading user's questions");
          fetchedQuestions = await forumService.getUserQuestions();
        } else {
          console.log("Loading all questions");
          fetchedQuestions = await forumService.getQuestions();
        }
        
        // Successfully fetched questions (even if empty array)
        setQuestions(fetchedQuestions);
        setError(null);
        
        // Only try to fetch answers if we have questions
        if (fetchedQuestions.length > 0) {
          console.log(`Loading answers for ${fetchedQuestions.length} questions`);
          
          // Create an array of promises for fetching answers
          const answerPromises = fetchedQuestions.map(async (question) => {
            try {
              const questionAnswers = await forumService.getQuestionAnswers(question.question_id);
              return { questionId: question.question_id, answers: questionAnswers };
            } catch (err) {
              console.error(`Error loading answers for question ${question.question_id}:`, err);
              return { questionId: question.question_id, answers: [] };
            }
          });
          
          // Wait for all answer requests to complete
          const answersResults = await Promise.all(answerPromises);
          
          // Build the answers map
          const answersMap: { [key: string]: Answer[] } = {};
          answersResults.forEach(result => {
            answersMap[result.questionId] = sortAnswersByPreference(result.answers);
          });
          
          setAnswers(answersMap);
        }
        
        // Sort questions after answers are loaded (for proper sorting by reply count)
        setQuestions(sortQuestionsByPreference([...fetchedQuestions]));
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
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load questions. Please try again later.';
      setError(errMsg);
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to sort questions based on user preference
  const sortQuestionsByPreference = (questionsArray: Question[]) => {
    // Filter questions first if using your_questions filter
    let filteredQuestions = [...questionsArray];
    if (sortBy === 'your_questions' && currentUserID) {
      filteredQuestions = filteredQuestions.filter(q => q.user_id === currentUserID);
    }
    
    // Then apply sorting
    if (sortBy === 'default' || sortBy === 'newest') {
      filteredQuestions.sort((a, b) => {
        return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
      });
    } else if (sortBy === 'oldest') {
      filteredQuestions.sort((a, b) => {
        return new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
      });
    } else if (sortBy === 'most_replies') {
      // Sort by number of replies
      filteredQuestions.sort((a, b) => {
        const repliesA = answers[a.question_id]?.length || 0;
        const repliesB = answers[b.question_id]?.length || 0;
        return repliesB - repliesA; // Most replies first
      });
    } else if (sortBy === 'recent_activity') {
      // Sort by the most recent reply or post date
      filteredQuestions.sort((a, b) => {
        // Find most recent reply for question A
        const latestReplyA = answers[a.question_id]?.length ? 
          Math.max(...answers[a.question_id].map(ans => new Date(ans.creation_date).getTime())) : 
          0;
        
        // Find most recent reply for question B
        const latestReplyB = answers[b.question_id]?.length ? 
          Math.max(...answers[b.question_id].map(ans => new Date(ans.creation_date).getTime())) : 
          0;
        
        // Get creation dates as timestamps
        const creationDateA = new Date(a.creation_date).getTime();
        const creationDateB = new Date(b.creation_date).getTime();
        
        // Use the most recent activity (either post or reply)
        const mostRecentA = Math.max(latestReplyA, creationDateA);
        const mostRecentB = Math.max(latestReplyB, creationDateB);
        
        return mostRecentB - mostRecentA; // Most recent activity first
      });
    } else if (sortBy === 'alphabetical') {
      // Sort alphabetically by title
      filteredQuestions.sort((a, b) => {
        return (a.question_header || '').localeCompare(b.question_header || '');
      });
    }
    
    return filteredQuestions;
  };

  // Function to sort answers based on user preference
  const sortAnswersByPreference = (answersArray: Answer[]) => {
    if (sortBy === 'default' || sortBy === 'newest') {
      answersArray.sort((a, b) => {
        return new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime();
      });
    } else if (sortBy === 'oldest') {
      answersArray.sort((a, b) => {
        return new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
      });
    }
    return answersArray;
  };

  // Get current user ID and username on load
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const userData = await authService.getUser();
        if (userData) {
          setCurrentUserID(userData.id);
          setCurrentUsername(userData.username);
        }
      } catch (err) {
        console.error('Error getting user info:', err);
      }
    };
    
    const loadPersistedState = async () => {
      try {
        const persistedShowMyQuestions = await AsyncStorage.getItem('showMyQuestions');
        if (persistedShowMyQuestions !== null) {
          setShowMyQuestions(JSON.parse(persistedShowMyQuestions));
        }
      } catch (err) {
        console.error('Error loading persisted state:', err);
      }
    };
    
    // Load user info and persisted state first, then load questions
    const initializeData = async () => {
      await getUserInfo();
      await loadPersistedState();
      // Initial load of questions and answers
      loadQuestions();
    };
    
    initializeData();
  }, []);

  // Apply sorting when sort preference changes
  useEffect(() => {
    if (questions.length > 0) {
      const sorted = sortQuestionsByPreference([...questions]);
      setQuestions(sorted);

      // Also re-sort answers
      const newAnswersMap = { ...answers };
      Object.keys(newAnswersMap).forEach(questionId => {
        newAnswersMap[questionId] = sortAnswersByPreference([...newAnswersMap[questionId]]);
      });
      setAnswers(newAnswersMap);
      
      // Reset expanded replies state when sort option changes
      setExpandedReplies({});
    }
  }, [sortBy]);

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

  // Update this useEffect to load questions when showMyQuestions changes
  useEffect(() => {
    // Skip the initial render
    if (questions.length > 0) {
      // Reset expanded replies state when toggling between all/my questions
      setExpandedReplies({});
      loadQuestions();
    }
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
      
      // Add the new question at the beginning of the array (top of the list)
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
    // Get a clean username for display
    let displayUsername = question.username;
    
    // If no username in the question data but it's the current user's question, use current username
    if (!displayUsername && question.user_id === currentUserID && currentUsername) {
      displayUsername = currentUsername;
    } 
    // Fallback to a clean user ID if no username is available
    else if (!displayUsername) {
      displayUsername = question.user_id ? `User ${question.user_id.substring(0, 6)}...` : 'Unknown';
    }
    
    const isExpanded = expandedReplies[question.question_id] || false;
    const isOwnQuestion = question.user_id === currentUserID;
    
    return (
      <Pressable
        key={question.question_id}
        style={styles.questionItem}
        onPress={() => toggleReplies(question.question_id)}
      >
        <View style={styles.questionContent}>
          <View>
            <Text style={styles.questionTitle}>{question.question_header}</Text>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          <View style={styles.questionMetaContainer}>
            <Text style={styles.authorText}>
              Posted by {displayUsername}
            </Text>
            <Text style={styles.timestampText}>
              {formatDate(question.creation_date)}
            </Text>
          </View>
          
          {isOwnQuestion && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => setShowDeleteConfirm(question.question_id)}
            >
              <IconSymbol name="trash" size={14} color="#d32f2f" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}

          <Collapsible
            title={isExpanded ? 'Hide replies...' : `See replies...(${answers[question.question_id]?.length || 0})`}
            onToggle={() => toggleReplies(question.question_id)}
            isOpen={isExpanded}
          >
            <View style={styles.repliesContainer}>
              {answers[question.question_id]?.length > 0 ? (
                answers[question.question_id].map((answer) => {
                  // Get a clean username for the reply
                  let replyUsername = answer.username;
                  
                  // If no username in the reply data but it's the current user's reply, use current username
                  if (!replyUsername && answer.user_id === currentUserID && currentUsername) {
                    replyUsername = currentUsername;
                  }
                  // Fallback to a clean user ID if no username is available
                  else if (!replyUsername) {
                    replyUsername = answer.user_id ? `User ${answer.user_id.substring(0, 6)}...` : 'Unknown';
                  }
                  
                  const isOwnReply = answer.user_id === currentUserID;
                    
                  return (
                    <View key={answer.answer_id} style={styles.replyItem}>
                      <Text style={styles.replyText}>{answer.answer}</Text>
                      <View style={styles.replyMetaContainer}>
                        <Text style={styles.authorText}>
                          Reply by {replyUsername}
                        </Text>
                        <Text style={styles.timestampText}>
                          {formatDate(answer.creation_date)}
                        </Text>
                      </View>
                      
                      {isOwnReply && (
                        <TouchableOpacity 
                          style={styles.deleteReplyButton}
                          onPress={() => setShowDeleteAnswerConfirm(answer.answer_id)}
                        >
                          <IconSymbol name="trash" size={14} color="#d32f2f" />
                          <Text style={styles.deleteReplyText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.authorText, {marginVertical: 10}]}>No replies yet. Be the first to respond!</Text>
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
                    <Text style={styles.replyButtonText}>Post Reply</Text>
                  )}
                </Pressable>
              </View>
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

  useEffect(() => {
    const persistShowMyQuestions = async () => {
      try {
        await AsyncStorage.setItem('showMyQuestions', JSON.stringify(showMyQuestions));
      } catch (err) {
        console.error('Error persisting showMyQuestions:', err);
      }
    };

    persistShowMyQuestions();
  }, [showMyQuestions]);

  const handleDeleteQuestion = async (questionId: string) => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    try {
      setDeleteLoading(prev => ({ ...prev, [questionId]: true }));
      setError(null);
      await forumService.deleteQuestion(questionId);
      
      // Remove the question from the state
      setQuestions(prev => prev.filter(q => q.question_id !== questionId));
      
      // Remove any answers associated with this question
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
      
      // Hide the confirmation modal
      setShowDeleteConfirm(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete question. Please try again.';
      setError(errMsg);
      console.error('Error deleting question:', err);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleDeleteAnswer = async (questionId: string, answerId: string) => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    try {
      setDeleteAnswerLoading(prev => ({ ...prev, [answerId]: true }));
      setError(null);
      await forumService.deleteAnswer(answerId);
      
      // Remove the answer from the state
      setAnswers(prev => ({
        ...prev,
        [questionId]: prev[questionId].filter(a => a.answer_id !== answerId)
      }));
      
      // Hide the confirmation modal
      setShowDeleteAnswerConfirm(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete reply. Please try again.';
      setError(errMsg);
      console.error('Error deleting reply:', err);
    } finally {
      setDeleteAnswerLoading(prev => ({ ...prev, [answerId]: false }));
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Forum</Text>
          <Text style={styles.subtitle}>
            Ask a question to the fellow Sensers or answer other asks!
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.retryButton} onPress={() => loadQuestions()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
            
            <Pressable style={styles.debugButton} onPress={checkDatabaseStatus}>
              <Text style={styles.debugButtonText}>Diagnose</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showDebug && debugInfo && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Backend Status</Text>
          <ScrollView style={styles.debugScroll}>
            <Text style={styles.debugText}>
              {JSON.stringify(debugInfo, null, 2)}
            </Text>
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={() => setShowDebug(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.createQuestionButton}
          onPress={() => setShowQuestionForm(!showQuestionForm)}
        >
          <IconSymbol size={20} name="plus.circle" color="#FFFFFF" />
          <Text style={styles.createQuestionText}>
            {showQuestionForm ? 'Cancel' : 'Create New Question'}
          </Text>
        </Pressable>

        <Pressable 
          style={styles.historyButton}
          onPress={() => {
            const newValue = !showMyQuestions;
            setShowMyQuestions(newValue);
            // Reset expanded replies state when toggling between all/my questions
            setExpandedReplies({});
            // Reset sort option to default when toggling between all/my questions
            if (sortBy === 'your_questions' && !newValue) {
              setSortBy('default');
            }
          }}
        >
          <IconSymbol size={20} name="clock.circle" color="#FFFFFF" />
          <Text style={styles.historyText}>
            {showMyQuestions ? 'All Questions' : 'Your Questions'}
          </Text>
        </Pressable>
      </View>

      {showQuestionForm && (
        <View style={styles.questionForm}>
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
              <Text style={styles.postButtonText}>Post Question</Text>
            )}
          </Pressable>
        </View>
      )}

      <View style={styles.questionsContainer}>
        {loading && !questions.length ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : questions.length > 0 ? (
          <>
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => setShowSortModal(true)}
            >
              <Text style={styles.sortButtonText}>
                Sort: {sortOptions.find(option => option.id === sortBy)?.label}
              </Text>
              <IconSymbol name="chevron.down" size={14} color="#007AFF" />
            </TouchableOpacity>
            {questions.map((question) => (
              <React.Fragment key={question.question_id}>
                {renderQuestion(question)}
              </React.Fragment>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {showMyQuestions 
                ? "You haven't asked any questions yet." 
                : "No questions have been asked yet. Be the first!"}
            </Text>
            
            {!showMyQuestions && (
              <TouchableOpacity 
                style={styles.sampleButton}
                onPress={createSampleQuestion}
                disabled={posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sampleButtonText}>Create Sample Question</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Sort Questions</Text>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  sortBy === option.id && styles.sortOptionSelected
                ]}
                onPress={() => {
                  setSortBy(option.id);
                  // If toggling your questions option and showMyQuestions is true, reset it
                  if (option.id === 'your_questions') {
                    setShowMyQuestions(false);
                  }
                  // Reset expanded replies when changing sort
                  setExpandedReplies({});
                  setShowSortModal(false);
                }}
              >
                <View>
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.id && styles.sortOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={[
                      styles.sortOptionDescription,
                      sortBy === option.id && styles.sortOptionDescriptionSelected
                    ]}>
                      {option.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Question Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(null)}
        >
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>Delete Question</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this question? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteConfirm(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => showDeleteConfirm && handleDeleteQuestion(showDeleteConfirm)}
                disabled={showDeleteConfirm ? deleteLoading[showDeleteConfirm] : false}
              >
                {showDeleteConfirm && deleteLoading[showDeleteConfirm] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Answer Confirmation Modal */}
      <Modal
        visible={showDeleteAnswerConfirm !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAnswerConfirm(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteAnswerConfirm(null)}
        >
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>Delete Reply</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this reply? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteAnswerConfirm(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  if (showDeleteAnswerConfirm) {
                    // Find the question ID for this answer
                    const questionId = Object.keys(answers).find(qId => 
                      answers[qId].some(a => a.answer_id === showDeleteAnswerConfirm)
                    );
                    
                    if (questionId) {
                      handleDeleteAnswer(questionId, showDeleteAnswerConfirm);
                    }
                  }
                }}
                disabled={showDeleteAnswerConfirm ? deleteAnswerLoading[showDeleteAnswerConfirm] : false}
              >
                {showDeleteAnswerConfirm && deleteAnswerLoading[showDeleteAnswerConfirm] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f6ff',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
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
    backgroundColor: '#f0f6ff',
  },
  authorText: {
    fontSize: 12,
    color: '#808080',
  },
  timestampText: {
    fontSize: 12,
    color: '#808080',
  },
  repliesContainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 8,
  },
  replyItem: {
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f0f6ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    color: '#333',
    marginBottom: 8,
  },
  replyMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f6ff',
    marginBottom: 4,
  },
  deleteReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    padding: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteReplyText: {
    fontSize: 11,
    color: '#d32f2f',
    marginLeft: 3,
    fontWeight: '500',
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  debugScroll: {
    maxHeight: 300,
    backgroundColor: '#fff',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f6ff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    backgroundColor: '#fff',
    width: width * 0.8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  sortOption: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: '#f0f6ff',
  },
  sortOptionSelected: {
    backgroundColor: '#007AFF',
  },
  sortOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'left',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  sortOptionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sortOptionDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
    padding: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteText: {
    fontSize: 11,
    color: '#d32f2f',
    marginLeft: 3,
    fontWeight: '500',
  },
  confirmModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: width * 0.8,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  confirmModalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#CCCCCC',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});