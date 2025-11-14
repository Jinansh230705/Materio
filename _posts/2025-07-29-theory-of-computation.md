---
title: Theory of Computation
layout: post
excerpt: "&#8206;"
# summarize: true
Category: Syllabus
semester: "Semester 5"
subject: "Theory of Computation"
---

# UNIT 1: Alphabet, Languages, Grammars, Chomsky Hierarchy

## Alphabets, Strings, and Languages
- **Alphabet (Σ):** A finite non-empty set of symbols.
- **String:** A finite sequence of symbols from Σ.
- **Language:** A set of strings over an alphabet.

## Grammar and Derivations
- **Grammar:** A set of rules for generating strings in a language.
- **Derivation:** A sequence of rule applications to produce a string from the start symbol.

## Chomsky Hierarchy
- **Type 0:** Unrestricted Grammars
- **Type 1:** Context-Sensitive Grammars (CSG)
- **Type 2:** Context-Free Grammars (CFG)
- **Type 3:** Regular Grammars

# UNIT 2: Regular Languages and Finite Automata

## Regular Expressions (RE)
### Basic Symbols and Operations
- **∅:** Empty set
- **ε:** Empty string
- **a:** Symbol from alphabet
- **+ :** Union
- **. :** Concatenation
- **\* :** Kleene Star (repetition)

### Building Regular Expressions
- Formulate RE for specific languages; e.g., (a+b)* for all strings over {a,b}
- Construct RE for described languages/constraints

### RE to NFA/DFA and vice versa
- **RE → NFA:** Use construction rules (Thompson’s construction)
- **NFA → DFA:** Subset/power-set construction
- **DFA/NFA → RE:** State elimination method

## Finite Automata

### DFA (Deterministic Finite Automata)
- Definition: 5-tuple (Q, Σ, δ, q₀, F)
- Transition diagram/table
- Language accepted: All strings leading to a final state
- Example: DFA for even number of a’s, etc.

### NFA (Nondeterministic Finite Automata)
- Multiple transitions for (state, symbol)
- May have ε-transitions (move without input)
- **Equivalence:** Every NFA has an equivalent DFA (subset construction)

### NFA Construction (Examples)
- Language ending with ‘ab’
- Strings with at least one ‘a’

### Epsilon-NFA (ε-NFA)
- NFA with ε-transitions
- Conversion: **Epsilon-closure** + subset construction = DFA

### NFA to DFA Conversion
- List all epsilon-closures and construct DFA states

### DFA ⇄ Regular Expressions
- DFA → RE: State elimination
- RE → DFA: Via NFA conversion

## Moore and Mealy Machines
- **Moore:** Output depends on state
- **Mealy:** Output depends on state & input
- **Conversion:** 
  - Mealy to Moore: Assign output from transition to state
  - Moore to Mealy: Transfer output from states to relevant transitions

## Regular Grammars and Finite Automata
- Regular grammars represented by FA; Right-linear or left-linear

## Pumping Lemma for Regular Languages
- Used to prove non-regularity of languages

## Minimization of DFA
- Identify and merge equivalent states
- Remove unreachable states

# UNIT 3 (Partial): Context-Free Grammars (CFG) and Context-Free Languages (CFL)

## CFG Basics
- Grammar where left side is a single non-terminal
- Generates CFLs

## Simplification of CFG
- Remove useless symbols
- Remove epsilon-productions (nullable)
- Remove unit productions

## Chomsky Normal Form (CNF)
- All rules: A → BC or A → a
- Used for certain algorithms (e.g., CYK parsing)
