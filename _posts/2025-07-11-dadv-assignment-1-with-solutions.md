---
title: DADV Assignment - 1 with Solutions
layout: post
category: Resource
excerpt: This respurce provides with the solution of the questions given in assignment
  - 1 of data analysis and data visualization
author: Jinansh - Materio
date: '2025-07-11 17:54:26'
image: /assets/img/covers/dadv_cover.webp
next_post: "/resource/dadv-assigmnent-2-solutions/"
summarize: true
semester: "5"
subject: "Data Analytics and Data Visualization"
---

## 1. Define Terms: Variable, Measurements, Data

- **Variable**: A variable is a characteristic, number, or quantity that can be measured or counted. It can take different values for different individuals or items. Examples include age, height, income, or temperature.
- **Measurements**: Measurements refer to the process of assigning numbers or values to variables according to specific rules. It is the act of quantifying a variable using standard units.
- **Data**: Data are the collected values of variables, obtained through measurements or observations. Data can be qualitative (descriptive) or quantitative (numerical).


## 2. How Does Data Add Value to Business? (With Example)

Data adds value to a business by enabling informed decision-making, optimizing operations, improving customer experience, and identifying new opportunities. For example, a retail company can analyze customer purchase data to understand buying patterns and preferences. This insight helps the company stock popular products, tailor marketing campaigns, and increase sales, ultimately boosting profitability.

## 3. What is the Importance of Data?

- Facilitates evidence-based decision-making.
- Identifies trends and patterns for strategic planning.
- Enhances operational efficiency.
- Supports innovation and product development.
- Improves customer satisfaction by personalizing services.


## 4. Define Data Analytics and Its Types

**Data Analytics** is the process of examining raw data to draw meaningful insights, identify patterns, and support decision-making.

**Types of Data Analytics:**

- **Descriptive Analytics**: Summarizes historical data to understand what has happened.
- **Diagnostic Analytics**: Examines data to understand why something happened.
- **Predictive Analytics**: Uses data and statistical models to forecast future outcomes.
- **Prescriptive Analytics**: Recommends actions based on data to achieve desired outcomes.


## 5. Importance of Data Analytics

- Helps organizations make better decisions.
- Identifies inefficiencies and areas for improvement.
- Predicts future trends and behaviors.
- Enhances customer targeting and personalization.
- Supports risk management and fraud detection.


## 6. Define Data Analysis

Data analysis is the process of systematically applying statistical and logical techniques to describe, summarize, and compare data, with the goal of discovering useful information, drawing conclusions, and supporting decision-making.

## 7. Difference Between Data Analysis and Data Analytics

| Aspect | Data Analysis | Data Analytics |
| :-- | :-- | :-- |
| Focus | Examining data to extract insights | Broader process including analysis, modeling, and prediction |
| Scope | Part of analytics | Encompasses data collection, processing, analysis, and interpretation |
| Tools \& Techniques | Statistical methods, visualization | Includes advanced analytics, machine learning, AI |
| Objective | Understand data | Drive business strategies and decisions |

## 8. Elements of Data Analytics

- **Data Collection**: Gathering relevant data from various sources.
- **Data Cleaning**: Removing errors and inconsistencies.
- **Data Exploration**: Understanding data characteristics.
- **Data Modeling**: Applying statistical or machine learning models.
- **Data Interpretation**: Drawing conclusions and making recommendations.
- **Data Visualization**: Presenting findings in graphical formats.


## 9. Comparison Between Data Analyst and Data Scientist

| Criteria | Data Analyst | Data Scientist |
| :-- | :-- | :-- |
| Role | Analyzes and interprets data | Builds models, predicts outcomes, solves complex problems |
| Skills | Statistics, Excel, SQL, visualization tools | Programming, machine learning, advanced analytics |
| Tools | Excel, Tableau, Power BI | Python, R, Hadoop, TensorFlow |
| Output | Reports, dashboards, summaries | Predictive models, algorithms, advanced insights |
| Focus | Past and present data | Future predictions and advanced solutions |

<div style="text-align: center">⁂</div>
<div class="newtopic"></div>

# Assignment - 2

## Q.1 Why is Python a Preferred Language for Data Analysis and Statistical Computing?  
**Answer:**

