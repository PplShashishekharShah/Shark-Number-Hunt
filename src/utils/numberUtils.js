/**
 * numberUtils.js
 * Pure utility functions for number classification.
 */

/** Returns true if n is even */
export const isEven = (n) => n % 2 === 0;

/** Returns true if n is odd */
export const isOdd = (n) => n % 2 !== 0;

/** Returns true if n is prime (n >= 2) */
export const isPrime = (n) => {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
};

/** Returns true if n is composite (not prime and > 1) */
export const isComposite = (n) => n > 1 && !isPrime(n);

/** Rule checkers keyed by rule name */
export const RULES = {
  even:      { label: 'Collect Even Numbers',     check: isEven },
  odd:       { label: 'Collect Odd Numbers',       check: isOdd },
  prime:     { label: 'Collect Prime Numbers',     check: isPrime },
  composite: { label: 'Collect Composite Numbers', check: isComposite },
};

/** Return a random rule key from RULES */
export const randomRule = () => {
  const keys = Object.keys(RULES);
  return keys[Math.floor(Math.random() * keys.length)];
};

/** Generate an array of fish data (numbers 1-20, tagged correct/incorrect) */
export const generateFishPool = (rule) => {
  const checker = RULES[rule].check;
  const pool = [];
  for (let n = 1; n <= 20; n++) {
    pool.push({ value: n, correct: checker(n) });
  }
  return pool;
};
