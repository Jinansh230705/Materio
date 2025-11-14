---
title: DADV Assigmnent - 2 Solutions
layout: post
date: '2025-07-25 15:36:09'
category: Resource
excerpt: This resource provides with the solutions of the questions given in the assignment
  - 2 of Data Analytics and Data Visualization.
image: "/assets/img/covers/dadv-2.webp"
previous_post: "/resource/dadv-assignment-1-with-solutions/"
next_post: "/resource/data-analytics-and-data-analysis-question-bank-with-solutions/"
author: Jinansh - Materio
summarize: true
semester: "5"
subject: "Data Analytics and Data Visualization"
---

### 1. What do you mean by Python? Give the importance of Python.

**Answer:**

Python is a high-level, interpreted, and general-purpose programming language known for its easy-to-read syntax and versatility. It supports multiple programming paradigms such as procedural, object-oriented, and functional programming.

**Importance of Python:**
- Easy to learn and use due to its simple syntax.
- Large standard library and extensive third-party modules.
- Widely used in data science, web development, automation, artificial intelligence, and machine learning.
- Cross-platform compatibility.
- Strong community support and constant development.

### 2. Define terms: Pandas, Numpy.

**Answer:**

- **Pandas:** A powerful Python library for data manipulation and analysis. It provides data structures like DataFrame and Series for handling structured data, making it easy to clean, analyze, and visualize data.

- **Numpy:** Stands for Numerical Python. It is a fundamental library for numerical computations in Python, providing support for arrays, matrices, and high-level mathematical functions.

### 3. What do you mean by statistics? Give the major types of statistics.

**Answer:**

Statistics is the science of collecting, analyzing, interpreting, presenting, and organizing data.

**Major types:**
- **Descriptive Statistics:** Summarizes or describes characteristics of a data set (mean, median, mode, variance).
- **Inferential Statistics:** Makes inferences and predictions about a population based on a sample.

### 4. Explain Mean, Median, and Mode with Example.

**Answer:**

- **Mean:** Average of data. Sum all data points and divide by the number of points.
  
  Example: Data = 2, 3, 4  
  Mean = (2 + 3 + 4)/3 = 3

- **Median:** Middle value when data sorted in order.
  
  Example: Data = 1, 3, 5 (Median = 3)
  
  If even number of data points, median = average of two middle numbers.

- **Mode:** Most frequently occurring value in the data.
  
  Example: Data = 2, 2, 3, 4, 4, 4  
  Mode = 4

### 5. Define terms with example: Range, Variance, Standard Deviation

**Answer:**

- **Range:** Difference between the maximum and minimum values.
  
  Example: Data = 5, 8, 12  
  Range = 12 - 5 = 7

- **Variance:** Average of the squared differences from the Mean.
  
  Example: Data = 1, 2, 3  
  Mean = 2  
  Variance = [(1-2)² + (2-2)² + (3-2)²] / 3 = (1+0+1)/3 = 0.67

- **Standard Deviation:** Square root of variance; measures data spread.
  
  Example: For above data standard deviation = √0.67 ≈ 0.82

### 6. What is a variable and give the different types of variables?

**Answer:**

A variable is a characteristic or attribute that can assume different values.

**Types:**
- **Qualitative (Categorical):** Descriptive, non-numeric (e.g., gender, color).
- **Quantitative (Numerical):**
  - Discrete: Countable values (e.g., number of children).
  - Continuous: Any value in a range (e.g., height, weight).

### 7. Explain Levels of data measurements.

**Answer:**

- **Nominal:** Categories without order (e.g., colors, gender).
- **Ordinal:** Categories with order but no consistent difference (e.g., ranks).
- **Interval:** Numeric scales with equal intervals but no true zero (e.g., temperature in Celsius).
- **Ratio:** Numeric with meaningful zero; allows ratio comparisons (e.g., weight, height).

### 8. Explain terms with example: Sample and population

**Answer:**

- **Population:** Entire set of subjects or data of interest.
  
  Example: All students in a university.

