with open("src/app/api/tasks/[id]/route.ts", "r") as f:
    text = f.read()

old_include = """      include: {
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        subtasks: {"""

new_include = """      include: {
        assignments: {
          include: {
            task: { // Needed by prisma depending on relations? actually we just need user
              select: { id: true }
            } // We'll just define the include inline
          }
        },
        project: { select: { id: true, name: true, color: true, icon: true } },
        labels: { include: { label: true } },
        subtasks: {"""

# The assignment relation has assigneeId. Let's look at schema for TaskAssignment
