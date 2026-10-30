"""Max-heap for processing the patient with the highest risk first."""

import heapq


class EmergencyQueue:
    def __init__(self):
        self._heap = []
        self._arrival_number = 0

    def add_patient(self, patient_id, patient_name, risk_score):
        self._arrival_number += 1
        item = (-risk_score, self._arrival_number, patient_id, patient_name)
        heapq.heappush(self._heap, item)

    def call_next(self):
        if not self._heap:
            return None
        negative_score, _, patient_id, patient_name = heapq.heappop(self._heap)
        return {"id": patient_id, "name": patient_name, "risk_score": -negative_score}

    def ordered_view(self):
        return [
            {"id": item[2], "name": item[3], "risk_score": -item[0]}
            for item in sorted(self._heap)
        ]


if __name__ == "__main__":
    queue = EmergencyQueue()
    queue.add_patient("P1001", "Sample A", 94)
    queue.add_patient("P1002", "Sample B", 81)
    queue.add_patient("P1003", "Sample C", 55)
    print("Queue:", queue.ordered_view())
    print("Called:", queue.call_next())
