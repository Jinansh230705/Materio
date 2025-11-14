---
title: Data Analytics and Data Visualization Question Bank with Solutions
layout: post
date: '2025-07-30 20:18:32'
category: Resource
excerpt: "&#8206;"
summarize: true
semester: "5"
subject: "Data Analytics and Data Visualization"
---

## Short Answers
### **1. Explain the importance of data in modern decision-making processes.**  
**Answer:**  
Data is vital in today's decision-making because it provides a **factual basis** for analysis, rather than relying on intuition or guesswork. Key reasons include:  
- **Evidence-Based Decisions:** Data enables organizations to make informed choices.  
- **Trend Analysis:** Patterns in data help predict future outcomes.  
- **Improved Efficiency:** Data-driven insights optimize processes and reduce costs.  
- **Personalization:** Businesses use data to offer tailored services (e.g., Netflix or Amazon recommendations).  
- **Performance Measurement:** Data helps track progress via KPIs and metrics.

### **2. Define random variable and differentiate between discrete and continuous random variables.**  
**Answer:**  
A **random variable** is a variable whose outcome is determined by a random process.

- **Discrete Random Variable:**  
  - Takes countable values (e.g., number of students in a class).  
  - Example: Number of heads in 10 coin tosses.

- **Continuous Random Variable:**  
  - Takes infinite values within a range (e.g., weight, height, temperature).  
  - Example: Weight of a randomly selected person.

### 3. Compare the roles of a data analyst and a data scientist.  

**Answer:**

| Feature    | Data Analyst                      | Data Scientist                   |
|------------|---------------------------------|---------------------------------|
| **Focus**  | Descriptive and diagnostic analytics | Predictive and prescriptive analytics |
| **Tools**  | Excel, SQL, Tableau              | Python, R, Machine Learning     |
| **Goal**   | Identify trends and patterns     | Build models, make predictions  |
| **Skills** | Data cleaning, visualization     | Statistics, Machine Learning, Programming |
| **Example**| Create sales dashboards          | Predict customer churn rate     |


### 4. Define central tendency and explain its types.  


**Answer:**  
**Central tendency** refers to the central or typical value of a dataset.  
**Types include:**
- **Mean:** Arithmetic average.  
- **Median:** Middle value when data is sorted.  
- **Mode:** Most frequent value in the dataset.

### **5. Explain variance and standard deviation. How do they differ?**  
**Answer:**  
- **Variance (σ²):** Measures how far each data point is from the mean, on average.
  $$ \text{Variance} = \frac{\sum (x_i - \mu)^2}{N} $$  
- **Standard Deviation (σ):** Square root of variance.  
  $$ \sigma = \sqrt{\text{Variance}} $$  
- **Difference:** Variance gives result in squared units; standard deviation brings it to the original units.

### **6. Define probability and explain its role in data analytics.**  
**Answer:**  
**Probability** is a measure of the likelihood that an event will occur (between 0 and 1).  
In data analytics, probability helps:  
- **Model Uncertainty:** Predict outcomes in uncertain conditions.  
- **Statistical Inference:** Estimate population parameters using sample data.  
- **Risk Analysis:** Assess likelihood of possible risks.

### **7. How is the confidence interval estimated, and why is it important?**  
**Answer:**  
**Confidence Interval (CI)** provides a range of values within which the true population parameter lies with a certain confidence level (e.g., 95%).  

**Formula:**
$$
CI = \bar{x} \pm Z \left(\frac{\sigma}{\sqrt{n}}\right)
$$

- $$ \bar{x} $$: Sample mean  
- $$ Z $$: Z-score from normal distribution  
- $$ \sigma $$: Population standard deviation  
- $$ n $$: Sample size  

**Importance:**  
Gives an estimate with a degree of certainty, accounts for sample variability.

### **8. Describe the concept of the distribution of sample means.**  
**Answer:**  
The **distribution of sample means** (also called the **sampling distribution**) is the distribution formed by means of all possible samples from a population.

By the **Central Limit Theorem**:
- The sampling distribution of the mean will be approximately normal if the sample size is large enough.
- Mean of sampling distribution = population mean (μ)  
- Standard deviation = population standard deviation / √n (called **standard error**)

### **9. List three real-world applications of Python and explain their significance.**  
**Answer:**
1. **Web Development** – Using Django, Flask: Build dynamic websites (e.g., Instagram backend).  
2. **Data Science & AI** – With libraries like NumPy, Pandas, scikit-learn: Analyze data, build ML models.  
3. **Automation/Scripting** – Automating tasks like file handling, reporting (e.g., writing a Python script to send automated emails).

These applications make Python versatile and highly valuable across industries due to its simplicity, broad libraries, and community support.

