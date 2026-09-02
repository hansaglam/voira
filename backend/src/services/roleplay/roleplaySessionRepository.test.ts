import assert from 'node:assert/strict';
import test from 'node:test';
import { ROLEPLAY_CONTEXT_TURN_LIMIT, ROLEPLAY_GENERATION_LEASE_MS, ROLEPLAY_MAX_USER_TURNS } from '../../config/roleplayConfig.js';
import { InMemoryRoleplaySessionRepository } from './inMemoryRoleplaySessionRepository.js';
import { resolveRoleplayOwnerRef } from './roleplayOwnerKey.js';
import { toPersistedPersonalization } from './roleplayPersonalizationPersistence.js';
import { RoleplayPurgeRejectedError, RoleplaySequenceAllocationRejectedError } from './roleplaySessionRepository.js';
import type { AnalysisRequestIdentity } from '../../middleware/analysisRequestIdentity.js';

const userIdentity: AnalysisRequestIdentity = { type: 'authenticated', userId: 'user-1' };
const guestIdentity: AnalysisRequestIdentity = { type: 'guest', guestId: 'guest-abc' };
const otherUser: AnalysisRequestIdentity = { type: 'authenticated', userId: 'user-2' };

function repo() {
  const instance = new InMemoryRoleplaySessionRepository();
  instance.resetForTests?.();
  return instance;
}

function personalization(level: 'beginner' | 'intermediate' | 'advanced' | 'unsure' = 'intermediate') {
  return toPersistedPersonalization({ level, goal: 'travel', focusAreas: ['fluency'] });
}

async function createActiveSession(
  repository: InMemoryRoleplaySessionRepository,
  identity: AnalysisRequestIdentity = userIdentity,
) {
  const owner = resolveRoleplayOwnerRef(identity)!;
  return repository.createSession({
    owner,
    scenarioId: 'cafe_ordering',
    level: 'intermediate',
    personalization: personalization(),
    openingAssistantText: 'Hello! What can I get you?',
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  });
}

test.beforeEach(() => {
  // isolated per test via new repo()
});

test('authenticated durable session create/read', async () => {
  const repository = repo();
  const session = await createActiveSession(repository, userIdentity);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.ok(loaded);
  assert.equal(loaded?.authUserId, 'user-1');
  assert.equal(loaded?.guestOwnerKey, null);
});

test('guest durable session create/read with hashed owner key', async () => {
  const repository = repo();
  const session = await createActiveSession(repository, guestIdentity);
  const owner = resolveRoleplayOwnerRef(guestIdentity)!;
  assert.ok(owner.guestOwnerKey?.startsWith('g_'));
  assert.notEqual(owner.guestOwnerKey, guestIdentity.guestId);
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.ok(loaded);
  assert.equal(loaded?.guestOwnerKey, owner.guestOwnerKey);
});

test('cross-owner access impossible', async () => {
  const repository = repo();
  const session = await createActiveSession(repository, userIdentity);
  const other = resolveRoleplayOwnerRef(otherUser)!;
  const loaded = await repository.getSessionForOwner(session.id, other);
  assert.equal(loaded, null);
});

test('restart/context reconstruction from persisted exchanges', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-1',
    userText: 'A latte please',
  });
  assert.equal(begin?.kind, 'claim_generation');
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: begin!.exchange.id,
    assistantText: 'What size?',
  });
  const context = await repository.getBoundedContext(session.id, ROLEPLAY_CONTEXT_TURN_LIMIT);
  assert.ok(context.some((turn) => turn.text.includes('latte')));
  assert.ok(context.some((turn) => turn.text.includes('What size')));
});

test('same clientTurnId returns existing assistant response', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const first = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-dup',
    userText: 'Tea please',
  });
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: first!.exchange.id,
    assistantText: 'Sure.',
  });
  const second = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-dup',
    userText: 'Tea please',
  });
  assert.equal(second?.kind, 'existing_completed');
  assert.equal(second?.exchange.assistantText, 'Sure.');
});

test('duplicate does not require second generation after completed exchange', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  let aiCalls = 0;
  const begin1 = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-1',
    userText: 'Hi',
  });
  aiCalls += 1;
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: begin1!.exchange.id,
    assistantText: 'Hello there',
  });
  const begin2 = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-1',
    userText: 'Hi',
  });
  assert.equal(begin2?.kind, 'existing_completed');
  assert.equal(aiCalls, 1);
});

test('failed generation is safely retryable', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-retry',
    userText: 'Hello',
  });
  await repository.failExchange({ sessionId: session.id, exchangeId: begin!.exchange.id });
  const retry = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-retry',
    userText: 'Hello',
  });
  assert.equal(retry?.kind, 'claim_generation');
  assert.equal(retry?.exchange.generationStatus, 'pending');
});

