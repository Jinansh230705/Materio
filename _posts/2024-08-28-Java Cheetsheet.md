---
title: Java Cheetsheet
layout: post
catergories: Java Cheetsheet
author: Jinansh Mehta
---

## Java

This cheat sheet is a crash course for Java beginners and help review the basic syntax of the Java language.
 
### #Getting started

```java
public class Hello {
  // main method
  public static void main(String[] args)
  {
    // Output: Hello, world!
    System.out.println("Hello, world!");
  }
}
```

```
compiling and running
$ javac Hello.java
$ java Hello
Hello, world!
```

### variables

```java
int num = 5;
float floatNum = 5.99f;
char letter = 'D';
boolean bool = true;
String site = "quickref.me";
```

### Primitive data types

| Data Type | Size   | Default | Range         |
| --------- | ------ | ------- | ------------- |
| byte      | 1 byte | 0       | -128 to 127   |
| short     | 2 byte | 0       | -215 to 215-1 |
| int       | 4 byte | 0       | -231 to 231-1 |
| long      | 8 byte | 0       | -263 to 263-1 |
| float     | 4 byte | 0.0f    | N/A           |
| double    | 8 byte | 0.0d    | N/A           |
| char      | 2 byte | \u0000  | 0 to 65535    |
| boolean   | N/A    | false   | true / false  |

### Type Casting

```java
// Widening
// byte<short<int<long<float<double
int i = 10;
long l = i;               // 10

// Narrowing
double d = 10.02;
long l = (long)d;         // 10

String.valueOf(10);       // "10"
Integer.parseInt("10");   // 10
Double.parseDouble("10"); // 10.0
```

### User Input

```java
Scanner in = new Scanner(System.in);
String str = in.nextLine();
System.out.println(str);

int num = in.nextInt();
System.out.println(num);
```

## Java Strings

### Basic

```java
String str1 = "value";
String str2 = new String("value");
String str3 = String.valueOf(123);
```

### concatenation

```java
String s = 3 + "str" + 3;     // 3str3
String s = 3 + 3 + "str";     // 6str
String s = "3" + 3 + "str";   // 33str
String s = "3" + "3" + "23";  // 3323
String s = "" + 3 + 3 + "23"; // 3323
String s = 3 + 3 + 23;        // 29
```

### StringBuilder

StringBuilder sb = new StringBuilder(10);

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
|   |   |   |   |   |   |   |   |   |
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
0   1   2   3   4   5   6   7   8  9
```

sb.append("QuickRef");

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
| Q | u | i | c | k | R | e | f |   |
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
0   1   2   3   4   5   6   7   8   9
```

sb.delete(5, 9);

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
| Q | u | i | c | k |   |   |   |   |
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
0   1   2   3   4   5   6   7   8   9
```

sb.insert(0, "My ");

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
| M | y |   | Q | u | i | c | k |   |
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
0   1   2   3   4   5   6   7   8   9
```

sb.append("!");

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
| M | y |   | Q | u | i | c | k | ! |
└───┴───┴───┴───┴───┴───┴───┴───┴───┘
0   1   2   3   4   5   6   7   8   9
```

### Comparison

```java
String s1 = new String("QuickRef");
String s2 = new String("QuickRef");

s1 == s2          // false
s1.equals(s2)     // true

"AB".equalsIgnoreCase("ab")  // true
```

### manipulation

```java
String str = "Abcd";

str.toUpperCase();     // ABCD
str.toLowerCase();     // abcd
str.concat("#");       // Abcd#
str.replace("b", "-"); // A-cd

"  abc ".trim();       // abc
"ab".toCharArray();    // {'a', 'b'}
```

### information

```java
String str = "abcd";

str.charAt(2);       // c
str.indexOf("a")     // 0
str.indexOf("z")     // -1
str.length();        // 4
str.toString();      // abcd
str.substring(2);    // cd
str.substring(2,3);  // c
str.contains("c");   // true
str.endsWith("d");   // true
str.startsWith("a"); // true
str.isEmpty();       // false

```

### immutable

```java
String str = "hello";
str.concat("world");

// Outputs: hello
System.out.println(str);

```

---

```java
String str = "hello";
String concat = str.concat("world");

// Outputs: helloworld
System.out.println(concat);
```

Once created cannot be modified, any modification creates a new String

## Java Arrays

### Declare

```java
int[] a1;
int[] a2 = {1, 2, 3};
int[] a3 = new int[]{1, 2, 3};

