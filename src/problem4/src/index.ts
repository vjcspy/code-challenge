/**
 * Three unique implementations of sum_to_n function
 * Each function returns the summation from 1 to n: sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15
 */

/**
 * Implementation A: Mathematical Formula (Gauss's Formula)
 * 
 * Uses the closed-form formula: n * (n + 1) / 2
 * 
 * Time Complexity: O(1) - constant time, just arithmetic operations
 * Space Complexity: O(1) - no additional memory used
 * 
 * This is the most efficient implementation as it computes the result
 * directly without any iteration or recursion.
 */
function sum_to_n_a(n: number): number {
  return (n * (n + 1)) / 2;
}

/**
 * Implementation B: Iterative Loop
 * 
 * Uses a simple for loop to accumulate the sum from 1 to n.
 * 
 * Time Complexity: O(n) - iterates through all numbers from 1 to n
 * Space Complexity: O(1) - only uses a single accumulator variable
 * 
 * Straightforward and easy to understand, but less efficient than
 * the mathematical formula for large values of n.
 */
function sum_to_n_b(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

/**
 * Implementation C: Recursive Approach
 * 
 * Uses recursion to compute the sum by adding n to the sum of (n-1).
 * 
 * Time Complexity: O(n) - makes n recursive calls
 * Space Complexity: O(n) - call stack grows linearly with n
 * 
 * Elegant but least efficient due to function call overhead and stack
 * space usage. May cause stack overflow for very large values of n.
 */
function sum_to_n_c(n: number): number {
  if (n <= 0) {
    return 0;
  }
  return n + sum_to_n_c(n - 1);
}

// Export all implementations
export { sum_to_n_a, sum_to_n_b, sum_to_n_c };

// Demo/test the implementations
if (require.main === module) {
  const testCases = [0, 1, 5, 10, 100];

  console.log("Testing sum_to_n implementations:\n");

  for (const n of testCases) {
    const a = sum_to_n_a(n);
    const b = sum_to_n_b(n);
    const c = sum_to_n_c(n);

    console.log(`n = ${n}:`);
    console.log(`  sum_to_n_a (formula):    ${a}`);
    console.log(`  sum_to_n_b (iterative):  ${b}`);
    console.log(`  sum_to_n_c (recursive):  ${c}`);
    console.log(`  All match: ${a === b && b === c}\n`);
  }
}