Python is widely used in data analysis and statistical computing due to the following key features:

1. **Rich Libraries and Ecosystem:**  
   Python offers powerful libraries like NumPy (numerical operations), Pandas (data manipulation), Matplotlib & Seaborn (visualization), and SciPy (scientific computing), making data processing, statistical analysis, and visualization efficient and straightforward.
2. **Ease of Learning and Use:**  
   Python's simple, readable syntax enables users—even beginners—to write, debug, and maintain code efficiently. This accelerates the development process and lowers the learning curve.
3. **Community Support and Integration:**  
   Python has a large, active community that constantly develops libraries, provides documentation, and offers support. Plus, it easily integrates with other languages/tools (like R, C/C++ or SQL) and platforms.

## Q.2 Python Script to Load and Preview a CSV Dataset  
**Answer:**  

```PYTHON
import pandas as pd

# Load the dataset from 'data.csv'
df = pd.read_csv('data.csv')

# Display the first five rows
print(df.head())
```
*This script loads a dataset using Pandas and prints the top 5 rows for initial inspection.*

## Q.3 Measures of Central Tendency and Dispersion: Definition & Importance  
**Answer:**

**Central Tendency:**
- **Mean:** The arithmetic average, calculated as sum of all data points divided by their count. It represents the data’s central value.
- **Median:** The middle value when data is sorted. It is less sensitive to outliers, providing a robust center for skewed distributions.
- **Mode:** The value(s) that occur most frequently. Useful for categorical data or distributions with peaks.

*Importance:* Helps summarize large data sets with a single representative value, aiding in data understanding and comparisons.

**Dispersion:**
- **Range:** Difference between maximum and minimum values.
- **Variance:** The average squared deviation from the mean, indicating how much data points spread out.
- **Standard Deviation:** The square root of variance. It shows average deviation from the mean in the same units as the data.

*Importance:* Measures how much data varies, helping assess data reliability, consistency, and detect outliers.

## Q.4 Calculating Mean, Median, Mode, Variance, and Standard Deviation for the Given Dataset  
**Dataset:**  
4, 8, 6, 5, 3, 8, 9, 10, 6, 74, 8, 6, 5, 3, 8, 9, 10, 6, 74, 8, 6, 5, 3, 8, 9, 10, 6, 7

**Step 1: Organize the dataset (n = 28):**  


- **Mean:**  
  Sum = 320, Count = 28  
  Mean = 320 / 28 = **11.43**

- **Median:**  
  Sorted:   
  The 14th and 15th values: both are 6 and 7. (if correct order, positions 14 & 15 → 6, 7)
  Median = (6 + 7) / 2 = **6.5**

- **Mode:**  
  Most frequent value = 6 (appears 7 times) ⇒ **Mode = 6**

- **Variance and Standard Deviation:**  
  (Assume it’s a sample unless specified)
  $$
  \text{Variance (s}^2\text{)} = \frac{\sum (x_i - \overline{x})^2}{n-1}
  $$
  $$
  \overline{x} = 11.43
  $$
  After calculating squared deviations:
  - Sum of squared deviations = 6920.158
  - Sample size: n = 28
  $$
  s^2 = \frac{6920.158}{27} \approx 256.3
  $$
  $$
  \text{Standard deviation (s)} = \sqrt{256.3} \approx 16.01
  $$

**Summary Table:**

| Measure         | Value    |
|-----------------|----------|
| Mean            | 11.43    |
| Median          | 6.5      |
| Mode            | 6        |
| Variance        | 256.3    |
| Std. Deviation  | 16.01    |

## Q.5 Difference Between Population Variance and Sample Variance  
**Answer:**

- **Population Variance:**  
  Computes the average of the squared differences from the Mean for all members of a population.
  $$
  \sigma^2 = \frac{\sum (x_i - \mu)^2}{N}
  $$
- **Sample Variance:**  
  Estimates variance from a subset (sample) of a population. Uses N-1 (degrees of freedom) to reduce bias.
  $$
  s^2 = \frac{\sum (x_i - \bar{x})^2}{n-1}
  $$
- **Importance of the Difference:**  
  Using N-1 in sample variance corrects underestimation of variability when sampling from a larger population, making results more accurate and representative.

<div style="text-align: center">⁂</div>