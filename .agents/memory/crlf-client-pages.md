---
name: CRLF in client pages
description: Some client/src/pages/*.tsx files have Windows-style CRLF line endings that silently break the edit tool
---

# CRLF Line Endings in Client Pages

## The rule
Before using the `edit` tool on any `client/src/pages/*.tsx` file, check for CRLF endings and strip them if present.

**Why:** Several page files (MoneyGuide.tsx, Dashboard.tsx, Lessons.tsx confirmed) have Windows-style `\r\n` endings. The `edit` tool matches on Unix `\n` only, so old_string never matches and the edit silently fails with "did not appear verbatim."

**How to apply:**
1. If an edit fails with "did not appear verbatim" on a client page, run: `sed -n '1p' <file> | cat -A` -- if you see `^M$` the file has CRLF.
2. Strip all affected files first: `sed -i 's/\r//' client/src/pages/File1.tsx client/src/pages/File2.tsx`
3. Then re-run the edit normally.

Can batch-strip all affected pages if editing multiple: `sed -i 's/\r//' client/src/pages/*.tsx`
