---
layout: post
date: '2024-11-26 18:49:09'
author: Jinansh Mehta
title: Python Cheatsheet
---

# Python Cheatsheet for Beginners

## Table of Contents
1. [Introduction](#introduction)
2. [Basics](#basics)
3. [Data Types](#data-types)
4. [Control Flow](#control-flow)
5. [Functions](#functions)
6. [Modules](#modules)
7. [File Handling](#file-handling)
8. [Object-Oriented Programming](#object-oriented-programming)
9. [Error Handling](#error-handling)
10. [Common Built-in Functions](#common-built-in-functions)
11. [Advanced Topics](#advanced-topics)

---

## Introduction
Python is a high-level, versatile programming language known for its simplicity and readability. You can use Python for web development, data analysis, artificial intelligence, and much more.

---

## Basics
### Printing and Comments
**Printing** is used to display output:
```python
print("Hello, World!")  # This prints Hello, World! to the screen
```

**Comments** are notes for the programmer and ignored by Python:
```python
# This is a single-line comment

'''
This is a
multi-line comment
'''
```

### Variables
Variables store data. You don’t need to specify the type of a variable.
```python
x = 5         # Integer
y = 3.14      # Float
name = "John" # String
is_happy = True  # Boolean

# You can print variables like this:
print("Name:", name)
```

### Rules for Variable Names
- Must start with a letter or an underscore.
- Can only contain letters, numbers, and underscores.
- Case-sensitive (`Name` and `name` are different).

### Input
The `input` function takes user input as a string:
```python
user_name = input("What is your name? ")
print(f"Nice to meet you, {user_name}!")
```

---

## Data Types
Python has several data types to store different kinds of data.

### Numbers
```python
a = 10      # Integer
b = 3.14    # Float
c = 2 + 3j  # Complex number
```

### Strings
Strings are text data enclosed in quotes:
```python
text = "Hello"
print(text.upper())  # Convert to uppercase
print(text[1])       # Access character at index 1
```

**String Concatenation**:
```python
first = "Hello"
second = "World"
combined = first + " " + second
print(combined)
```

**String Formatting**:
```python
name = "Alice"
age = 25
print(f"My name is {name} and I am {age} years old.")
```

### Lists
Lists are ordered collections of items.
```python
numbers = [1, 2, 3, 4]
print(numbers[0])    # Access first item
numbers.append(5)    # Add an item
numbers.pop()        # Remove last item
print(numbers)
```

### Dictionaries
Dictionaries store data in key-value pairs.
```python
person = {"name": "Alice", "age": 25}
print(person["name"])  # Access value by key
person["age"] = 26     # Update value
print(person)
```

### Tuples
Tuples are immutable lists (cannot be changed after creation).
```python
coordinates = (10, 20)
print(coordinates[0])
```

### Sets
Sets are collections of unique items.
```python
unique_items = {1, 2, 3, 2}
unique_items.add(4)
print(unique_items)  # Output: {1, 2, 3, 4}
```

---

## Control Flow
Control flow determines the order in which code runs.

### If-Else
```python
age = 18
if age >= 18:
    print("You are an adult.")
elif age > 13:
    print("You are a teenager.")
else:
    print("You are a child.")
```

### Loops
**For Loop**:
```python
for i in range(5):
    print(i)  # Outputs 0, 1, 2, 3, 4
```

**While Loop**:
```python
count = 0
while count < 5:
    print(count)
    count += 1
```

---

## Functions
Functions group reusable code.

### Defining Functions
```python
def greet(name):
    return f"Hello, {name}!"
print(greet("Alice"))
```

### Default Parameters
```python
def greet(name="stranger"):
    return f"Hello, {name}!"
print(greet())  # Outputs: Hello, stranger!
```

---

## Modules
Modules are libraries of code you can import.

### Importing Modules
```python
import math
print(math.sqrt(16))
```

### Installing External Modules
Use `pip` to install libraries:
```bash
pip install requests
```

---

## File Handling
### Reading and Writing Files
```python
# Write to a file
with open("example.txt", "w") as file:
    file.write("Hello, file!")

# Read from a file
with open("example.txt", "r") as file:
    content = file.read()
    print(content)
```

---

## Object-Oriented Programming
OOP allows you to model real-world things using classes and objects.

### Classes and Objects
```python
class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed

    def bark(self):
        return f"{self.name} says Woof!"

dog = Dog("Buddy", "Golden Retriever")
print(dog.bark())
```

---

## Error Handling
Handle errors gracefully with `try-except` blocks.
```python
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
finally:
    print("Done!")
```

---

## Common Built-in Functions
### Math Functions
```python
max([1, 2, 3])  # Find max
min([1, 2, 3])  # Find min
abs(-10)        # Absolute value
sum([1, 2, 3])  # Sum of elements
```

### String Functions
```python
len("hello")          # String length
"hello".replace("e", "a")  # Replace characters
```

---

## Advanced Topics
### List Comprehensions
```python
squares = [x**2 for x in range(5)]
print(squares)
```

### Lambda Functions
```python
double = lambda x: x * 2
print(double(5))
```

---
