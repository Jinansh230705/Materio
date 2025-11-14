---
title: Design and Analysis of Algorithms Psuedo Codes
layout: post
date: '2025-08-02 11:00:26'
excerpt: This resource covers all the psuedo codes of sorting, searching and greedy algorithms like krushkals, prims,knapsack problem etc.
summarize: true
category: Programming
semester: "5"
subject: "Design and Analysis of Algorithms"
---
# Algorithm Pseudocodes

## Sorting Algorithms

### 1. Bubble Sort
```
ALGORITHM BubbleSort(arr)
INPUT: Array arr of n elements
OUTPUT: Sorted array in ascending order

BEGIN
    n = length(arr)
    FOR i = 0 TO n-2 DO
        FOR j = 0 TO n-2-i DO
            IF arr[j] > arr[j+1] THEN
                SWAP arr[j] and arr[j+1]
            END IF
        END FOR
    END FOR
    RETURN arr
END
```

### 2. Selection Sort
```
ALGORITHM SelectionSort(arr)
INPUT: Array arr of n elements
OUTPUT: Sorted array in ascending order

BEGIN
    n = length(arr)
    FOR i = 0 TO n-2 DO
        min_idx = i
        FOR j = i+1 TO n-1 DO
            IF arr[j] < arr[min_idx] THEN
                min_idx = j
            END IF
        END FOR
        SWAP arr[i] and arr[min_idx]
    END FOR
    RETURN arr
END
```

### 3. Insertion Sort
```
ALGORITHM InsertionSort(arr)
INPUT: Array arr of n elements
OUTPUT: Sorted array in ascending order

BEGIN
    n = length(arr)
    FOR i = 1 TO n-1 DO
        key = arr[i]
        j = i - 1
        WHILE j >= 0 AND arr[j] > key DO
            arr[j+1] = arr[j]
            j = j - 1
        END WHILE
        arr[j+1] = key
    END FOR
    RETURN arr
END
```

### 4. Quick Sort
```
ALGORITHM QuickSort(arr, low, high)
INPUT: Array arr, starting index low, ending index high
OUTPUT: Sorted array in ascending order

BEGIN
    IF low < high THEN
        pi = Partition(arr, low, high)
        QuickSort(arr, low, pi-1)
        QuickSort(arr, pi+1, high)
    END IF
END

ALGORITHM Partition(arr, low, high)
BEGIN
    pivot = arr[high]
    i = low - 1
    FOR j = low TO high-1 DO
        IF arr[j] <= pivot THEN
            i = i + 1
            SWAP arr[i] and arr[j]
        END IF
    END FOR
    SWAP arr[i+1] and arr[high]
    RETURN i + 1
END
```

### 5. Merge Sort
```
ALGORITHM MergeSort(arr, left, right)
INPUT: Array arr, left index, right index
OUTPUT: Sorted array in ascending order

BEGIN
    IF left < right THEN
        mid = (left + right) / 2
        MergeSort(arr, left, mid)
        MergeSort(arr, mid+1, right)
        Merge(arr, left, mid, right)
    END IF
END

ALGORITHM Merge(arr, left, mid, right)
BEGIN
    n1 = mid - left + 1
    n2 = right - mid
    CREATE leftArr[n1] and rightArr[n2]
    
    FOR i = 0 TO n1-1 DO
        leftArr[i] = arr[left + i]
    END FOR
    FOR j = 0 TO n2-1 DO
        rightArr[j] = arr[mid + 1 + j]
    END FOR
    
    i = 0, j = 0, k = left
    WHILE i < n1 AND j < n2 DO
        IF leftArr[i] <= rightArr[j] THEN
            arr[k] = leftArr[i]
            i = i + 1
        ELSE
            arr[k] = rightArr[j]
            j = j + 1
        END IF
        k = k + 1
    END WHILE
    
    WHILE i < n1 DO
        arr[k] = leftArr[i]
        i = i + 1
        k = k + 1
    END WHILE
    
    WHILE j < n2 DO
        arr[k] = rightArr[j]
        j = j + 1
        k = k + 1
    END WHILE
END
```

## Search Algorithm

