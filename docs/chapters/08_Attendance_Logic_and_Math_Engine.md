# PART 8 — ATTENDANCE LOGIC & MATHEMATICAL ENGINE

---

## 8.1 The Mathematics of Attendance Management

At the heart of AttendX is a deterministic, mathematically rigorous attendance engine implemented in [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts). 

University attendance policies are legally binding contractual frameworks governed by academic ordinances. A single percentage error (e.g., displaying $75.1\%$ when true attendance is $74.9\%$) can unlawfully debar a student from end-semester examinations or falsely lead a student to miss a class believing they were safe. AttendX eliminates rounding errors and Simpson's Paradox through exact discrete integer formulation.

```
+----------------------------------------------------------------------------------------------------+
|                                    ATTENDX MATHEMATICAL VARIABLES                                  |
+----------------------------------------------------------------------------------------------------+
|   SYMBOL   |   VARIABLE DEFINITION                   |   ATTENDX PROJECT CODE REFERENCE            |
|   A        |   Total Units Attended (PRESENT)        |   records.filter(r => r.status === "PRESENT")|
|   C        |   Total Units Conducted (PRESENT+ABSENT)|   A + records.filter(r => r.status==="ABSENT")|
|   P        |   Current Aggregate Percentage (%)      |   (A / C) * 100                             |
|   T        |   Mandatory Minimum Threshold (e.g. 75%)|   profile.attendanceThreshold / 100 (= 0.75)    |
|   S        |   Safe Absences (Integer classes)       |   calculateMetrics().safeAbsences           |
|   R        |   Recovery Classes Needed (Integer)     |   calculateMetrics().recoveryNeeded75       |
|   X        |   Cancelled Classes (Excluded from C)   |   records.filter(r=> r.status==="CANCELLED")|
+----------------------------------------------------------------------------------------------------+
```

---

## 8.2 Primary Mathematical Formulations

### 1. The Core Attendance Percentage Formula
$$\text{Attendance Percentage } (P) = \left( \frac{A}{C} \right) \times 100$$
- **Important Invariant:** Cancelled classes ($X$) are **excluded** from both the numerator ($A$) and denominator ($C$).
- **Zero-Class Boundary Condition:** If $C = 0$ (e.g. beginning of the semester before any lecture is held), $P = 100.0\%$.

---

### 2. The Safe Absences Formula (Predictive Margin)
*Question Answered: "How many consecutive upcoming classes ($x$) can a student miss while ensuring their final percentage remains at or above threshold $T$?"*

$$\frac{A}{C + x} \ge T$$

Multiplying both sides by $(C + x)$:
$$A \ge T \times (C + x)$$
$$A \ge (T \times C) + (T \times x)$$
$$A - (T \times C) \ge T \times x$$
$$x \le \frac{A - (T \times C)}{T}$$

Because classes occur in discrete integer quantities, we apply the **floor** function ($\lfloor \dots \rfloor$):

$$\text{Safe Absences } (S) = \max\left( 0, \; \left\lfloor \frac{A - (T \times C)}{T} \right\rfloor \right)$$

*If $P < T$, the student has a shortage; safe absences is strictly $0$.*

---

### 3. The Recovery Classes Needed Formula (Corrective Roadmap)
*Question Answered: "If a student's attendance is currently below threshold $T$ ($P < T$), how many consecutive future classes ($y$) must the student attend without missing any to restore compliance?"*

$$\frac{A + y}{C + y} \ge T$$

Multiplying both sides by $(C + y)$:
$$A + y \ge T \times (C + y)$$
$$A + y \ge (T \times C) + (T \times y)$$
$$y - (T \times y) \ge (T \times C) - A$$
$$y(1 - T) \ge (T \times C) - A$$
$$y \ge \frac{(T \times C) - A}{1 - T}$$

Because attending a fractional class is impossible, we apply the **ceiling** function ($\lceil \dots \rceil$):

$$\text{Recovery Needed } (R_{75}) = \max\left( 0, \; \left\lceil \frac{(T \times C) - A}{1 - T} \right\rceil \right)$$

*For $T = 0.75$, the denominator is $(1 - 0.75) = 0.25$. Therefore, each attended class recovers $0.25$ units against the deficit.*

---

### 4. Recovery to 80% Buffer (Dean's List / Margin of Safety)
Students aiming for high safety frequently target $80\%$ rather than the borderline $75\%$. AttendX computes $R_{80}$:

$$\text{Recovery to 80\% } (R_{80}) = \max\left( 0, \; \left\lceil \frac{(0.80 \times C) - A}{1 - 0.80} \right\rceil \right)$$

---

### 5. What-If Interactive Attendance Simulation
When using the Smart Calculator slider:
$$P_{\text{simulated}} = \left( \frac{A + A_{\text{future}}}{C + A_{\text{future}} + M_{\text{future}}} \right) \times 100$$
Where:
- $A_{\text{future}}$ = Number of future lectures student plans to attend.
- $M_{\text{future}}$ = Number of future lectures student plans to miss.

