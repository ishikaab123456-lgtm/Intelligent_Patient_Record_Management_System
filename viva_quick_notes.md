# Viva Quick Notes

## One-minute explanation

My project is an Intelligent Patient Record Management System for a multi-specialty hospital. It stores fictional patient records in SQLite and provides registration, search, appointment, doctor, emergency-queue and resource-management functions. The assessment feature uses visible rules to suggest priority and department; it does not provide a medical diagnosis. The project also demonstrates fast patient indexing, risk-based queue ordering, relationship mapping, resource optimisation and conflict-free scheduling. The main goal is to reduce record-search time and organise hospital resources more efficiently.

## Important answers

- **Why SQLite?** It is lightweight, file-based and easy to demonstrate without installing a separate database server.
- **Why Flask?** It provides a simple connection between the browser interface and Python database code.
- **Why a heap for emergencies?** The maximum-risk patient can be accessed immediately, and insertion takes logarithmic time.
- **Why a B+ tree?** Database systems use balanced indexes for fast exact and range retrieval. Linked leaves are useful for ordered records.
- **Is the assessment a diagnosis?** No. It is a transparent academic priority suggestion. Medical decisions require qualified professionals.
- **How are appointment conflicts prevented?** Before saving, the system checks whether the chosen doctor already has a scheduled appointment at the same date and time.
- **How is a doctor recommended?** The system checks the required department, availability and current workload, then selects the least-loaded suitable doctor.
