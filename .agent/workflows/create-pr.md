---
description: How to create a Pull Request for the Serapeum API project
---

# Create a Pull Request

Follow these steps every time you open a PR. Missing step 2 will cause the `PR Title Check` CI workflow to fail.

## Steps

1. Ensure your branch is named with the Linear ticket prefix:
   ```
   SER-XXX/short-description
   ```
   Example: `SER-47/supabase-jwt-validation-middleware`

2. **Set the PR title** — it MUST start with the Linear ticket ID. The `check-pr-title.yml` action validates against:
   ```
   /^(\[SER-\d+\]|SER-\d+)/
   ```
   Both of these pass ✅:
   ```
   [SER-47] feat(auth): implement Supabase JWT validation middleware
   SER-47 feat(auth): implement Supabase JWT validation middleware
   ```
   **Preferred format:** `[SER-47] ...` (brackets, matches Linear's own style).  
   > ⚠️ Any title that does **not** begin with `[SER-XXX]` or `SER-XXX` will **fail** the `Check PR Title` CI workflow.

3. Write a PR description that includes a Linear close reference:
   ```markdown
   ## Summary
   <short explanation of what changed and why>

   Closes SER-XXX
   ```

4. Push the branch and open the PR:
   ```bash
   git push -u origin <branch-name>
   ```
   Then open the PR on GitHub with the correctly formatted title from step 2.

5. Verify all status checks pass before requesting review:
   - `pr-title-check` — Linear ticket prefix in title
   - `CI` — lint, typecheck, test, build