### **10. Explain the relationship between confidence level, sample size, and margin of error.**  
**Answer:**
- **Confidence Level ↑ → Margin of Error ↑** (wider interval for more certainty)
- **Sample Size ↑ → Margin of Error ↓** (more precise estimate)
- **Margin of Error:** Indicates the level of uncertainty around the sample estimate.

$$
\text{Margin of Error} = Z \left(\frac{\sigma}{\sqrt{n}}\right)
$$

Larger samples give more accurate population estimates.

## Long Answers ( 4 Marks)

### **1. Find the population variance for the following set of data representing tree heights in feet: 3, 21, 98, 203, 17, 9.**

**Solution:**

Let the data be:  
x = {3, 21, 98, 203, 17, 9}

**Step 1: Find the mean (μ)**  
$$
\mu = \frac{3 + 21 + 98 + 203 + 17 + 9}{6} = \frac{351}{6} = 58.5
$$

**Step 2: Find the squared differences from the mean**  
$$
(3 - 58.5)^2 = 3080.25 \\
(21 - 58.5)^2 = 1416.25 \\
(98 - 58.5)^2 = 1580.25 \\
(203 - 58.5)^2 = 20880.25 \\
(17 - 58.5)^2 = 1722.25 \\
(9 - 58.5)^2 = 2450.25
$$

**Step 3: Compute variance**
$$
\sigma^2 = \frac{\sum (x_i - \mu)^2}{N} = \frac{3080.25 + 1416.25 + 1580.25 + 20880.25 + 1722.25 + 2450.25}{6} \\
= \frac{31129.5}{6} = 5188.25
$$

**Answer: Population variance = 5188.25 ft²**

### **2. There are 45 students in a class. 5 students were randomly selected and their weights (in kg) were: 51, 38, 79, 46, 57.**

**Solution:**

This is **sample data**, so use **sample mean and sample variance**.

**Step 1: Find mean**
$$
\bar{x} = \frac{51 + 38 + 79 + 46 + 57}{5} = \frac{271}{5} = 54.2 \text{ kg}
$$

**Step 2: Find squared differences**
$$
(51 - 54.2)^2 = 10.24 \\
(38 - 54.2)^2 = 262.44 \\
(79 - 54.2)^2 = 615.04 \\
(46 - 54.2)^2 = 67.24 \\
(57 - 54.2)^2 = 7.84
$$

**Step 3: Calculate sample variance and standard deviation**
$$
s^2 = \frac{\sum (x_i - \bar{x})^2}{n - 1} = \frac{962.8}{4} = 240.7 \\
s = \sqrt{240.7} \approx 15.5 \text{ kg} 
$$

**Answer:**
- Sample mean = 54.2 kg  
- Sample variance = 240.7 kg²  
- Sample standard deviation ≈ 15.5 kg

### **3. A population has mean 75 and standard deviation 12. Random samples of size 121 are taken.**

**(a) Find mean and standard deviation of the sample mean.**  
$$
\mu_{\bar{x}} = \mu = 75 \\
\sigma_{\bar{x}} = \frac{\sigma}{\sqrt{n}} = \frac{12}{\sqrt{121}} = \frac{12}{11} = 1.09
$$

**(b) If sample size = 400?**  
$$
\sigma_{\bar{x}} = \frac{12}{\sqrt{400}} = \frac{12}{20} = 0.6
$$

**Answer:**
- (a) Sample mean = 75, Sample std. dev. = 1.09  
- (b) If n=400, Sample std. dev. = 0.6

### **4. What are the measures of dispersion? How are they useful in data analysis?**

**Answer:**

**Measures of dispersion** describe the spread or variability in a dataset. Key types include:

- **Range:** Difference between highest and lowest value.
- **Variance:** Average squared deviation from the mean.
- **Standard Deviation:** Square root of variance; interpretable in original units.
- **Interquartile Range (IQR):** Difference between 75th and 25th percentile.

**Importance in Data Analysis:**
- Identify consistency and variability.
- Understand reliability of mean.
- Detect outliers and anomalies.
- Compare spread between different datasets.

### **5. A machine fills bottles with soda. A sample of 100 bottles showed mean = 2.01L, population σ = 0.05L. Find 90% confidence interval.**

**Solution:**

**Given:**
- $$ \bar{x} = 2.01 \text{ L},\ \sigma = 0.05 \text{ L},\ n = 100 $$
- For 90% CI, Z = 1.645

**CI formula:**
$$
CI = \bar{x} \pm Z \left( \frac{\sigma}{\sqrt{n}} \right) = 2.01 \pm 1.645 \times \frac{0.05}{10} \\
= 2.01 \pm 0.008225
$$

