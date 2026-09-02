import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateAnnualSavingsPercent,
  detectFreeTrial,
  formatMonthlyEquivalentPrice,
  selectDefaultPackage,
  selectDefaultPackagePeriod,
  sortPackagesByPeriod,
} from './paywallPricing';
import {
  buildPackageOptions,
  isMonthlyPackage,
  isWeeklyPackage,
  isYearlyPackage,
  resolvePackagePeriod,
} from './offeringPackageResolve';
import { shouldShowHomePremiumTeaser } from '../home/homePremiumVisibility';
import type { PurchasesPackage } from 'react-native-purchases';
import type { PremiumPackageOption } from './premiumTypes';

function mockPackage(input: {
  id: string;
  productId: string;
  price: number;
  priceString: string;
  currencyCode: string;
  packageType?: number;
  introPrice?: {
    price: number;
    period: string;
    periodUnit: string;
  } | null;
}): PurchasesPackage {
  return {
    identifier: input.id,
    packageType: input.packageType ?? 0,
    product: {
      identifier: input.productId,
      price: input.price,
      priceString: input.priceString,
      currencyCode: input.currencyCode,
      introPrice: input.introPrice ?? undefined,
    },
  } as PurchasesPackage;
}

test('annual selected by default when available', () => {
  const options: PremiumPackageOption[] = [
    { period: 'weekly', package: mockPackage({ id: 'w', productId: 'w', price: 4.99, priceString: '$4.99', currencyCode: 'USD' }) } as PremiumPackageOption,
    { period: 'monthly', package: mockPackage({ id: 'm', productId: 'm', price: 9.99, priceString: '$9.99', currencyCode: 'USD' }) } as PremiumPackageOption,
    { period: 'yearly', package: mockPackage({ id: 'y', productId: 'y', price: 69.99, priceString: '$69.99', currencyCode: 'USD' }) } as PremiumPackageOption,
  ];
  assert.equal(selectDefaultPackagePeriod(options), 'yearly');
  assert.equal(selectDefaultPackage(options)?.identifier, 'y');
});

test('monthly fallback default when annual unavailable', () => {
  const options: PremiumPackageOption[] = [
    { period: 'weekly', package: mockPackage({ id: 'w', productId: 'w', price: 4.99, priceString: '$4.99', currencyCode: 'USD' }) } as PremiumPackageOption,
    { period: 'monthly', package: mockPackage({ id: 'm', productId: 'm', price: 9.99, priceString: '$9.99', currencyCode: 'USD' }) } as PremiumPackageOption,
  ];
  assert.equal(selectDefaultPackagePeriod(options), 'monthly');
});

test('weekly monthly annual mapped independent of offering order', () => {
  const offering = {
    identifier: 'default',
    availablePackages: [
      mockPackage({ id: 'annual', productId: 'voira_speakplus_yearly', price: 69.99, priceString: '$69.99', currencyCode: 'USD', packageType: 2 }),
      mockPackage({ id: 'weekly', productId: 'voira_speakplus_weekly', price: 4.99, priceString: '$4.99', currencyCode: 'USD', packageType: 1 }),
      mockPackage({ id: 'monthly', productId: 'voira_speakplus_monthly', price: 9.99, priceString: '$9.99', currencyCode: 'USD', packageType: 3 }),
    ],
    weekly: null,
    monthly: null,
    annual: null,
  };

  const options = buildPackageOptions(offering as never);
  assert.deepEqual(options.map((o) => o.period), ['weekly', 'monthly', 'yearly']);
});

test('savings calculation with 9.99 monthly / 69.99 annual', () => {
  const savings = calculateAnnualSavingsPercent(
    { price: 9.99, currencyCode: 'USD', priceString: '$9.99' },
    { price: 69.99, currencyCode: 'USD', priceString: '$69.99' },
  );
  assert.equal(savings, 42);
});

test('no savings badge with mismatched currency', () => {
  const savings = calculateAnnualSavingsPercent(
    { price: 9.99, currencyCode: 'USD', priceString: '$9.99' },
    { price: 69.99, currencyCode: 'EUR', priceString: '€69.99' },
  );
  assert.equal(savings, null);
});

test('no savings badge when invalid values', () => {
  assert.equal(
    calculateAnnualSavingsPercent(
      { price: 0, currencyCode: 'USD', priceString: '$0' },
      { price: 69.99, currencyCode: 'USD', priceString: '$69.99' },
    ),
    null,
  );
});

test('annual monthly-equivalent calculation', () => {
  const formatted = formatMonthlyEquivalentPrice(
    { price: 69.99, currencyCode: 'USD', priceString: '$69.99' },
    'en-US',
  );
  assert.ok(formatted);
  assert.match(formatted!, /\$5\.83|\$5,83/);
});

test('free trial CTA only when actual trial metadata exists', () => {
  const withTrial = mockPackage({
    id: 'y',
    productId: 'y',
    price: 69.99,
    priceString: '$69.99',
    currencyCode: 'USD',
    introPrice: { price: 0, period: '7', periodUnit: 'DAY' },
  });
  const trial = detectFreeTrial(withTrial.product);
  assert.equal(trial.hasFreeTrial, true);
  assert.equal(trial.trialDays, 7);
});

test('non-trial annual does not claim free trial', () => {
  const noTrial = mockPackage({
    id: 'y',
    productId: 'y',
    price: 69.99,
    priceString: '$69.99',
    currencyCode: 'USD',
    introPrice: null,
  });
  const trial = detectFreeTrial(noTrial.product);
  assert.equal(trial.hasFreeTrial, false);
});

test('package period helpers', () => {
  const weekly = mockPackage({ id: '$rc_weekly', productId: 'x_weekly', price: 1, priceString: '$1', currencyCode: 'USD' });
  const monthly = mockPackage({ id: '$rc_monthly', productId: 'x_monthly', price: 1, priceString: '$1', currencyCode: 'USD' });
  const yearly = mockPackage({ id: '$rc_annual', productId: 'x_yearly', price: 1, priceString: '$1', currencyCode: 'USD' });
  assert.equal(isWeeklyPackage(weekly), true);
  assert.equal(isMonthlyPackage(monthly), true);
  assert.equal(isYearlyPackage(yearly), true);
  assert.equal(resolvePackagePeriod(yearly), 'yearly');
});

test('home teaser hidden before first analyzed practice', () => {
  assert.equal(shouldShowHomePremiumTeaser({ isPremium: false, analyzedPracticeCount: 0 }), false);
  assert.equal(shouldShowHomePremiumTeaser({ isPremium: false, analyzedPracticeCount: 1 }), true);
  assert.equal(shouldShowHomePremiumTeaser({ isPremium: true, analyzedPracticeCount: 5 }), false);
});

test('sortPackagesByPeriod orders weekly monthly yearly', () => {
  const sorted = sortPackagesByPeriod([
    { period: 'yearly' as const },
    { period: 'weekly' as const },
    { period: 'monthly' as const },
  ]);
  assert.deepEqual(sorted.map((s) => s.period), ['weekly', 'monthly', 'yearly']);
});