---

## 8.3 Avoiding Simpson's Paradox: Theory vs. Practical Aggregation

A common bug in commercial LMS and naive attendance apps is **averaging percentages**:
$$\text{Flawed Overall Percentage} = \frac{\% \text{ Theory} + \% \text{ Lab}}{2} \quad \text{--- WRONG!}$$

### Why Percentage Averaging Is Flawed:
Consider a student:
- **Theory Lectures:** 40 Conducted, 30 Attended $\rightarrow 30/40 = 75.0\%$
- **Lab Sessions:** 4 Conducted, 2 Attended $\rightarrow 2/4 = 50.0\%$
- If you average the percentages: $\frac{75.0 + 50.0}{2} = \mathbf{62.5\%}$
- **True Physical Reality:**  
  $$\text{Total Attended} = 30 + 2 = 32$$  
  $$\text{Total Conducted} = 40 + 4 = 44$$  
  $$\text{True Aggregate Percentage} = \frac{32}{44} \times 100 = \mathbf{72.72\%}$$

**The Error:** Averaging percentages distorts the calculation by giving a single 4-session lab equal weight to 40 theory lectures!

### AttendX's Solution:
In [`src/lib/attendanceCalculator.ts`](file:///d:/AttendX/src/lib/attendanceCalculator.ts#L96-L98):
```ts
// Combined metrics MUST use raw aggregate units, NEVER an average of percentages!
const combinedMetrics = calculateMetrics(subjectRecords, threshold);
```
AttendX always aggregates raw integer units ($A$ and $C$) across all categories before evaluating ratios.

---

## 8.4 Concrete Worked Numerical Examples

---

### Case Study 1: The Compliant Student (Safe Absences Available)
- **Student Profile:** AARYAN (ECE SEC-A)
- **Threshold ($T$):** $75\%$ ($0.75$)
- **Conducted ($C$):** $60$ classes
- **Attended ($A$):** $52$ classes
- **Absences:** $8$ classes

**Step 1: Calculate Percentage ($P$)**
$$P = \frac{52}{60} \times 100 = \mathbf{86.67\%} \quad (\text{Status: Green / Safe})$$

**Step 2: Calculate Safe Absences ($S$)**
$$S = \left\lfloor \frac{52 - (0.75 \times 60)}{0.75} \right\rfloor = \left\lfloor \frac{52 - 45}{0.75} \right\rfloor = \left\lfloor \frac{7}{0.75} \right\rfloor = \lfloor 9.333 \rfloor = \mathbf{9 \text{ classes}}$$

**Interpretation:** Aaryan can miss **9 consecutive upcoming classes**. If he misses 9 classes:
$$P_{\text{new}} = \frac{52}{60 + 9} = \frac{52}{69} = 75.36\% \ge 75\%$$
*If he misses 10 classes:*
$$P_{\text{new}} = \frac{52}{60 + 10} = \frac{52}{70} = 74.28\% < 75\% \quad (\text{Shortage!})$$
*The formula's floor operation proved mathematically exact.*

---

### Case Study 2: The Debarment Risk Student (Recovery Needed)
- **Student Profile:** NITIN (Shortage Scenario)
- **Threshold ($T$):** $75\%$ ($0.75$)
- **Conducted ($C$):** $50$ classes
- **Attended ($A$):** $32$ classes
- **Absences:** $18$ classes

**Step 1: Calculate Percentage ($P$)**
$$P = \frac{32}{50} \times 100 = \mathbf{64.00\%} \quad (\text{Status: Red / Danger Alert})$$

**Step 2: Calculate Recovery Needed to 75% ($R_{75}$)**
$$R_{75} = \left\lceil \frac{(0.75 \times 50) - 32}{1 - 0.75} \right\rceil = \left\lceil \frac{37.5 - 32}{0.25} \right\rceil = \left\lceil \frac{5.5}{0.25} \right\rceil = \lceil 22.0 \rceil = \mathbf{22 \text{ classes}}$$

**Interpretation:** Nitin must attend **22 consecutive upcoming classes** without a single absence to cross $75\%$:
$$P_{\text{recovered}} = \frac{32 + 22}{50 + 22} = \frac{54}{72} = \mathbf{75.00\%} \ge 75\%$$

---

## 8.5 Client vs. Server Calculation Architecture

| Architectural Concern | AttendX Implementation | Evaluator Rationale |
| :--- | :--- | :--- |
| **Execution Location** | Pure Client-Side (`attendanceCalculator.ts`) | Zero network latency; interactive 60fps sliders |
| **Network Overhead** | Minimal (no HTTP calls on attendance marking) | Operates smoothly in low-connectivity lecture halls |
| **Deterministic Consistency**| Same pure TypeScript function used in testing | Unit tests verify math identically across client & server |
| **Data Integrity** | State hydrated from immutable log records | Prevents divergence between visual stats and recorded data |
