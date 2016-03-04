To view the visualization, enter data into raw.txt and run

```
python scripts/process.py > data/links.csv
python scripts/processNodes.py > data/nodes.csv
```

then type:

```
python -m SimpleHTTPServer 4321
```

Then go into a web browser and type `http://localhost:4321/` into the URL bar.