### 6. Binary Search
```
ALGORITHM BinarySearch(arr, target)
INPUT: Sorted array arr, target element to search
OUTPUT: Index of target element or -1 if not found

BEGIN
    left = 0
    right = length(arr) - 1
    
    WHILE left <= right DO
        mid = (left + right) / 2
        IF arr[mid] = target THEN
            RETURN mid
        ELSE IF arr[mid] < target THEN
            left = mid + 1
        ELSE
            right = mid - 1
        END IF
    END WHILE
    
    RETURN -1  // Element not found
END
```

## Graph Algorithms

### 7. Kruskal's Algorithm (Minimum Spanning Tree)
```
ALGORITHM Kruskal(graph)
INPUT: Graph G = (V, E) with vertices V and edges E
OUTPUT: Minimum Spanning Tree

BEGIN
    result = []
    SORT all edges in non-decreasing order of weight
    parent = MAKE_SET for all vertices
    
    FOR each edge (u, v, weight) in sorted order DO
        IF FIND_SET(u) ≠ FIND_SET(v) THEN
            ADD edge (u, v, weight) to result
            UNION(u, v)
            IF |result| = |V| - 1 THEN
                BREAK
            END IF
        END IF
    END FOR
    
    RETURN result
END

ALGORITHM MAKE_SET(v)
    parent[v] = v
END

ALGORITHM FIND_SET(v)
    IF parent[v] ≠ v THEN
        parent[v] = FIND_SET(parent[v])
    END IF
    RETURN parent[v]
END

ALGORITHM UNION(u, v)
    parent[FIND_SET(u)] = FIND_SET(v)
END
```

### 8. Prim's Algorithm (Minimum Spanning Tree)
```
ALGORITHM Prim(graph, start)
INPUT: Graph G = (V, E), starting vertex start
OUTPUT: Minimum Spanning Tree

BEGIN
    mst = []
    visited = {start}
    edges = all edges from start vertex
    
    WHILE |visited| < |V| DO
        min_edge = edge with minimum weight from visited to unvisited vertex
        ADD min_edge to mst
        new_vertex = unvisited vertex in min_edge
        ADD new_vertex to visited
        
        FOR each edge from new_vertex DO
            IF other vertex not in visited THEN
                ADD edge to edges list
            END IF
        END FOR
        
        REMOVE all edges connecting two visited vertices from edges
    END WHILE
    
    RETURN mst
END
```

### 9. Dijkstra's Algorithm (Shortest Path)
```
ALGORITHM Dijkstra(graph, source)
INPUT: Graph G = (V, E) with non-negative weights, source vertex
OUTPUT: Shortest distances from source to all vertices

BEGIN
    FOR each vertex v in V DO
        distance[v] = INFINITY
        previous[v] = NULL
    END FOR
    
    distance[source] = 0
    priority_queue = all vertices with their distances
    
    WHILE priority_queue is not empty DO
        u = vertex with minimum distance in priority_queue
        REMOVE u from priority_queue
        
        FOR each neighbor v of u DO
            alt = distance[u] + weight(u, v)
            IF alt < distance[v] THEN
                distance[v] = alt
                previous[v] = u
            END IF
        END FOR
    END WHILE
    
    RETURN distance[], previous[]
END
```

## Dynamic Programming

### 10. 0/1 Knapsack Problem
```
ALGORITHM Knapsack(weights, values, capacity, n)
INPUT: Array of weights, array of values, knapsack capacity, number of items
OUTPUT: Maximum value that can be obtained

BEGIN
    CREATE dp[n+1][capacity+1]
    
    FOR i = 0 TO n DO
        FOR w = 0 TO capacity DO
            IF i = 0 OR w = 0 THEN
                dp[i][w] = 0
            ELSE IF weights[i-1] <= w THEN
                dp[i][w] = MAX(
                    values[i-1] + dp[i-1][w - weights[i-1]],
                    dp[i-1][w]
                )
            ELSE
                dp[i][w] = dp[i-1][w]
            END IF
        END FOR
    END FOR
    
    RETURN dp[n][capacity]
END
```

## Time Complexities Summary

- **Bubble Sort**: O(n²)
- **Selection Sort**: O(n²)
- **Insertion Sort**: O(n²)
- **Quick Sort**: O(n log n) average, O(n²) worst
- **Merge Sort**: O(n log n)
- **Binary Search**: O(log n)
- **Kruskal's**: O(E log E)
- **Prim's**: O(V²) with adjacency matrix, O(E log V) with priority queue
- **Dijkstra's**: O(V²) with adjacency matrix, O(E log V) with priority queue
- **Knapsack**: O(nW) where W is capacity