int[] a4 = new int[3];
a4[0] = 1;
a4[2] = 2;
a4[3] = 3;
```

### modify

```java
int[] a = {1, 2, 3};
System.out.println(a[0]); // 1

a[0] = 9;
System.out.println(a[0]); // 9

System.out.println(a.length); // 3
```

### Loop (Read & Modify)

```java
int[] arr = {1, 2, 3};
for (int i=0; i < arr.length; i++) {
    arr[i] = arr[i] * 2;
    System.out.print(arr[i] + " ");
}
// Outputs: 2 4 6
```

### Loop (Read)

```java
String[] arr = {"a", "b", "c"};
for (int a: arr) {
    System.out.print(a + " ");
}
// Outputs: a b c
```

### multidimensional Arrays

```java
int[][] matrix = { {1, 2, 3}, {4, 5} };

int x = matrix[1][0];  // 4
// [[1, 2, 3], [4, 5]]
Arrays.deepToString(matrix)

for (int i = 0; i < a.length; ++i) {
  for(int j = 0; j < a[i].length; ++j) {
    System.out.println(a[i][j]);
  }
}
// Outputs: 1 2 3 4 5 6 7
```

### sort

```java
char[] chars = {'b', 'a', 'c'};
Arrays.sort(chars);

// [a, b, c]
Arrays.toString(chars);
```

---

## Java Conditional

| Operators |            |     |      |
| --------- | ---------- | --- | ---- |
| +         | -          | \*  | /    |
| %         | =          | ++  | >=   |
| !         | ==         | !=  | >    |
| <         | <=         | &&  | ^    |
| ?:        | instanceof | --  | \|\| |
| ~         | <<         | >>  | >>>  |
| &         |            |     |      |

### if else

```java
int k = 15;
if (k > 20) {
  System.out.println(1);
} else if (k > 10) {
  System.out.println(2);
} else {
  System.out.println(3);
}
```

### switch

```java
int month = 3;
String str;
switch (month) {
  case 1:
    str = "January";
    break;
  case 2:
    str = "February";
    break;
  case 3:
    str = "March";
    break;
  default:
    str = "Some other month";
    break;
}

// Outputs: Result March
System.out.println("Result " + str);
```

### ternary operator

```java
int a = 10;
int b = 20;
int max = (a > b) ? a : b;

// Outputs: 20
System.out.println(max);
```

## Java loops

### for loop

```java
for (int i = 0; i < 10; i++) {
  System.out.print(i);
}
// Outputs: 0123456789

```

---

```java
for (int i = 0,j = 0; i < 3; i++,j--) {
  System.out.print(j + "|" + i + " ");
}
// Outputs: 0|0 -1|1 -2|2

```

### Enhanced For loop

```java
int[] numbers = {1,2,3,4,5};

for (int number: numbers) {
  System.out.print(number);
}
// Outputs: 12345
```

Used to loop around array's or List's

### while loop

```java
int count = 0;

while (count < 5) {
  System.out.print(count);
  count++;
}
// Outputs: 01234
```

### Do While Loop

```java
int count = 0;

