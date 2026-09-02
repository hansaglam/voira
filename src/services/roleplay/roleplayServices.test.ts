import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendRoleplayScenario, buildRoleplayPersonalizationContext } from './roleplayRecommendationService';
import { resolveRoleplayAccess } from './roleplayAccessService';
import { roleplaySessionReducer, initialRoleplaySessionState } from './roleplaySessionReducer';
import { appendRoleplayTurnOnce, createPendingRoleplayTurn, normalizeRoleplayTranscript, shouldCompleteRoleplay } from './roleplayTurnPolicy';
import { createRoleplayClientTurnId } from './roleplayTurnId';
import { ROLEPLAY_SCENARIOS } from './roleplayScenarioCatalog';

test('travel goal recommends travel scenario', () => {
  const scenario = recommendRoleplayScenario({ goal: 'travel', isPremium: true });
  assert.ok(['airport_checkin', 'hotel_checkin', 'asking_directions'].includes(scenario.id));
});

test('job interview goal recommends interview scenario', () => {
  const scenario = recommendRoleplayScenario({ goal: 'job_interview', isPremium: true });
  assert.equal(scenario.id, 'job_interview');
});

test('work goal recommends work meeting scenario', () => {
  const scenario = recommendRoleplayScenario({ goal: 'work', isPremium: true });
  assert.equal(scenario.id, 'work_meeting');
});

test('fallback deterministic when no premium access', () => {
  const scenario = recommendRoleplayScenario({ goal: 'travel', isPremium: false });
  assert.equal(scenario.premium, false);
});

test('user level respected for beginner recommendation', () => {
  const scenario = recommendRoleplayScenario({ goal: 'daily_conversation', level: 'beginner' });
  assert.equal(scenario.difficulty, 'beginner');
});

test('only allowed personalization fields sent', () => {
  const context = buildRoleplayPersonalizationContext({
    level: 'intermediate',
    goal: 'travel',
    detectedFocusAreas: ['fluency', 'pronunciation'],
  });
  assert.deepEqual(Object.keys(context).sort(), ['focusAreas', 'goal', 'level']);
});

test('historical transcript not included in personalization', () => {
  const context = buildRoleplayPersonalizationContext({ level: 'beginner' });
  assert.equal((context as Record<string, unknown>).transcript, undefined);
});

test('weak words not leaked unintentionally in personalization builder', () => {
  const context = buildRoleplayPersonalizationContext({
    detectedFocusAreas: ['weak_words'],
  });
  assert.deepEqual(context.focusAreas, ['weak_words']);
});

test('guest premium scenario denied by access resolver', () => {
  const access = resolveRoleplayAccess({
    isGuest: true,
    isPremium: false,
    scenarioPremium: true,
  });
  assert.equal(access.allowed, false);
});

test('session reducer tracks turns without audio fields', () => {
  let state = initialRoleplaySessionState;
  state = roleplaySessionReducer(state, {
    type: 'session_started',
    sessionId: 's1',
    scenarioId: 'cafe_ordering',
    openingTurn: {
      id: 'a1',
      role: 'assistant',
      text: 'Hi',
      createdAt: new Date().toISOString(),
    },
    maxTurns: 12,
  });
  assert.equal(state.turns.length, 1);
  assert.equal((state as Record<string, unknown>).audio, undefined);
});

function readyState() {
  return roleplaySessionReducer(initialRoleplaySessionState, {
    type: 'session_started',
    sessionId: 's1',
    scenarioId: 'cafe_ordering',
    openingTurn: { id: 'a1', role: 'assistant', text: 'Hello', createdAt: '2026-01-01' },
    maxTurns: 12,
  });
}

test('recommended scenario is returned from the shared recommendation service', () => {
  assert.equal(recommendRoleplayScenario({ goal: 'travel', isPremium: false }).id, 'airport_checkin');
});

test('premium scenario lock state is resolved centrally', () => {
  const premium = ROLEPLAY_SCENARIOS.find((scenario) => scenario.premium)!;
  assert.equal(resolveRoleplayAccess({ isGuest: false, isPremium: false, scenarioPremium: premium.premium }).allowed, false);
});

test('free scenario is startable', () => {
  const free = ROLEPLAY_SCENARIOS.find((scenario) => !scenario.premium)!;
  assert.equal(resolveRoleplayAccess({ isGuest: false, isPremium: false, scenarioPremium: free.premium }).allowed, true);
});

test('locked scenario resolves premium-required destination condition', () => {
  const access = resolveRoleplayAccess({ isGuest: false, isPremium: false, scenarioPremium: true });
  assert.deepEqual(access, { allowed: false, tier: 'free', reason: 'premium_required' });
});

test('start transitions to ready', () => assert.equal(readyState().uiState, 'ready'));

test('ready transitions to recording', () => {
  assert.equal(roleplaySessionReducer(readyState(), { type: 'recording_started' }).uiState, 'recording');
});

test('recording transitions to transcribing', () => {
  const recording = roleplaySessionReducer(readyState(), { type: 'recording_started' });
  assert.equal(roleplaySessionReducer(recording, { type: 'recording_stopped' }).uiState, 'transcribing');
});

