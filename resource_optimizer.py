"""Dynamic-programming and branch-and-bound resource allocation examples."""

from dataclasses import dataclass
import heapq


@dataclass
class Request:
    patient_id: str
    units: int
    benefit: int


def allocate_with_dp(requests, capacity):
    """0/1 knapsack: maximise care benefit without exceeding capacity."""
    count = len(requests)
    table = [[0] * (capacity + 1) for _ in range(count + 1)]
    for i in range(1, count + 1):
        request = requests[i - 1]
        for available in range(capacity + 1):
            table[i][available] = table[i - 1][available]
            if request.units <= available:
                table[i][available] = max(
                    table[i][available], request.benefit + table[i - 1][available - request.units]
                )

    selected, available = [], capacity
    for i in range(count, 0, -1):
        if table[i][available] != table[i - 1][available]:
            selected.append(requests[i - 1])
            available -= requests[i - 1].units
    return list(reversed(selected)), table[count][capacity], table


def allocate_with_branch_and_bound(requests, capacity):
    """Best-first branch and bound for the same allocation problem."""
    items = sorted(requests, key=lambda item: item.benefit / item.units, reverse=True)

    def bound(level, used, benefit):
        if used >= capacity:
            return benefit
        estimate, remaining, index = benefit, capacity - used, level
        while index < len(items) and items[index].units <= remaining:
            remaining -= items[index].units
            estimate += items[index].benefit
            index += 1
        if index < len(items):
            estimate += items[index].benefit * remaining / items[index].units
        return estimate

    best_value, best_selection = 0, []
    queue = [(-bound(0, 0, 0), 0, 0, 0, [])]
    while queue:
        _, level, used, benefit, chosen = heapq.heappop(queue)
        if level == len(items):
            continue
        item = items[level]
        if used + item.units <= capacity:
            new_value = benefit + item.benefit
            new_chosen = chosen + [item]
            if new_value > best_value:
                best_value, best_selection = new_value, new_chosen
            estimate = bound(level + 1, used + item.units, new_value)
            if estimate > best_value:
                heapq.heappush(queue, (-estimate, level + 1, used + item.units, new_value, new_chosen))
        estimate = bound(level + 1, used, benefit)
        if estimate > best_value:
            heapq.heappush(queue, (-estimate, level + 1, used, benefit, chosen))
    return best_selection, best_value


if __name__ == "__main__":
    sample = [Request("P1001", 4, 94), Request("P1002", 3, 81), Request("P1004", 2, 62), Request("P1006", 3, 78)]
    print("DP:", allocate_with_dp(sample, 7)[:2])
    print("Branch and bound:", allocate_with_branch_and_bound(sample, 7))