test('expired session rejected after restart simulation', async () => {
  const repository = repo();
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const session = await repository.createSession({
    owner,
    scenarioId: 'cafe_ordering',
    level: 'intermediate',
    personalization: personalization(),
    openingAssistantText: 'Hi',
    expiresAt: new Date(Date.now() - 1_000).toISOString(),
  });
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.equal(loaded?.status, 'expired');
});

test('completed session purges turn text', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-1',
    userText: 'Coffee',
  });
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: begin!.exchange.id,
    assistantText: 'Sure',
  });
  await repository.completeSession({ sessionId: session.id, status: 'completed', durationMs: 1000 });
  const context = await repository.getBoundedContext(session.id, 20);
  assert.equal(context.length, 0);
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.equal(loaded?.openingAssistantText, null);
});

test('abandoned session purges turn text', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.completeSession({ sessionId: session.id, status: 'abandoned', durationMs: 500 });
  const context = await repository.getBoundedContext(session.id, 20);
  assert.equal(context.length, 0);
});

test('expired session purges turn text', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.expireSession(session.id);
  const context = await repository.getBoundedContext(session.id, 20);
  assert.equal(context.length, 0);
});

test('metadata remains after transcript purge', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  await repository.completeSession({ sessionId: session.id, status: 'completed', durationMs: 2000 });
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.equal(loaded?.scenarioId, 'cafe_ordering');
  assert.equal(loaded?.status, 'completed');
  assert.equal(loaded?.userTurnCount, 0);
});

test('12-turn maximum survives DB rehydrate via user_turn_count', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  for (let i = 0; i < ROLEPLAY_MAX_USER_TURNS; i += 1) {
    await repository.incrementUserTurnCount(session.id);
  }
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const loaded = await repository.getSessionForOwner(session.id, owner);
  assert.equal(loaded?.userTurnCount, ROLEPLAY_MAX_USER_TURNS);
});

test('context remains bounded to last 8 turns', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  for (let i = 0; i < 10; i += 1) {
    const begin = await repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: `ct-${i}`,
      userText: `line ${i}`,
    });
    await repository.completeExchange({
      sessionId: session.id,
      exchangeId: begin!.exchange.id,
      assistantText: `reply ${i}`,
    });
  }
  const context = await repository.getBoundedContext(session.id, ROLEPLAY_CONTEXT_TURN_LIMIT);
  assert.ok(context.length <= ROLEPLAY_CONTEXT_TURN_LIMIT);
});

test('unsure level is supported in persistence', async () => {
  const repository = repo();
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const session = await repository.createSession({
    owner,
    scenarioId: 'cafe_ordering',
    level: 'unsure',
    personalization: personalization('unsure'),
    openingAssistantText: 'Hi',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal(session.level, 'unsure');
});

test('personalization whitelist enforced', () => {
  const persisted = toPersistedPersonalization({
    level: 'unsure',
    goal: 'travel',
    focusAreas: ['fluency', 'vocabulary' as never],
  });
  assert.deepEqual(persisted.focusAreas, ['fluency']);
  assert.equal((persisted as Record<string, unknown>).transcript, undefined);
});

test('no audio persistence in repository entities', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  assert.equal((session as Record<string, unknown>).audio, undefined);
});

test('no unrelated transcript persistence in personalization', () => {
  const persisted = toPersistedPersonalization({
    level: 'beginner',
    focusAreas: [],
  });
  assert.equal(Object.keys(persisted).sort().join(','), 'focusAreas,goal,level');
});

test('concurrent duplicate second caller sees in_flight or existing_completed', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const first = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-concurrent',
    userText: 'Hi',
  });
  const second = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-concurrent',
    userText: 'Hi',
  });
  assert.ok(second?.kind === 'in_flight' || second?.kind === 'claim_generation');
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: first!.exchange.id,
    assistantText: 'Hello',
  });
  const third = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-concurrent',
    userText: 'Hi',
  });
  assert.equal(third?.kind, 'existing_completed');
});

test('ended-session purge succeeds without zeroing user_text', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-purge',
    userText: 'Keep me until ended',
  });
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: begin!.exchange.id,
    assistantText: 'Reply',
  });
  await repository.completeSession({ sessionId: session.id, status: 'completed', durationMs: 1000 });
  const context = await repository.getBoundedContext(session.id, 20);
  assert.equal(context.length, 0);
});

test('active session cannot be accidentally purged', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-active',
    userText: 'Still active',
  });
  await repository.completeExchange({
    sessionId: session.id,
    exchangeId: begin!.exchange.id,
    assistantText: 'Reply',
  });
  await assert.rejects(
    () => repository.purgeTransientTurns(session.id),
    (error: unknown) => error instanceof RoleplayPurgeRejectedError,
  );
  const context = await repository.getBoundedContext(session.id, 20);
  assert.ok(context.some((turn) => turn.text.includes('Still active')));
});

