import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolvePaywallCtaKey,
  shouldShowPaywallFreeContinue,
} from './paywallScreenHelpers';

test('onboarding free continuation remains functional', () => {
  assert.equal(shouldShowPaywallFreeContinue(true), true);
});

test('normal Premium entry does not show onboarding-only free CTA', () => {
  assert.equal(shouldShowPaywallFreeContinue(false), false);
});

test('free trial CTA key only when trial metadata exists', () => {
  assert.equal(resolvePaywallCtaKey(false, true), 'ctaStartTrialDays');
});

test('non-trial annual CTA does not claim free trial', () => {
  assert.equal(resolvePaywallCtaKey(false, false), 'ctaStart');
});

test('premium subscriber sees continue CTA', () => {
  assert.equal(resolvePaywallCtaKey(true, true), 'ctaContinue');
  assert.equal(resolvePaywallCtaKey(true, false), 'ctaContinue');
});
