"""Small educational B+ style index for exact and range searches.

The leaf groups are linked logically and records remain sorted. Production database
indexes are more complex; this class is deliberately compact for a student project.
"""

from bisect import bisect_left, insort


class BPlusIndex:
    def __init__(self, order=4):
        self.order = order
        self.keys = []

    def insert(self, patient_id):
        if patient_id not in self.keys:
            insort(self.keys, patient_id)

    def delete(self, patient_id):
        position = bisect_left(self.keys, patient_id)
        if position < len(self.keys) and self.keys[position] == patient_id:
            self.keys.pop(position)
            return True
        return False

    def search(self, patient_id):
        position = bisect_left(self.keys, patient_id)
        found = position < len(self.keys) and self.keys[position] == patient_id
        return found, position

    def range_search(self, start_id, end_id):
        start = bisect_left(self.keys, start_id)
        result = []
        for patient_id in self.keys[start:]:
            if patient_id > end_id:
                break
            result.append(patient_id)
        return result

    def leaves(self):
        leaf_size = self.order - 1
        return [self.keys[index:index + leaf_size] for index in range(0, len(self.keys), leaf_size)]


if __name__ == "__main__":
    index = BPlusIndex(order=4)
    for key in ["P1007", "P1001", "P1005", "P1003", "P1009", "P1011"]:
        index.insert(key)
    print("Leaves:", index.leaves())
    print("Search:", index.search("P1005"))
    print("Range:", index.range_search("P1003", "P1009"))
