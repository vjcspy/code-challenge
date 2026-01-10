# Problem 4: Sum to N

Three unique implementations of the `sum_to_n` function in TypeScript.

## Problem

**Input**: `n` - any integer  
**Output**: Summation from 1 to `n`, i.e., `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`

## Implementations

### A: Mathematical Formula (Gauss's Formula)
- **Time Complexity**: O(1)
- **Space Complexity**: O(1)
- Most efficient - uses `n * (n + 1) / 2`

### B: Iterative Loop
- **Time Complexity**: O(n)
- **Space Complexity**: O(1)
- Simple and straightforward accumulator loop

### C: Recursive Approach
- **Time Complexity**: O(n)
- **Space Complexity**: O(n) due to call stack
- Elegant but may cause stack overflow for large n

## Setup

```bash
npm install
```

## Usage

```bash
npm run start
```