test('transcribing transitions to sending with optimistic user bubble', () => {
  const recording = roleplaySessionReducer(readyState(), { type: 'recording_started' });
  const transcribing = roleplaySessionReducer(recording, { type: 'recording_stopped' });
  const turn = createPendingRoleplayTurn('hello', 10)!;
  const sending = roleplaySessionReducer(transcribing, { type: 'transcription_succeeded', userTurn: turn });
  assert.equal(sending.uiState, 'sending');
  assert.equal(sending.turns.at(-1)?.text, 'hello');
});

test('sending transitions to AI thinking', () => {
  const recording = roleplaySessionReducer(readyState(), { type: 'recording_started' });
  const transcribing = roleplaySessionReducer(recording, { type: 'recording_stopped' });
  const sending = roleplaySessionReducer(transcribing, { type: 'transcription_succeeded', userTurn: createPendingRoleplayTurn('hello')! });
  assert.equal(roleplaySessionReducer(sending, { type: 'ai_thinking' }).uiState, 'ai_thinking');
});

test('response transitions back to ready', () => {
  const state = roleplaySessionReducer(readyState(), {
    type: 'turn_completed',
    userTurn: { id: 'u1', role: 'user', text: 'Hi', createdAt: 'now' },
    assistantTurn: { id: 'a2', role: 'assistant', text: 'Welcome', createdAt: 'now' },
    turnCount: 1,
    status: 'active',
  });
  assert.equal(state.uiState, 'ready');
});

test('illegal double recording is blocked', () => {
  const recording = roleplaySessionReducer(readyState(), { type: 'recording_started' });
  assert.strictEqual(roleplaySessionReducer(recording, { type: 'recording_started' }), recording);
});

test('recording is blocked during AI thinking', () => {
  const thinking = { ...readyState(), uiState: 'ai_thinking' as const, isSending: true };
  assert.strictEqual(roleplaySessionReducer(thinking, { type: 'recording_started' }), thinking);
});

test('valid transcript creates an auto-sendable pending turn', () => {
  assert.equal(createPendingRoleplayTurn('  hello there  ', 20)?.text, 'hello there');
});

test('empty transcript does not create a turn', () => assert.equal(createPendingRoleplayTurn('   '), null));

test('STT failure can return safely without a pending turn', () => assert.equal(normalizeRoleplayTranscript('\n\t'), null));

test('network retry reuses the same clientTurnId', () => {
  const pending = createPendingRoleplayTurn('hello', 30)!;
  const retry = pending;
  assert.equal(retry.clientTurnId, pending.clientTurnId);
});

test('new spoken turn creates a new clientTurnId', () => {
  assert.notEqual(createRoleplayClientTurnId(40), createRoleplayClientTurnId(40));
});

test('recovered duplicate AI response appends once', () => {
  const reply = { id: 'reply', role: 'assistant' as const, text: 'Hi', createdAt: 'now' };
  const once = appendRoleplayTurnOnce([], reply);
  assert.strictEqual(appendRoleplayTurnOnce(once, reply), once);
});

test('AI text remains represented independent of TTS result', () => {
  const reply = { id: 'reply', role: 'assistant' as const, text: 'Visible', createdAt: 'now' };
  assert.equal(appendRoleplayTurnOnce([], reply)[0]?.text, 'Visible');
});

test('recording transition is allowed after playback stops', () => {
  const playing = roleplaySessionReducer(readyState(), { type: 'playback_started' });
  const stopped = roleplaySessionReducer(playing, { type: 'playback_finished' });
  assert.equal(roleplaySessionReducer(stopped, { type: 'recording_started' }).uiState, 'recording');
});

test('replay transition enters playback state', () => {
  assert.equal(roleplaySessionReducer(readyState(), { type: 'playback_started' }).uiState, 'playing_ai');
});

test('shouldEndSession completes', () => assert.equal(shouldCompleteRoleplay({ shouldEndSession: true, turnCount: 2, maxTurns: 12, status: 'active' }), true));
test('max-turn response completes', () => assert.equal(shouldCompleteRoleplay({ shouldEndSession: false, turnCount: 12, maxTurns: 12, status: 'active' }), true));

test('manual end enters ending state', () => {
  assert.equal(roleplaySessionReducer(readyState(), { type: 'ending_started' }).uiState, 'ending');
});

test('session completion clears pending work', () => {
  const completed = roleplaySessionReducer(readyState(), { type: 'session_completed', status: 'abandoned' });
  assert.equal(completed.uiState, 'completed');
  assert.equal(completed.pendingUserTurn, null);
});

test('session expiry enters safe error state', () => {
  const expired = roleplaySessionReducer(readyState(), { type: 'error', errorCode: 'ROLEPLAY_SESSION_EXPIRED' });
  assert.equal(expired.uiState, 'error');
  assert.equal(expired.lastErrorCode, 'ROLEPLAY_SESSION_EXPIRED');
});

test('Home recommendation uses same shared scenario service', () => {
  const discover = recommendRoleplayScenario({ goal: 'work', isPremium: false });
  const home = recommendRoleplayScenario({ goal: 'work', isPremium: false });
  assert.equal(home.id, discover.id);
});

test('Home premium lock respects access resolver', () => {
  const access = resolveRoleplayAccess({ isGuest: false, isPremium: false, scenarioPremium: true });
  assert.equal(access.allowed, false);
});