- **Sample:** A subset of the population selected for analysis.
  
  Example: 100 students selected randomly from the university.

### 9. Explain types of sampling methods.

**Answer:**

- **Random Sampling:** Every individual has an equal chance.
- **Systematic Sampling:** Selecting every kth individual.
- **Stratified Sampling:** Dividing population into strata and sampling from each.
- **Cluster Sampling:** Randomly selecting entire clusters/groups.
- **Convenience Sampling:** Selecting easily available samples (non-random).
- **Quota Sampling:** Selecting samples to meet quotas from subgroups.

### 10. Explain sampling distribution.

**Answer:**

Sampling distribution is the probability distribution of a statistic (e.g., mean) over many samples from the same population. It describes how the sample statistic varies from sample to sample.

### 11. What do you mean by Confidence interval?

**Answer:**

A confidence interval is a range of values, derived from sample statistics, that is likely to contain the population parameter with a certain confidence level (e.g., 95%).

### 12. Find the population variance and population standard deviation of the age of the children in a family of five: 16, 11, 9, 8, 1

**Solution:**

Step 1: Find mean  
Mean = (16 + 11 + 9 + 8 + 1)/5 = 45/5 = 9

Step 2: Find squared differences  
(16-9)² = 49  
(11-9)² = 4  
(9-9)² = 0  
(8-9)² = 1  
(1-9)² = 64

Step 3: Population variance (σ²)  
= (49 + 4 + 0 + 1 + 64)/5 = 118 / 5 = 23.6

Step 4: Population standard deviation (σ)  
= √23.6 ≈ 4.86

### 13. Find the population variance for the following tree heights (feet): 3, 21, 98, 203, 17, 9

**Solution:**

Step 1: Mean  
= (3 + 21 + 98 + 203 + 17 + 9) / 6 = 351 / 6 = 58.5

Step 2: Squared differences  
(3 - 58.5)² = 3090.25  
(21 - 58.5)² = 1406.25  
(98 - 58.5)² = 1560.25  
(203 - 58.5)² = 20820.25  
(17 - 58.5)² = 1712.25  
(9 - 58.5)² = 2430.25

Step 3: Sum squared differences  
= 3090.25 + 1406.25 + 1560.25 + 20820.25 + 1712.25 + 2430.25 = 31019.5

Step 4: Population variance  
= 31019.5 / 6 = 5169.92

### 14. There are 45 students in a class. 5 students randomly selected with weights: 51, 38, 79, 46, 57. Calculate sample standard deviation.

**Solution:**

Step 1: Find sample mean  
Mean = (51 + 38 + 79 + 46 + 57) / 5 = 271 / 5 = 54.2

Step 2: Squared differences  
(51 - 54.2)² = 10.24  
(38 - 54.2)² = 262.44  
(79 - 54.2)² = 615.04  
(46 - 54.2)² = 67.24  
(57 - 54.2)² = 7.84

Step 3: Sum squared differences  
= 10.24 + 262.44 + 615.04 + 67.24 + 7.84 = 962.8

Step 4: Sample variance (s²)  
= 962.8 / (5 - 1) = 962.8 / 4 = 240.7

Step 5: Sample standard deviation (s)  
= √240.7 ≈ 15.51 kg

### 15. Calculate sample standard deviation and sample variance for the data: 4, 7, 9, 10, 16

**Solution:**

Step 1: Mean  
= (4 + 7 + 9 + 10 + 16) / 5 = 46 / 5 = 9.2

Step 2: Squared differences  
(4 - 9.2)² = 27.04  
(7 - 9.2)² = 4.84  
(9 - 9.2)² = 0.04  
(10 - 9.2)² = 0.64  
(16 - 9.2)² = 46.24

Step 3: Sum squared differences  
= 27.04 + 4.84 + 0.04 + 0.64 + 46.24 = 78.8

Step 4: Sample variance (s²)  
= 78.8 / (5 - 1) = 78.8 / 4 = 19.7

Step 5: Sample standard deviation (s)  
= √19.7 ≈ 4.44