do {
  System.out.print(count);
  count++;
} while (count < 5);
// Outputs: 01234
```

### continue statement

```java
for (int i = 0; i < 5; i++) {
  if (i == 3) {
    continue;
  }
  System.out.print(i);
}
// Outputs: 01245
```

### break statement

```java
for (int i = 0; i < 5; i++) {
  System.out.print(i);
  if (i == 3) {
    break;
  }
}
// Outputs: 0123
```

**most imp**

# JCF(Java collection Framework):

1. List Interface
   Ordered collection (also known as a sequence).

- ArrayList: Resizable array implementation.

```java
List<String> list = new ArrayList<>();
list.add("Element");
list.get(0);
list.size();
list.remove(0);
```

- LinkedList: Doubly-linked list implementation.

```java
List<String> list = new LinkedList<>();
list.add("Element");
list.get(0);
list.size();
list.remove(0);
```

2. Set Interface
   Collection that cannot contain duplicate elements.

- HashSet: Hash table implementation.

```java
Set<String> set = new HashSet<>();
set.add("Element");
set.contains("Element");
set.size();
set.remove("Element");
```

- LinkedHashSet: Hash table and linked list implementation (orders elements by insertion order).

```java
Set<String> set = new LinkedHashSet<>();
set.add("Element");
set.contains("Element");
set.size();
set.remove("Element");
```

- TreeSet: Red-black tree implementation (orders elements based on their values).

```java
Set<String> set = new TreeSet<>();
set.add("Element");
set.contains("Element");
set.size();
set.remove("Element");
```

3. Queue Interface
   Collection designed for holding elements prior to processing.

- LinkedList (also implements Queue interface):

```java
Queue<String> queue = new LinkedList<>();
queue.add("Element");
queue.offer("Element"); // Similar to add but does not throw exception
queue.peek(); // Retrieves, but does not remove, the head of this queue
queue.poll(); // Retrieves and removes the head of this queue
```

- PriorityQueue: Priority heap implementation (orders elements based on their natural ordering or by a Comparator provided at queue construction time).

```java
Queue<String> queue = new PriorityQueue<>();
queue.add("Element");
queue.offer("Element");
queue.peek();
queue.poll();
```

4. Deque Interface
   Double-ended queue, supports element insertion and removal at both ends.

- ArrayDeque: Resizable array implementation of Deque.

```java
Deque<String> deque = new ArrayDeque<>();
deque.addFirst("Element");
deque.addLast("Element");
deque.offerFirst("Element");
deque.offerLast("Element");
deque.peekFirst();
deque.peekLast();
deque.pollFirst();
deque.pollLast();

```

5. Map Interface
   Object that maps keys to values; cannot contain duplicate keys.

- HashMap: Hash table implementation.

```java
Map<String, String> map = new HashMap<>();
map.put("key", "value");
map.get("key");
map.containsKey("key");
map.size();
map.remove("key");
```

- LinkedHashMap: Hash table and linked list implementation (orders elements by insertion order).

```java
Map<String, String> map = new LinkedHashMap<>();
map.put("key", "value");
map.get("key");
map.containsKey("key");
map.size();
map.remove("key");
```

- TreeMap: Red-black tree implementation (orders elements based on their natural ordering or by a Comparator provided at map construction time).

```java
Map<String, String> map = new TreeMap<>();
map.put("key", "value");
map.get("key");
map.containsKey("key");
map.size();
map.remove("key");
```

6. Stack Class
   Last-In-First-Out (LIFO) stack of objects.

```java
Stack<String> stack = new Stack<>();
stack.push("Element");
stack.peek(); // Looks at the object at the top of this stack without removing it
stack.pop(); // Removes the object at the top of this stack and returns that object
stack.isEmpty(); // Tests if this stack is empty
```

## Additional Methods and Tips

- Iteration over Collections:

```java
// Using Iterator
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    System.out.println(it.next());
}

