---
description: Start working on a Linear issue (status update, branch creation, planning)
---

# Start working on a Linear issue

Use this workflow when you receive a Linear issue ID (e.g., `SER-XXX`) to automate the initial setup.

## Steps

// turbo
1. Fetch the issue details from Linear.
   - Use `mcp_linear_get_issue` with the provided ID.
   - Save the `branchName` from the issue details.

// turbo
2. Move the issue to "In Progress".
   - Use `mcp_linear_update_issue` with the issue UUID and set `state` to "In Progress".

3. Create the local git branch.
   - Use the `branchName` retrieved in step 1.
   - Run `git checkout -b <branch-name>`.

4. Analyze the issue description and create an initial `implementation_plan.md`.
   - Read the issue description thoroughly.
   - Identify affected components and files.
   - Create a new `implementation_plan.md` artifact in the brain directory.
   - Create a `task.md` artifact with the initial checklist.

5. Update the user via `notify_user` with the plan and branch information.
