"""Graph algorithms for doctor, patient and department relationships."""

from collections import deque
import heapq
import math


def bfs(graph, start):
    visited, order = {start}, []
    queue = deque([start])
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbour, _ in graph.get(node, []):
            if neighbour not in visited:
                visited.add(neighbour)
                queue.append(neighbour)
    return order


def dfs(graph, start):
    order, visited = [], set()

    def visit(node):
        visited.add(node)
        order.append(node)
        for neighbour, _ in graph.get(node, []):
            if neighbour not in visited:
                visit(neighbour)
    visit(start)
    return order


def dijkstra(graph, start, destination):
    distances = {node: math.inf for node in graph}
    previous = {}
    distances[start] = 0
    queue = [(0, start)]
    while queue:
        distance, node = heapq.heappop(queue)
        if distance != distances[node]:
            continue
        if node == destination:
            break
        for neighbour, weight in graph.get(node, []):
            new_distance = distance + weight
            if new_distance < distances.get(neighbour, math.inf):
                distances[neighbour] = new_distance
                previous[neighbour] = node
                heapq.heappush(queue, (new_distance, neighbour))
    if distances.get(destination, math.inf) == math.inf:
        return [], math.inf
    path, current = [], destination
    while current in previous:
        path.append(current)
        current = previous[current]
    path.append(start)
    return list(reversed(path)), distances[destination]


def bellman_ford(nodes, edges, start):
    distance = {node: math.inf for node in nodes}
    distance[start] = 0
    for _ in range(len(nodes) - 1):
        changed = False
        for source, target, weight in edges:
            if distance[source] != math.inf and distance[source] + weight < distance[target]:
                distance[target] = distance[source] + weight
                changed = True
        if not changed:
            break
    has_negative_cycle = any(
        distance[source] != math.inf and distance[source] + weight < distance[target]
        for source, target, weight in edges
    )
    return distance, has_negative_cycle


def floyd_warshall(nodes, edges):
    distance = {a: {b: (0 if a == b else math.inf) for b in nodes} for a in nodes}
    for source, target, weight in edges:
        distance[source][target] = min(distance[source][target], weight)
    for middle in nodes:
        for source in nodes:
            for target in nodes:
                distance[source][target] = min(
                    distance[source][target], distance[source][middle] + distance[middle][target]
                )
    return distance


def prim_mst(graph, start):
    visited, result, total = {start}, [], 0
    edges = [(weight, start, neighbour) for neighbour, weight in graph[start]]
    heapq.heapify(edges)
    while edges and len(visited) < len(graph):
        weight, source, target = heapq.heappop(edges)
        if target in visited:
            continue
        visited.add(target)
        result.append((source, target, weight))
        total += weight
        for neighbour, next_weight in graph[target]:
            if neighbour not in visited:
                heapq.heappush(edges, (next_weight, target, neighbour))
    return result, total


def kruskal_mst(nodes, edges):
    parent = {node: node for node in nodes}

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    result, total = [], 0
    for source, target, weight in sorted(edges, key=lambda edge: edge[2]):
        root_a, root_b = find(source), find(target)
        if root_a != root_b:
            parent[root_a] = root_b
            result.append((source, target, weight))
            total += weight
    return result, total


if __name__ == "__main__":
    hospital_graph = {
        "Patient": [("General", 2)], "General": [("Patient", 2), ("Cardiology", 3), ("Neurology", 4)],
        "Cardiology": [("General", 3)], "Neurology": [("General", 4)]
    }
    print("BFS:", bfs(hospital_graph, "Patient"))
    print("Shortest referral:", dijkstra(hospital_graph, "Patient", "Cardiology"))
