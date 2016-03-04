#!/usr/bin/python
import re
import operator
import sys

nodes = {}


class Node:
    def __init__(self, name, count):
        self.name = name
        self.count = count


with open('data/raw.txt') as fp:
    for line in fp:
        values = re.split("\t", line.rstrip())
        arr = [v.replace(" ", "") for v in values]
        source_name = arr[1]
        dest_name = arr[2]
        count = int(arr[3])

        if source_name in nodes:
            nodes[source_name].count += count
        else:
            nodes[source_name] = Node(source_name, count)

        if dest_name in nodes:
            nodes[dest_name].count += count
        else:
            nodes[dest_name] = Node(dest_name, count)

sys.stdout.write("name")
sys.stdout.write(",")
sys.stdout.write("count\n")

for node in sorted(nodes.values(), key=operator.attrgetter('count'), reverse=True):
    sys.stdout.write(node.name)
    sys.stdout.write(",")
    sys.stdout.write(str(node.count))
    sys.stdout.write("\n")
