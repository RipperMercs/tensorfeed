import sys, os
BAD = {0x2013: "en dash", 0x2014: "em dash", 0x2015: "horizontal bar"}
hits = 0
for path in sys.argv[1:]:
    if not os.path.exists(path):
        continue
    with open(path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            for ch in line:
                if ord(ch) in BAD:
                    hits += 1
                    print("%s:%d: %s -> %s" % (path, lineno, BAD[ord(ch)], line.strip()[:90]))
                    break
print("VIOLATIONS:", hits)
sys.exit(1 if hits else 0)
