#!/usr/bin/env python3
"""
Fix the context-shell to render ONLY the context banners (Emergency, Sport, Radiology)
and then pass through {children} for the rest of the dashboard content.
"""

with open('src/app/[locale]/(app)/dashboard/context-shell.tsx', 'r') as f:
    lines = f.readlines()

# Find the return statement (line 90, 0-indexed 89)
# Keep lines 89-197 (the banners: Emergency, Sport, Radiology)
# Replace lines 198 onwards (until the closing) with just {children} and closing tags

# Find the exact line where "{/* ─────────── Greeting" starts
greeting_start = None
for i, line in enumerate(lines):
    if '─────────── Greeting' in line:
        greeting_start = i
        break

# Find the end of the return block (line with just "  );" after the main return)
# The return starts at line 89 (0-indexed)
return_start = None
for i, line in enumerate(lines):
    if line.strip() == 'return (' and i > 80:
        return_start = i
        break

# Find the matching closing );
brace_count = 0
return_end = None
for i in range(return_start, len(lines)):
    for ch in lines[i]:
        if ch == '(':
            brace_count += 1
        elif ch == ')':
            brace_count -= 1
            if brace_count == 0:
                return_end = i
                break
    if return_end:
        break

print(f"Return starts at line {return_start + 1}")
print(f"Greeting starts at line {greeting_start + 1}")
print(f"Return ends at line {return_end + 1}")

# New approach: keep everything up to greeting_start, then add {children} and close
new_lines = lines[:greeting_start]
# Add {children} and close the div and return
new_lines.append('      {/* ─────────── Main Content (passed as children) ─────────── */}\n')
new_lines.append('      {children}\n')
new_lines.append('    </div>\n')
new_lines.append('  );\n')
new_lines.append('}\n')
new_lines.append('\n')

# Now add the helper functions that come after the main component
# Find where helper functions start (after the return_end)
# Look for function definitions after the main component
helper_start = None
for i in range(return_end + 1, len(lines)):
    if lines[i].strip().startswith('//') or lines[i].strip().startswith('function '):
        helper_start = i
        break

if helper_start:
    print(f"Helper functions start at line {helper_start + 1}")
    new_lines.extend(lines[helper_start:])

with open('src/app/[locale]/(app)/dashboard/context-shell.tsx', 'w') as f:
    f.writelines(new_lines)

print("✅ Done! Context shell now renders banners + children")
