"""Backtracking graph colouring for conflict-free doctor scheduling."""


def colour_schedule(conflicts, slot_count):
    appointments = list(conflicts)
    colours = {}

    def is_safe(appointment, slot):
        return all(colours.get(neighbour) != slot for neighbour in conflicts[appointment])

    def assign(index):
        if index == len(appointments):
            return True
        appointment = appointments[index]
        for slot in range(1, slot_count + 1):
            if is_safe(appointment, slot):
                colours[appointment] = slot
                if assign(index + 1):
                    return True
                del colours[appointment]
        return False

    return colours if assign(0) else None


if __name__ == "__main__":
    sample_conflicts = {
        "A201": {"A202", "A204"}, "A202": {"A201", "A203"},
        "A203": {"A202", "A204"}, "A204": {"A201", "A203"}
    }
    print("Assigned slots:", colour_schedule(sample_conflicts, 3))
