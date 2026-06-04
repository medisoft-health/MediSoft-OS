import re
import subprocess

result = subprocess.run(
    ['curl', '-sL', 'http://localhost:3000/en/dashboard', '-b', 'better-auth.session_token=test'],
    capture_output=True, text=True
)
html = result.stdout

# Find all text between "Recent Activity" and the next section
idx = html.find('Recent Activity')
if idx == -1:
    print("Recent Activity not found in HTML")
else:
    # Get a chunk after Recent Activity
    chunk = html[idx:idx+3000]
    # Find all spans with font-semibold followed by muted text
    pattern = r'class="font-semibold">([^<]+)</span>\s*<span[^>]*>([^<]+)</span>'
    matches = re.findall(pattern, chunk)
    print(f"Found {len(matches)} activity rows:")
    for verb, resource in matches:
        print(f"  {verb} {resource}")
    
    if not matches:
        # Try alternative pattern - look for text content
        text_pattern = r'>([^<]*Viewed[^<]*)<'
        text_matches = re.findall(text_pattern, chunk)
        print(f"\nAlternative search found {len(text_matches)} matches:")
        for m in text_matches[:10]:
            print(f"  {m}")
        
        # Also show raw chunk around Viewed
        viewed_idx = chunk.find('Viewed')
        if viewed_idx > -1:
            print(f"\nContext around 'Viewed': ...{chunk[viewed_idx-50:viewed_idx+200]}...")
