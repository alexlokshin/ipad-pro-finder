# ipad-pro-finder

Scans eBay and Swappa for best prices on iPad Pros of all different models.

Feed your ebay app id into `config.properties`, install dependencies `npm install`, then run `node index.js`. Items displayed in the reverse order of deviation from the mean in a particular group of iPad Pros. Classification is done by screen size, storage size, and LTE-ability. Color is ignored.

Output looks like
```
9.7-32-wifi - 349 - iPad Pro 9.7 32Gb Rose Gold - Used  - 201956606563  - 0.64
BUCKET      - $$$ - DESCRIPTION                 - COND  - EBAY ITEM ID  - DEVIATION FACTOR
```