// Using enhanced for-loop
for (String element : list) {
    System.out.println(element);
}
```

- sorting Lists:

```java
Collections.sort(list);
Collections.sort(list, Comparator.reverseOrder());
```

# Java Interview questions for Freshers

<details>
<summary>Is Java Platform Independent? Explain</summary>

Yes, Java is a Platform Independent language. Unlike many programming languages javac compiler compiles the program to form a bytecode or .class file. This file is independent of the software or hardware running but needs a JVM(Java Virtual Machine) file preinstalled in the operating system for further execution of the bytecode.

Although JVM is platform dependent, the bytecode can be created on any System and can be executed in any other system despite hardware or software being used which makes Java platform independent.

</details>

<details>
<summary>
Difference between JVM, JRE, and JDK.
</summary>
JVM: JVM also known as Java Virtual Machine is a part of JRE. JVM is a type of interpreter responsible for converting bytecode into machine-readable code. JVM itself is platform dependent but it interprets the bytecode which is the platform-independent reason why Java is platform-independent.

JRE: JRE stands for Java Runtime Environment, it is an installation package that provides an environment to run the Java program or application on any machine.

JDK: JDK stands for Java Development Kit which provides the environment to develop and execute Java programs. JDK is a package that includes two things Development Tools to provide an environment to develop your Java programs and, JRE to execute Java programs or applications.

</details>

<details>

<summary>What is JVM?</summary>
JVM stands for Java Virtual Machine it is a Java interpreter. It is responsible for loading, verifying, and executing the bytecode created in Java.

Although it is platform dependent which means the software of JVM is different for different Operating Systems it plays a vital role in making Java platform Independent.

</details>

<details>
<summary>What is JIT?</summary>
JIT stands for (Just-in-Time) compiler is a part of JRE(Java Runtime Environment), it is used for better performance of the Java applications during run-time. The use of JIT is mentioned in step by step process mentioned below:

- Source code is compiled with javac compiler to form bytecode
- Bytecode is further passed on to JVM
- JIT is a part of JVM, JIT is responsible for compiling bytecode into native machine code at run time.
- The JIT compiler is enabled throughout, while it gets activated when a method is invoked. For a compiled method, the JVM directly calls the compiled code, instead of interpreting it.
- As JVM calls the compiled code that increases the performance and speed of the execution.
</details>

<details>
<summary>Explain public static void main(String args[]) in Java.</summary>

Unlike any other programming language like C, C++, etc. In Java, we declared the main function as a public static void main (String args[]). The meanings of the terms are mentioned below:

public: the public is the access modifier responsible for mentioning who can access the element or the method and what is the limit. It is responsible for making the main function globally available. It is made public so that JVM can invoke it from outside the class as it is not present in the current class.
static: static is a keyword used so that we can use the element without initiating the class so to avoid the unnecessary allocation of the memory.
void: void is a keyword and is used to specify that a method doesn’t return anything. As the main function doesn’t return anything we use void.
main: main represents that the function declared is the main function. It helps JVM to identify that the declared function is the main function.
String args[]: It stores Java command-line arguments and is an array of type java.lang.String class.

</details>

<details>
<summary>What is Java String Pool?</summary>
A Java String Pool is a place in heap memory where all the strings defined in the program are stored. A separate place in a stack is there where the variable storing the string is stored. Whenever we create a new string object, JVM checks for the presence of the object in the String pool, If String is available in the pool, the same object reference is shared with the variable, else a new object is created.

<b>Example:</b>

String str1="Hello";
// "Hello" will be stored in String Pool
// str1 will be stored in stack memory

</details>

<details>
<summary>What will happen if we declare don’t declare the main as static?</summary>
We can declare the main method without using static and without getting any errors. But, the main method will not be treated as the entry point to the application or the program.
</details>

<details>
<summary>What are Packages in Java?
</summary>
Packages in Java can be defined as the grouping of related types of classes, interfaces, etc providing access to protection and namespace management.
</details>

<details>
<summary>Why Packages are used?</summary>
Packages are used in Java in order to prevent naming conflicts, control access, and make searching/locating and usage of classes, interfaces, etc easier.
</details>

<details>

<summary>What are the advantages of Packages in Java?</summary>
There are various advantages of defining packages in Java.

Packages avoid name clashes.
The Package provides easier access control.
We can also have the hidden classes that are not visible outside and are used by the package.
It is easier to locate the related classes.

</details>

<details>
<summary> How many types of packages are there in Java?</summary>
There are two types of packages in Java

- User-defined packages
- Build In packages

</details>

<details>
<summary> Explain different data types in Java.</summary>
There are 2 types of data types in Java as mentioned below:

Primitive Data Type
Non-Primitive Data Type or Object Data type
Primitive Data Type: Primitive data are single values with no special capabilities. There are 8 primitive data types:

- boolean: stores value true or false
- byte: stores an 8-bit signed two’s complement integer
- char: stores a single 16-bit Unicode character
- short: stores a 16-bit signed two’s complement integer
- int: stores a 32-bit signed two’s complement integer
- long: stores a 64-bit two’s complement integer
- float: stores a single-precision 32-bit IEEE 754 floating-point
- double: stores a double-precision 64-bit IEEE 754 floating-point
  Non-Primitive Data Type: Reference Data types will contain a memory address of the variable’s values because it is not able to directly store the values in the memory. Types of Non-Primitive are mentioned below:

- Strings
- Array
- Class
- Object
- Interface

</details>

<details>
<summary>What is the Wrapper class in Java?</summary>
Wrapper, in general, is referred to a larger entity that encapsulates a smaller entity. Here in Java, the wrapper class is an object class that encapsulates the primitive data types.

The primitive data types are the ones from which further data types could be created. For example, integers can further lead to the construction of long, byte, short, etc. On the other hand, the string cannot, hence it is not primitive.

Getting back to the wrapper class, Java contains 8 wrapper classes. They are Boolean, Byte, Short, Integer, Character, Long, Float, and Double. Further, custom wrapper classes can also be created in Java which is similar to the concept of Structure in the C programming language. We create our own wrapper class with the required data types.

</details>

<details>
<summary>Why do we need wrapper classes?</summary>
The wrapper class is an object class that encapsulates the primitive data types, and we need them for the following reasons:

- Wrapper classes are final and immutable
- Provides methods like valueOf(), parseInt(), etc.
- It provides the feature of autoboxing and unboxing.
</details>

<details>
<summary>What is a Class Variable?</summary>
In Java, a class variable (also known as a static variable) is a variable that is declared within a class but outside of any method, constructor, or block. Class variables are declared with the static keyword, and they are shared by all instances (objects) of the class as well as by the class itself. No matter how many objects are derived from a class, each class variable would only exist once.
</details>

<details>
<summary>Explain the difference between instance variable and a class variable.</summary>
<b> Instance Variable </b>:
 A class variable without a static modifier known as an instance variable is typically shared by all instances of the class. These variables can have distinct values among several objects. The contents of an instance variable are completely independent of one object instance from another because they are related to a specific object instance of the class.

**Class Variable**: Class Variable variable can be declared anywhere at the class level using the keyword static. These variables can only have one value when applied to various objects. These variables can be shared by all class members since they are not connected to any specific object of the class.

</details>

<details>
<summary>What is a static variable?</summary>
The static keyword is used to share the same variable or method of a given class. Static variables are the variables that once declared then a single copy of the variable is created and shared among all objects at the class level.
</details>

<details>
<summary> What is the difference between System.out, System.err, and System.in?</summary>
<b>System.out</b>
– It is a PrintStream that is used for writing characters or can be said it can output the data we want to write on the Command Line Interface console/terminal. 
<b>System.err</b>
– It is used to display error messages.

| System.out                                           | System.err                                             |
| ---------------------------------------------------- | ------------------------------------------------------ |
| It will print to the standard out of the system.     | It will print to the standard error.                   |
| It is mostly used to display results on the console. | It is mostly used to output error texts.               |
| It gives output on the console with the default      | It also gives output on the console but                |
| (black) color.                                       | most of the IDEs give it a red color to differentiate. |

System.in – It is an InputStream used to read input from the terminal Window. We can’t use the System.in directly so we use Scanner class for taking input with the system.in.

</details>

<details>
<summary>Difference in the use of print, println, and printf.</summary>
print, println, and printf all are used for printing the elements but print prints all the elements and the cursor remains in the same line. println shifts the cursor to next line. And with printf we can use format identifiers too.
</details>
```

