import json
from collections import Counter

with open("dict.json", "r", encoding="utf-8") as f:
    data = json.load(f)

counter = Counter()

for entry in data:
    word = entry.get("word", "")
    counter.update(word.lower())

for letter, count in counter.most_common():
    print(f"{letter}: {count}")

total = sum(counter.values())

for letter, count in counter.most_common():
    percentage = count / total * 100
    print(f"{letter}: {count:4}  ({percentage:.2f}%)")