test('stale pending generation is reclaimed after process death', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-stale',
    userText: 'Hello',
  });
  const staleAt = new Date(Date.now() - ROLEPLAY_GENERATION_LEASE_MS - 5_000).toISOString();
  repository.setExchangeClaimedAtForTests(session.id, 'ct-stale', staleAt);
  const reclaimed = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-stale',
    userText: 'Hello',
  });
  assert.equal(reclaimed?.kind, 'claim_generation');
});

test('fresh pending generation remains in_flight', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-fresh',
    userText: 'Hello',
  });
  const duplicate = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-fresh',
    userText: 'Hello',
  });
  assert.equal(duplicate?.kind, 'in_flight');
});

test('two concurrent stale reclaim attempts yield one claimant', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-race',
    userText: 'Hello',
  });
  const staleAt = new Date(Date.now() - ROLEPLAY_GENERATION_LEASE_MS - 5_000).toISOString();
  repository.setExchangeClaimedAtForTests(session.id, 'ct-race', staleAt);
  const [first, second] = await Promise.all([
    repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: 'ct-race',
      userText: 'Hello',
    }),
    repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: 'ct-race',
      userText: 'Hello',
    }),
  ]);
  const kinds = [first?.kind, second?.kind].sort();
  assert.deepEqual(kinds, ['claim_generation', 'in_flight']);
});

test('sequence numbers stay unique under concurrent new turns', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const [turnA, turnB] = await Promise.all([
    repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: 'ct-seq-a',
      userText: 'A',
    }),
    repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: 'ct-seq-b',
      userText: 'B',
    }),
  ]);
  assert.notEqual(turnA?.exchange.sequenceNo, turnB?.exchange.sequenceNo);
});

test('context reconstruction remains deterministic by sequence_no', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  for (const [index, text] of ['first', 'second', 'third'].entries()) {
    const begin = await repository.beginUserTurn({
      sessionId: session.id,
      owner,
      clientTurnId: `ct-order-${index}`,
      userText: text,
    });
    await repository.completeExchange({
      sessionId: session.id,
      exchangeId: begin!.exchange.id,
      assistantText: `reply-${index}`,
    });
  }
  const context = await repository.getBoundedContext(session.id, 20);
  const userTexts = context.filter((turn) => turn.role === 'user').map((turn) => turn.text);
  assert.deepEqual(userTexts, ['first', 'second', 'third']);
});

test('first sequence allocation returns 1', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const first = await repository.allocateNextSequenceNo(session.id);
  assert.equal(first, 1);
});

test('second sequence allocation returns 2', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.allocateNextSequenceNo(session.id);
  const second = await repository.allocateNextSequenceNo(session.id);
  assert.equal(second, 2);
});

test('high concurrency produces unique strictly increasing sequence numbers', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const allocations = await Promise.all(
    Array.from({ length: 20 }, () => repository.allocateNextSequenceNo(session.id)),
  );
  const sorted = [...allocations].sort((a, b) => a - b);
  assert.deepEqual(sorted, Array.from({ length: 20 }, (_, index) => index + 1));
});

test('completed session cannot allocate sequence numbers', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.completeSession({ sessionId: session.id, status: 'completed', durationMs: 1000 });
  await assert.rejects(
    () => repository.allocateNextSequenceNo(session.id),
    (error: unknown) => error instanceof RoleplaySequenceAllocationRejectedError,
  );
});

test('abandoned session cannot allocate sequence numbers', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.completeSession({ sessionId: session.id, status: 'abandoned', durationMs: 500 });
  await assert.rejects(
    () => repository.allocateNextSequenceNo(session.id),
    (error: unknown) => error instanceof RoleplaySequenceAllocationRejectedError,
  );
});

test('expired session cannot allocate sequence numbers', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  await repository.expireSession(session.id);
  await assert.rejects(
    () => repository.allocateNextSequenceNo(session.id),
    (error: unknown) => error instanceof RoleplaySequenceAllocationRejectedError,
  );
});

test('unique session sequence numbers cannot be duplicated', async () => {
  const repository = repo();
  const session = await createActiveSession(repository);
  const owner = resolveRoleplayOwnerRef(userIdentity)!;
  const begin = await repository.beginUserTurn({
    sessionId: session.id,
    owner,
    clientTurnId: 'ct-first',
    userText: 'first',
  });
  const now = new Date().toISOString();
  assert.throws(
    () =>
      repository.insertExchangeForTests(session.id, {
        id: 'dup-seq',
        clientTurnId: 'ct-dup-seq',
        sequenceNo: begin!.exchange.sequenceNo,
        userText: 'duplicate',
        assistantText: null,
        generationStatus: 'pending',
        generationClaimedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    /duplicate_sequence_no/,
  );
});