$$
\text{CI} = [2.0018,\ 2.0182] \text{ L}
$$

**Answer: 90% Confidence Interval = [2.0018 L, 2.0182 L]**

### **6. Survey of 81 households: mean bill = $110, σ = $15. Find 95% CI.**

**Given:**
- $$ \bar{x} = 110, \ \sigma = 15, \ n = 81 $$
- Z = 1.96 for 95%

$$
CI = 110 \pm 1.96 \times \frac{15}{\sqrt{81}} = 110 \pm 1.96 \times \frac{15}{9} \\
= 110 \pm 3.27
$$

**Answer: 95% Confidence Interval = [$106.73,\ 113.27$]**

### **7. Differentiate between discrete and continuous probability distributions. Give one example of each.**

**Answer:**

| Aspect | Discrete | Continuous |
|--------|----------|-------------|
| Takes values | Countable | Infinite within a range |
| Distribution | Probability Mass Function (PMF) | Probability Density Function (PDF) |
| Example | Binomial Distribution | Normal Distribution |

**Example:**
- **Discrete:** Number of customers entering a store.
- **Continuous:** Heights of students in a class.

### **8. Random samples of size 225 drawn from population with μ = 100, σ = 20. Find mean and standard deviation of sample mean.**

$$
\mu_{\bar{x}} = \mu = 100 \\
\sigma_{\bar{x}} = \frac{\sigma}{\sqrt{n}} = \frac{20}{\sqrt{225}} = \frac{20}{15} = 1.33
$$

**Answer:**
- Mean of sample means = 100  
- Std. dev. of sample mean = 1.33

### **9. Define range, variance, and standard deviation. How are they useful in data analysis?**

**Definitions:**
- **Range:** Max value – Min value.
- **Variance:** Average of squared differences from mean.
- **Standard Deviation:** Square root of variance.

**Use in analysis:**
- Shows how data is spread.
- High standard deviation means more variability.
- Critical for comparing datasets, risk assessment, and anomaly detection.

## Long Answers (5 Marks)
### **1. Define probability distribution. Explain its types with example.**

**Answer:**

A **probability distribution** is a function that provides the probabilities of occurrence of different possible outcomes in an experiment.

#### **Types of Probability Distributions:**

1. **Discrete Probability Distribution:**
   - Deals with discrete random variables (finite/countable outcomes).
   - Represented by **Probability Mass Function (PMF)**.
   - **Example: Binomial Distribution**
     - Tossing a coin 3 times: P(X = number of heads)

2. **Continuous Probability Distribution:**
   - Deals with continuous random variables (infinite outcomes in an interval).
   - Represented by **Probability Density Function (PDF)**.
   - **Example: Normal Distribution**
     - Heights of students follow a bell-shaped curve.

 **Key Differences:**
 
| Feature               | Discrete                     | Continuous                     |
|-----------------------|------------------------------|--------------------------------|
| Variable type         | Countable                   | Uncountably infinite           |
| Probability Function  | PMF                         | PDF                            |
| Example               | Poisson, Binomial           | Normal, Exponential            |


### **2. A sample of 49 students had a mean course completion time of 38 hours. Population standard deviation is 5 hours. Find 99% confidence interval for the mean.**

**Solution:**

**Given:**
- Sample mean, $$\bar{x} = 38$$  
- Population standard deviation, $$\sigma = 5$$  
- Sample size, $$n = 49$$  
- Z-value for 99% CI = 2.576

**Step 1: Standard error:**
$$
SE = \frac{\sigma}{\sqrt{n}} = \frac{5}{\sqrt{49}} = \frac{5}{7} = 0.714
$$

**Step 2: Margin of error:**
$$
ME = Z \times SE = 2.576 \times 0.714 = 1.839
$$

**Step 3: Confidence Interval:**
$$
CI = \bar{x} \pm ME = 38 \pm 1.839 = [36.161,\ 39.839]
$$

 **Answer: 99% Confidence Interval = [36.161, 39.839] hours**

### **3. Explain how Python is used in Data Science, Artificial Intelligence, and Web Development. Discuss examples and libraries.**

**Answer:**

Python's simplicity, rich libraries, and active community make it ideal for various tech domains:

#### **1. Data Science**  
Used for data processing, analysis, visualization.  
**Libraries:**
- **Pandas** – For data manipulation  
- **NumPy** – Numeric computations  
- **Matplotlib / Seaborn** – Data visualization  
**Example:** Analyze sales data and generate graphs.

#### **2. Artificial Intelligence**  
Used to build ML and deep learning models.  
**Libraries:**
- **Scikit-learn** – ML algorithms (classification, regression)  
- **TensorFlow / PyTorch** – Deep learning  
**Example:** Predict house prices, classify emails as spam.

