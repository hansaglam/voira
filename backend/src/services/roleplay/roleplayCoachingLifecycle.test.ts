import assert from 'node:assert/strict';
import test from 'node:test';
import type { AnalysisRequestIdentity } from '../../middleware/analysisRequestIdentity.js';
import { getRoleplaySessionRepository } from './roleplaySessionRepositoryFactory.js';
import {
  completeRoleplaySessionById,
  listCompletedRoleplayActivity,
  resetRoleplaySessionStoreForTests,
  startRoleplaySession,
} from './roleplaySessionService.js';
import { setRoleplayCoachingProviderForTests } from './roleplayCoachingService.js';
import { resolveRoleplayOwnerRef } from './roleplayOwnerKey.js';

const identity: AnalysisRequestIdentity = { type: 'authenticated', userId: 'coach-user' };

async function seededSession() {
  const started = await startRoleplaySession({
    identity,
    scenarioId: 'cafe_ordering',
    personalization: { level: 'intermediate', goal: 'daily_conversation', focusAreas: [] },
  });
  const repo = getRoleplaySessionRepository();
  const owner = resolveRoleplayOwnerRef(identity)!;
  const exchange = await repo.beginUserTurn({
    sessionId: started.sessionId,
    owner,
    clientTurnId: 'coach-turn-1',
    userText: 'I want one coffee please.',
  });
  await repo.completeExchange({
    sessionId: started.sessionId,
    exchangeId: exchange!.exchange.id,
    assistantText: 'Certainly. What size?',
  });
  await repo.incrementUserTurnCount(started.sessionId);
  return { started, repo, owner };
}

function generated() {
  return {
    outcome: 'completed_goal',
    primaryTakeaway: { type: 'communication', message: 'You completed the order.' },
    strengths: [{ type: 'communication', message: 'You placed the order clearly.' }],
    improvements: [{ type: 'naturalness', message: 'Use a request form.' }],
    phraseSuggestions: [{ original: 'I want one coffee please.', suggestion: 'Could I get a coffee, please?', reason: 'More natural for ordering.' }],
    nextFocus: 'naturalness',
  };
}

test.beforeEach(() => {
  resetRoleplaySessionStoreForTests();
  setRoleplayCoachingProviderForTests(null);
});

test.afterEach(() => setRoleplayCoachingProviderForTests(null));

test('weekly activity exposes only safe completed Roleplay metadata', async () => {
  const { started } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => generated());
  await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const sessions = await listCompletedRoleplayActivity({
    identity,
    completedFrom: new Date(Date.now() - 60_000).toISOString(),
    completedBefore: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.deepEqual(Object.keys(sessions[0]!).sort(), ['completedAt', 'scenarioId', 'sessionId']);
  assert.equal(JSON.stringify(sessions).includes('coffee'), false);
});

test('transcript exists during coaching and is purged after success', async () => {
  const { started, repo } = await seededSession();
  let sawTranscript = false;
  setRoleplayCoachingProviderForTests(async (input) => {
    sawTranscript = input.turns.some((turn) => turn.text.includes('one coffee'));
    return generated();
  });
  const result = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  assert.equal(sawTranscript, true);
  assert.equal(result.coaching.outcome, 'completed_goal');
  assert.equal((await repo.getBoundedContext(started.sessionId, 20)).length, 0);
});

test('transcript is purged after deterministic fallback', async () => {
  const { started, repo } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => { throw new Error('offline'); });
  const result = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  assert.equal(result.coaching.usedFallback, true);
  assert.equal((await repo.getBoundedContext(started.sessionId, 20)).length, 0);
});

test('completed semantic metadata survives purge without phrase original text', async () => {
  const { started, repo, owner } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => generated());
  await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const stored = await repo.getSessionForOwner(started.sessionId, owner);
  assert.equal(stored?.coachingStatus, 'completed');
  assert.equal(stored?.coachingOutcome, 'completed_goal');
  assert.equal(stored?.nextFocus, 'naturalness');
  assert.equal(JSON.stringify(stored).includes('I want one coffee'), false);
});

test('completion retry does not regenerate completed coaching', async () => {
  const { started } = await seededSession();
  let calls = 0;
  setRoleplayCoachingProviderForTests(async () => { calls += 1; return generated(); });
  await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const recovered = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  assert.equal(calls, 1);
  assert.equal(recovered.coaching.outcome, 'completed_goal');
});

test('failed coaching falls back safely and retry does not duplicate cost', async () => {
  const { started } = await seededSession();
  let calls = 0;
  setRoleplayCoachingProviderForTests(async () => { calls += 1; throw new Error('failed'); });
  const first = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const second = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  assert.equal(first.coaching.usedFallback, true);
  assert.equal(second.coaching.outcome, first.coaching.outcome);
  assert.equal(calls, 1);
});

test('concurrent completion shares one canonical coaching generation', async () => {
  const { started } = await seededSession();
  let calls = 0;
  setRoleplayCoachingProviderForTests(async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return generated();
  });
  const [first, second] = await Promise.all([
    completeRoleplaySessionById({ identity, sessionId: started.sessionId }),
    completeRoleplaySessionById({ identity, sessionId: started.sessionId }),
  ]);
  assert.equal(calls, 1);
  assert.equal(first.coaching.outcome, second.coaching.outcome);
});

test('lost HTTP response can recover durable completed result', async () => {
  const { started } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => generated());
  await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const retry = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  assert.equal(retry.coaching.outcome, 'completed_goal');
  assert.equal(retry.coaching.nextFocus, 'naturalness');
  assert.equal(retry.coaching.phraseSuggestions.length, 0);
});

test('failed coaching lease state is retryable at repository level', async () => {
  const { started, repo } = await seededSession();
  await repo.freezeSession({ sessionId: started.sessionId, status: 'completed', durationMs: 100 });
  assert.equal((await repo.claimCoaching(started.sessionId))?.kind, 'claim');
  await repo.failCoaching(started.sessionId);
  assert.equal((await repo.claimCoaching(started.sessionId))?.kind, 'claim');
});

test('retrying Roleplay creates a new session and preserves old metadata', async () => {
  const { started, repo, owner } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => generated());
  await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const retry = await startRoleplaySession({ identity, scenarioId: 'cafe_ordering', personalization: { level: 'intermediate', focusAreas: [] } });
  assert.notEqual(retry.sessionId, started.sessionId);
  assert.equal((await repo.getSessionForOwner(started.sessionId, owner))?.coachingOutcome, 'completed_goal');
});

test('qualitative coaching remains isolated from measured profile fields', async () => {
  const { started } = await seededSession();
  setRoleplayCoachingProviderForTests(async () => generated());
  const result = await completeRoleplaySessionById({ identity, sessionId: started.sessionId });
  const record = result as unknown as Record<string, unknown>;
  assert.equal(record.accuracyScore, undefined);
  assert.equal(record.fluencyScore, undefined);
  assert.equal(record.weakWords, undefined);
});
