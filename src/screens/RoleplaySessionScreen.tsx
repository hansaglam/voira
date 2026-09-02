import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../components';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import type { RootScreenProps } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { usePremium } from '../context/PremiumContext';
import { transcribeAudio } from '../services/speechToText';
import {
  buildRoleplayPersonalizationContext,
  completeRoleplaySessionRequest,
  createRoleplayClientTurnId,
  shouldCompleteRoleplay,
  getRoleplayScenarioById,
  initialRoleplaySessionState,
  respondRoleplayTurnRequest,
  roleplaySessionReducer,
  speakRoleplayReply,
  startRoleplaySessionRequest,
  stopRoleplaySpeech,
} from '../services/roleplay';
import { trackRoleplayEvent } from '../services/analytics/roleplayAnalytics';
import type { RoleplayErrorCode, RoleplayTurn } from '../types/roleplay';
import { borderRadius, colors, layout, spacing } from '../theme';

type Props = RootScreenProps<'RoleplaySession'>;

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RoleplaySessionScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const scenario = getRoleplayScenarioById(route.params.scenarioId);
  const { learningProfile } = useLearning();
  const { user, anonymousUserId } = useAuth();
  const { isPremium } = usePremium();
  const [state, dispatch] = useReducer(roleplaySessionReducer, initialRoleplaySessionState);
  const [safeMessage, setSafeMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const processingUriRef = useRef<string | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const finalizedRef = useRef(false);
  const completionRetryRef = useRef(false);
  const completionAbandonedRef = useRef(false);
  const mountedRef = useRef(true);
  const uiStateRef = useRef(state.uiState);
  const userId = user?.id ?? anonymousUserId ?? learningProfile.userId;
  const recorder = useAudioRecorder();

  useEffect(() => {
    uiStateRef.current = state.uiState;
  }, [state.uiState]);

  const errorMessage = useCallback((code?: string) => {
    if (code === 'ROLEPLAY_RATE_LIMITED') return t('roleplay.movingQuickly');
    if (code === 'ROLEPLAY_SESSION_EXPIRED' || code === 'ROLEPLAY_SESSION_NOT_FOUND') return t('roleplay.expired');
    if (code === 'ROLEPLAY_AI_UNAVAILABLE') return t('roleplay.connectionIssue');
    return t('roleplay.unavailable');
  }, [t]);

  const playReply = useCallback(async (text: string) => {
    try {
      await speakRoleplayReply(text, {
        onStart: () => {
          dispatch({ type: 'playback_started' });
          trackRoleplayEvent('roleplay_ai_playback_started', { scenarioId: route.params.scenarioId });
        },
        onDone: () => dispatch({ type: 'playback_finished' }),
        onStopped: () => dispatch({ type: 'playback_finished' }),
        onError: () => {
          dispatch({ type: 'playback_finished' });
          trackRoleplayEvent('roleplay_ai_playback_failed', { scenarioId: route.params.scenarioId });
        },
      });
    } catch {
      trackRoleplayEvent('roleplay_ai_playback_failed', { scenarioId: route.params.scenarioId });
    }
  }, [route.params.scenarioId]);

  const startSession = useCallback(async () => {
    if (!scenario) return;
    finalizedRef.current = false;
    dispatch({ type: 'start_requested' });
    setSafeMessage(null);
    const result = await startRoleplaySessionRequest({
      scenarioId: scenario.id,
      personalization: buildRoleplayPersonalizationContext({
        level: learningProfile.level,
        goal: learningProfile.goals?.[0],
        detectedFocusAreas: learningProfile.weakAreas as never,
      }),
      isPremium,
      userId,
    }).catch(() => null);
    if (!mountedRef.current) {
      if (result?.ok) {
        void completeRoleplaySessionRequest({ sessionId: result.sessionId, abandoned: true, userId });
      }
      return;
    }
    if (!result || !result.ok) {
      setSafeMessage(errorMessage(result?.errorCode));
      dispatch({ type: 'error', errorCode: (result?.errorCode as RoleplayErrorCode) ?? 'ROLEPLAY_AI_UNAVAILABLE' });
      return;
    }
    activeSessionRef.current = result.sessionId;
    dispatch({
      type: 'session_started',
      sessionId: result.sessionId,
      scenarioId: result.scenarioId,
      openingTurn: result.openingTurn,
      maxTurns: result.maxTurns,
    });
    trackRoleplayEvent('roleplay_session_started', {
      scenarioId: scenario.id,
      level: scenario.difficulty,
      accessTier: isPremium ? 'premium' : 'free',
    });
    void playReply(result.openingTurn.text);
  }, [errorMessage, isPremium, learningProfile.goals, learningProfile.level, learningProfile.weakAreas, playReply, scenario, userId]);

  useEffect(() => { void startSession(); }, [startSession]);

  const finalize = useCallback(async (abandoned: boolean, finalTurnCount = state.turnCount) => {
    const sessionId = activeSessionRef.current;
    if (!sessionId || finalizedRef.current) return;
    finalizedRef.current = true;
    completionRetryRef.current = true;
    completionAbandonedRef.current = abandoned;
    dispatch({ type: 'ending_started' });
    await Promise.allSettled([recorder.cleanupAudio(), stopRoleplaySpeech()]);
    const result = await completeRoleplaySessionRequest({ sessionId, abandoned, userId }).catch(() => null);
    if (result?.ok) {
      completionRetryRef.current = false;
      dispatch({ type: 'session_completed', status: result.status });
      navigation.replace('RoleplayResult', { result });
    } else {
      finalizedRef.current = false;
      setSafeMessage(t('roleplay.connectionIssue'));
      dispatch({ type: 'error', errorCode: 'ROLEPLAY_AI_UNAVAILABLE' });
    }
    trackRoleplayEvent(abandoned ? 'roleplay_session_abandoned' : 'roleplay_session_completed', {
      scenarioId: route.params.scenarioId,
      turnNumber: finalTurnCount,
    });
  }, [navigation, recorder.cleanupAudio, route.params.scenarioId, state.turnCount, t, userId]);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'inactive' || next === 'background') {
        void recorder.cleanupAudio();
        void stopRoleplaySpeech();
        if (uiStateRef.current === 'recording') {
          setSafeMessage(t('roleplay.couldNotHear'));
          dispatch({ type: 'error', errorCode: 'ROLEPLAY_INVALID_TURN' });
        }
      }
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      void recorder.cleanupAudio();
      void stopRoleplaySpeech();
      if (activeSessionRef.current && !finalizedRef.current) {
        finalizedRef.current = true;
        void completeRoleplaySessionRequest({ sessionId: activeSessionRef.current, abandoned: true, userId });
      }
    };
  }, [recorder.cleanupAudio, t, userId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [state.turns.length, state.uiState]);

  const sendPendingTurn = useCallback(async (turn: RoleplayTurn) => {
    if (!state.sessionId || !turn.clientTurnId) return;
    dispatch({ type: 'send_started' });
    trackRoleplayEvent('roleplay_turn_sent', { scenarioId: route.params.scenarioId, turnNumber: state.turnCount + 1 });
    dispatch({ type: 'ai_thinking' });
    const response = await respondRoleplayTurnRequest({
      sessionId: state.sessionId,
      userText: turn.text,
      clientTurnId: turn.clientTurnId,
      userId,
    }).catch(() => null);
    if (!mountedRef.current) return;
    if (!response || !response.ok) {
      setSafeMessage(errorMessage(response?.errorCode));
      dispatch({ type: 'error', errorCode: (response?.errorCode as RoleplayErrorCode) ?? 'ROLEPLAY_AI_UNAVAILABLE' });
      return;
    }
    dispatch({
      type: 'turn_completed',
      userTurn: response.userTurn,
      assistantTurn: response.assistantTurn,
      turnCount: response.turnCount,
      status: response.status,
    });
    trackRoleplayEvent('roleplay_ai_reply_received', { scenarioId: route.params.scenarioId, turnNumber: response.turnCount });
    if (shouldCompleteRoleplay(response)) {
      await finalize(false, response.turnCount);
      return;
    }
    void playReply(response.assistantTurn.text);
  }, [errorMessage, finalize, playReply, route.params.scenarioId, state.sessionId, state.turnCount, userId]);

  useEffect(() => {
    if (state.uiState !== 'transcribing' || !recorder.audioUri || processingUriRef.current === recorder.audioUri) return;
    processingUriRef.current = recorder.audioUri;
    const uri = recorder.audioUri;
    const durationMillis = recorder.durationMillis ?? 0;
    void (async () => {
      const result = await transcribeAudio({ audioUri: uri, durationMillis, language: 'en', userId });
      await recorder.resetRecording();
      if (!mountedRef.current) return;
      if (!result.ok || !result.transcript.trim()) {
        setSafeMessage(t('roleplay.couldNotHear'));
        dispatch({ type: 'error', errorCode: 'ROLEPLAY_INVALID_TURN' });
        trackRoleplayEvent('roleplay_transcription_failed', { scenarioId: route.params.scenarioId, durationBucket: durationMillis < 5000 ? 'short' : 'long' });
        return;
      }
      const clientTurnId = createRoleplayClientTurnId();
      const turn: RoleplayTurn = {
        id: clientTurnId,
        clientTurnId,
        role: 'user',
        text: result.transcript,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'transcription_succeeded', userTurn: turn });
      trackRoleplayEvent('roleplay_transcription_succeeded', { scenarioId: route.params.scenarioId, turnNumber: state.turnCount + 1 });
      await sendPendingTurn(turn);
    })();
  }, [recorder, route.params.scenarioId, sendPendingTurn, state.turnCount, state.uiState, t, userId]);

  const toggleRecording = async () => {
    if (state.uiState === 'playing_ai') {
      await stopRoleplaySpeech();
      dispatch({ type: 'playback_finished' });
    }
    if (state.uiState === 'recording') {
      await recorder.stopRecording();
      dispatch({ type: 'recording_stopped' });
      trackRoleplayEvent('roleplay_recording_completed', { scenarioId: route.params.scenarioId, durationBucket: (recorder.recordingDurationMs ?? 0) < 5000 ? 'short' : 'long' });
      return;
    }
    if (state.uiState !== 'ready' && state.uiState !== 'playing_ai') return;
    setSafeMessage(null);
    dispatch({ type: 'recording_started' });
    trackRoleplayEvent('roleplay_recording_started', { scenarioId: route.params.scenarioId, turnNumber: state.turnCount + 1 });
    await recorder.startRecording();
  };

  const retry = async () => {
    trackRoleplayEvent('roleplay_session_retry', { scenarioId: route.params.scenarioId, turnNumber: state.turnCount + 1 });
    setSafeMessage(null);
    if (state.status === 'completed') {
      await finalize(false, state.turnCount);
      return;
    }
    if (completionRetryRef.current) {
      await finalize(completionAbandonedRef.current, state.turnCount);
      return;
    }
    if (
      !state.sessionId ||
      state.lastErrorCode === 'ROLEPLAY_SESSION_EXPIRED' ||
      state.lastErrorCode === 'ROLEPLAY_SESSION_NOT_FOUND'
    ) {
      finalizedRef.current = true;
      activeSessionRef.current = null;
      await startSession();
      return;
    }
    if (state.pendingUserTurn) {
      dispatch({ type: 'retry_send' });
      await sendPendingTurn(state.pendingUserTurn);
      return;
    }
    processingUriRef.current = null;
    dispatch({ type: 'retry_ready' });
  };

  const askToEnd = () => Alert.alert(t('roleplay.endConfirmTitle'), t('roleplay.endConfirmBody'), [
    { text: t('roleplay.continuePractice'), style: 'cancel' },
    { text: t('roleplay.endPractice'), style: 'destructive', onPress: () => void finalize(true) },
  ]);

  const statusLabel = useMemo(() => {
    if (state.uiState === 'recording') return `${t('roleplay.recording')} · ${formatDuration(recorder.recordingDurationMs ?? 0)}`;
    if (state.uiState === 'transcribing') return t('roleplay.transcribing');
    if (state.uiState === 'sending') return t('roleplay.sending');
    if (state.uiState === 'ai_thinking') return t('roleplay.thinking');
    if (state.uiState === 'playing_ai') return t('roleplay.listening');
    if (state.uiState === 'starting') return t('roleplay.starting');
    if (state.uiState === 'completed' || state.uiState === 'ending') return t('roleplay.sessionEndedLabel');
    return t('roleplay.ready');
  }, [recorder.recordingDurationMs, state.uiState, t]);

  if (!scenario) return null;
  const latestAssistant = [...state.turns].reverse().find((turn) => turn.role === 'assistant');
  const micEnabled = state.uiState === 'ready' || state.uiState === 'recording' || state.uiState === 'playing_ai';

  return (
    <ScreenContainer scrollRef={scrollRef} contentStyle={styles.content} footer={
      <View style={styles.controls}>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{statusLabel}</Text>
        {safeMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{safeMessage}</Text>
            <Pressable accessibilityRole="button" onPress={() => void retry()}><Text style={styles.retry}>{t(state.lastErrorCode === 'ROLEPLAY_SESSION_EXPIRED' || state.lastErrorCode === 'ROLEPLAY_SESSION_NOT_FOUND' ? 'roleplay.restart' : 'roleplay.retry')}</Text></Pressable>
          </View>
        ) : null}
        <View style={styles.controlRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('roleplay.replay')} disabled={!latestAssistant} onPress={() => latestAssistant && void playReply(latestAssistant.text)} style={styles.smallControl}>
            <Ionicons name="volume-high-outline" size={22} color={latestAssistant ? colors.textPrimary : colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.uiState === 'recording' ? t('roleplay.stopRecording') : t('roleplay.startRecording')}
            accessibilityState={{ disabled: !micEnabled }}
            disabled={!micEnabled}
            onPress={() => void toggleRecording()}
            style={[styles.mic, state.uiState === 'recording' && styles.micRecording, !micEnabled && styles.disabled]}
          >
            <Ionicons name={state.uiState === 'recording' ? 'stop' : 'mic'} size={30} color="#fff" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('roleplay.endPractice')} onPress={askToEnd} style={styles.smallControl}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    }>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t(scenario.titleKey)}</Text>
          <Text style={styles.role}>{t(scenario.aiRoleKey)} · {t('roleplay.turnProgress', { turn: Math.min(state.turnCount + 1, state.maxTurns), max: state.maxTurns })}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('roleplay.endPractice')} onPress={askToEnd}><Text style={styles.end}>{t('roleplay.end')}</Text></Pressable>
      </View>
      <View style={styles.conversation}>
        {state.turns.map((turn) => (
          <View key={turn.id} accessibilityLabel={`${turn.role === 'assistant' ? t(scenario.aiRoleKey) : t('roleplay.you')}: ${turn.text}`} style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleRole}>{turn.role === 'assistant' ? t(scenario.aiRoleKey) : t('roleplay.you')}</Text>
            <Text style={styles.bubbleText}>{turn.text}</Text>
          </View>
        ))}
        {state.uiState === 'ai_thinking' ? <View style={[styles.bubble, styles.aiBubble]}><Text style={styles.thinking}>{t('roleplay.thinking')} ···</Text></View> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPadding },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerText: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  role: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  end: { color: colors.textSecondary, fontWeight: '600', padding: spacing.sm },
  conversation: { paddingVertical: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '86%', padding: spacing.md, borderRadius: borderRadius.lg },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.cardElevated, borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 },
  bubbleRole: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: spacing.xs },
  bubbleText: { color: colors.textPrimary, fontSize: 16, lineHeight: 23 },
  thinking: { color: colors.textSecondary, fontSize: 14 },
  controls: { alignItems: 'center', gap: spacing.sm },
  status: { color: colors.textSecondary, fontSize: 14, minHeight: 20 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  mic: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  micRecording: { backgroundColor: colors.error },
  disabled: { opacity: 0.42 },
  smallControl: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  errorBox: { width: '100%', backgroundColor: 'rgba(248,113,113,0.10)', borderRadius: borderRadius.md, padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  errorText: { color: colors.textSecondary, flex: 1, fontSize: 13 },
  retry: { color: colors.secondary, fontWeight: '700' },
});