#### **3. Web Development**  
Used to develop backends and dynamic websites.  
**Libraries/Frameworks:**
- **Flask** and **Django** – Web frameworks  
**Example:** Build a blog website or e-commerce platform backend.

 **Conclusion:** Python’s versatility enables integration between data handling, AI logic, and deployment via web interfaces.

### **4. Differentiate between population and sample statistics. Explain formulas for population mean and variance with example.**

**Answer:**

| Feature        | Population                         | Sample                             |
|----------------|-------------------------------------|-------------------------------------|
| Data           | Entire group                        | Subset of the population            |
| Size notation  | $$N$$                               | $$n$$                               |
| Mean notation  | $$\mu$$ (mu)                       | $$\bar{x}$$                         |
| Variance       | $$\sigma^2 = \frac{\sum (x_i - \mu)^2}{N}$$ | $$s^2 = \frac{\sum (x_i - \bar{x})^2}{n-1}$$ |

#### **Example:**

Population data: {2, 5, 7, 9, 10}

- **Mean (μ):**
$$
\mu = \frac{2 + 5 + 7 + 9 + 10}{5} = \frac{33}{5} = 6.6
$$

- **Variance (σ²):**
$$
\sigma^2 = \frac{(2 - 6.6)^2 + (5 - 6.6)^2 + \dots + (10 - 6.6)^2}{5} \\
= \frac{21.16 + 2.56 + 0.16 + 5.76 + 11.56}{5} = \frac{41.2}{5} = 8.24
$$

 **Answer:**
- Population Mean = 6.6  
- Population Variance = 8.24

### **5. Explain in detail how confidence intervals are constructed. Derive the formula and interpret a numerical result.**

**Answer:**

A **confidence interval (CI)** gives a range of values within which the true population parameter is likely to fall, with a certain confidence level (e.g., 95%).

#### **Confidence Interval Formula (for large sample or known σ):**
$$
CI = \bar{x} \pm Z \left(\frac{\sigma}{\sqrt{n}}\right)
$$

Where:
- $$\bar{x}$$ = sample mean  
- $$Z$$ = Z-score based on confidence level  
- $$\sigma$$ = population standard deviation  
- $$n$$ = sample size

#### **Steps:**
1. Compute standard error:  
   $$ SE = \frac{\sigma}{\sqrt{n}} $$
2. Find margin of error (ME):  
   $$ ME = Z \cdot SE $$
3. Apply the CI formula.

#### **Numerical Example:**
Sample mean $$\bar{x} = 80$$, σ = 10, n = 64, 95% CI (Z = 1.96)

1. $$ SE = \frac{10}{8} = 1.25 $$
2. $$ ME = 1.96 \cdot 1.25 = 2.45 $$
3. $$ CI = 80 \pm 2.45 = [77.55,\ 82.45] $$

 **Interpretation:** We are 95% confident that the true population mean lies between 77.55 and 82.45.

### **6. Why is data considered a valuable asset for organizations?**

**Answer:**

Data is often called the “new oil” due to its importance in driving modern business decisions.

#### **Reasons why data is a valuable asset:**
1. **Informed Decision-Making:** Data supports evidence-based strategies.
   - E.g., Amazon uses customer behavior data to improve suggestions.

2. **Efficiency & Cost Reduction:** Helps automate processes and avoid waste.
   - E.g., Predictive maintenance in manufacturing.

3. **Customer Insights & Personalization:**
   - Tailors services to individual preferences (Netflix, Spotify).

4. **Competitive Advantage:**
   - Data-driven firms outperform others.

5. **Risk Management:**
   - Fraud detection, credit scoring using data analytics.

 **Conclusion:** Proper use of data empowers smarter, faster, and more accurate decisions across all sectors.

### **7. What are the measures of dispersion? How are they useful in data analysis?**

**Answer:**

**Measures of dispersion** indicate how data points in a dataset are spread or scattered around the central value.

#### **Main Types:**
1. **Range = Max – Min**  
2. **Variance (σ² or s²):**  
   - Shows average of squared deviations from mean.  
3. **Standard Deviation (σ or s):**  
   - Square root of variance; used widely due to interpretable units.
4. **Interquartile Range (IQR):**  
   - Spread of middle 50% data = Q3 – Q1

#### **Importance in Data Analysis:**
- **Detect Variability:** High dispersion → low consistency
- **Compare Datasets:** One dataset may have the same mean but higher variance.
- **Identify Outliers:** Dispersion helps flag anomalies.
- **Improve Predictions:** Tight dispersion leads to better models.

**Conclusion:** Dispersion measures are essential for determining data reliability, variability, and comparisons.