```
<details>
<summary>What are operators?</summary>
Operators are the special types of symbols used for performing some operations over variables and values.
</details>

<details>
<summary>How many types of operators are available in Java? </summary>
All types of operators in Java are mentioned below:

1. Arithmetic Operators
2. Unary Operators
3. Assignment Operator
4. Relational Operators
5. Logical Operators
6. Ternary Operator
7. Bitwise Operators
8. Shift Operators
9. instance of operator
Postfix operators are considered as the highest precedence according to Java operator precedence.
</details>

<details>
<summary> Explain the difference between >> and >>> operators.</summary>
Operators like >> and >>> seem to be the same but act a bit differently. >> operator shifts the sign bits and the >>> operator is used in shifting out the zero-filled bits.
</details>

<details>
<summary>Which Java operator is right associative?</summary>There is only one operator which is right associative which is = operator.
</details>

<details>
<summary>What is dot operator?</summary>The Dot operator in Java is used to access the instance variables and methods of class objects. It is also used to access classes and sub-packages from the package
</details>

<details>
<summary>What is covariant return type?</summary>
The covariant return type specifies that the return type may vary in the same direction as the subclass. It’s possible to have different return types for an overriding method in the child class, but the child’s return type should be a subtype of the parent’s return type and because of that overriding method becomes variant with respect to the return type.

We use covariant return type because of the following reasons:

Avoids confusing type casts present in the class hierarchy and makes the code readable, usable, and maintainable.
Gives liberty to have more specific return types when overriding methods.
Help in preventing run-time ClassCastExceptions on returns.

</details>

<details>
<summary> What is the transient keyword?</summary>The transient keyword is used at the time of serialization if we don’t want to save the value of a particular variable in a file. When JVM comes across a transient keyword, it ignores the original value of the variable and saves the default value of that variable data type.
</details>

<details>
<summary>What are the differences between String and StringBuffer?</summary>

| Feature                  | String                                                     | StringBuffer                                                  |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Mutability               | Immutable                                                  | Mutable                                                       |
| Thread Safety            | Not thread-safe                                            | Thread-safe                                                   |
| Performance              | Slower in concatenation and modification operations        | Faster in concatenation and modification operations           |
| Use Case                 | Suitable for fixed strings or when immutability is needed  | Suitable for strings that will undergo frequent modifications |
| Memory Allocation        | New memory is allocated for each modification              | Uses the same memory location for modifications               |
| String Pool              | Stored in the string pool if created without `new` keyword | Not stored in the string pool                                 |
| Methods for Modification | `concat()`, `substring()`, `replace()`, etc.               | `append()`, `insert()`, `delete()`, `reverse()`, etc.         |

</details>

<details>
<summary>What are the differences between StringBuffer and StringBuilder?</summary>

**StringBuffer**

StringBuffer provides functionality to work with the strings.
It is thread-safe (two threads can’t call the methods of StringBuffer simultaneously)
Comparatively slow as it is synchronized.
**StringBuilder**

StringBuilder is a class used to build a mutable string.
It is not thread-safe (two threads can call the methods concurrently)
Being non-synchronized, implementation is faster

</details>

<details>
<summary>How is the creation of a String using new() different from that of a literal?</summary>String using new() is different from the literal as when we declare string it stores the elements inside the stack memory whereas when it is declared using new() it allocates a dynamic memory in the heap memory. The object gets created in the heap memory even if the same content object is present.
</details>

<details>
<summary>What is an array in Java?</summary>
An Array in Java is a data structure that is used to store a fixed-size sequence of elements of the same type. Elements of an array can be accessed by their index, which starts from 0 and goes up to a length of minus 1. Array declaration in Java is done with the help of square brackets and size is also specified during the declaration. 
</details>

<details>
<summary>On which memory arrays are created in Java?</summary>Arrays in Java are created in heap memory. When an array is created with the help of a new keyword, memory is allocated in the heap to store the elements of the array. In Java, the heap memory is managed by the Java Virtual Machine(JVM) and it is also shared between all threads of the Java Program. The memory which is no longer in use by the program, JVM uses a garbage collector to reclaim the memory. Arrays in Java are created dynamically which means the size of the array is determined during the runtime of the program. The size of the array is specified during the declaration of the array and it cannot be changed once the array is created.
</details>

<details>
<summary>What is the difference between int array[] and int[] array?</summary>
Both int array[] and int[] array are used to declare an array of integers in java. The only difference between them is on their syntax no functionality difference is present between them.

int arr[] is a C-Style syntax to declare an Array.

int[] arr is a Java-Style syntax to declare an Array.

However, it is generally recommended to use Java-style syntax to declare an Array. As it is easy to read and understand also it is more consistent with other Java language constructs.

</details>

<details>
<summary>How to copy an array in Java?</summary>In Java there are multiple ways to copy an Array based on the requirements.

clone() method in Java: This method in Java is used to create a shallow copy of the given array which means that the new array will share the same memory as the original array.
int[] Arr = { 1, 2, 3, 5, 0};
int[] tempArr = Arr.clone();

arraycopy() method: To create a deep copy of the array we can use this method which creates a new array with the same values as the original array.
int[] Arr = {1, 2, 7, 9, 8};
int[] tempArr = new int[Arr.length];
System.arraycopy(Arr, 0, tempArr, 0, Arr.length);

copyOf() method: This method is used to create a new array with a specific length and copies the contents of the original array to the new array.
int[] Arr = {1, 2, 4, 8};
int[] tempArr = Arrays.copyOf(Arr, Arr.length);

copyOfRange() method: This method is very similar to the copyOf() method in Java, but this method also allows us to specify the range of the elements to copy from the original array.
int[] Arr = {1, 2, 4, 8};
int[] temArr = Arrays.copyOfRange(Arr, 0, Arr.length);

</details>

<details>
<summary>What do you understand by the jagged array?</summary>A jagged Array in Java is just a two-dimensional array in which each row of the array can have a different length. Since all the rows in a 2-d Array have the same length but a jagged array allows more flexibility in the size of each row. This feature is very useful in conditions where the data has varying lengths or when memory usage needs to be optimized.

Syntax:

int[][] Arr = new int[][] {
{1, 2, 8},
{7, 5},
{6, 7, 2, 6}
};

</details>



[Source](https://github.com/RupeshDev18/cheatsheet/blob/main/java.md)
