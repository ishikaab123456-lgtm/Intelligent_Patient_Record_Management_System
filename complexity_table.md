# Complexity Analysis

| Hospital operation | Structure or algorithm | Time complexity | Project purpose |
|---|---|---:|---|
| Insert/search patient in balanced memory index | AVL Tree | `O(log n)` | Quick lookup with controlled tree height |
| Add emergency patient | Binary Heap | `O(log n)` | Maintains risk-based treatment order |
| View highest-priority patient | Binary Heap | `O(1)` | Immediate access to the next case |
| Traverse relationships | BFS / DFS | `O(V + E)` | Finds connected patients, doctors and departments |
| Find specialist route | Dijkstra | `O((V + E) log V)` | Calculates a low-cost referral path |
| Allocate limited resources | Dynamic Programming | `O(nC)` | Maximises priority benefit within capacity `C` |
| Create conflict-free timetable | Graph Colouring | Worst case `O(k^n)` | Suitable for the small classroom schedule |
| Exact/range record retrieval | B+ Tree | `O(log n)` plus output | Supports scalable database indexing |

`n` = number of records or requests, `V` = vertices, `E` = edges, `k` = time slots, and `C` = resource capacity.
