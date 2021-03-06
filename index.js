'use strict';


// Dedicated to Erlich Bachman

let ebay = require('ebay-api');
let PropertiesReader = require('properties-reader');
let properties = PropertiesReader('./config.properties');
let async = require('async');
let limdu = require('limdu');
let LineByLineReader = require('line-by-line'),
    lr = new LineByLineReader('train_data.txt');
let swappa = require('./swappa');

var TextClassifier = limdu.classifiers.multilabel.BinaryRelevance.bind(0, {
    binaryClassifierType: limdu.classifiers.Winnow.bind(0, {retrain_count: 10})
});

// Now define our feature extractor - a function that takes a sample and adds features to a given features set:
var WordExtractor = function (input, features) {
    input.split(" ").forEach(function (word) {
        features[word] = 1;
    });
};

// Initialize a classifier with the base classifier type and the feature extractor:
var intentClassifier = new limdu.classifiers.EnhancedClassifier({
    classifierType: TextClassifier,
    featureExtractor: WordExtractor,
    normalizer: limdu.features.LowerCaseNormalizer,
});


lr.on('error', function (err) {
    console.log(err);
});

lr.on('line', function (line) {
    lr.pause();

    var parts = line.split('|');
    if (parts.length == 2) {
        intentClassifier.trainOnline(normalize(parts[1].trim()), parts[0].trim().toLowerCase());
    }

    lr.resume();
});

lr.on('end', function () {
    processDeals();
});


function normalize(text) {
    var value = text.toLowerCase().replace('9.7in', '97in').replace('9.7 inch', '97in').replace('9.7-inch', '97in').replace('9.7"', '97in').replace('10.5in', '105in').replace('10.5 inch', '105in').replace('10.5-inch', '105in').replace('10.5"', '105in').replace('12.9in', '129in').replace('12.9-in', '129in').replace('12.9 inch', '129in').replace('12.9"', '129in').replace('wi fi', 'wifi').replace('wi-fi', 'wifi');
    return value.toLowerCase();
}

function processDeals() {
    let query = 'ipad pro  -"box only" -32 -cracked -damaged -crack -liquid -scratch -"as is"';
    let functions = ['findCompletedItems', 'findItemsByKeywords'];
    async.eachSeries(functions, function (func, cb) {
        console.log();
        console.log(func, ':');
        var items = [];
        getItems(func, query, items, 1, function (items) {
            console.log('Found a total of', items.length, 'items.');
            if (func == 'findItemsByKeywords') {
                swappa.crawlSwappa(function (swappaItems) {
                    console.log('Found a total of', swappaItems.length, 'Swappa items.');
                    for (var i in swappaItems) {
                        items.push({
                            bucket: swappaItems[i].bucket,
                            title: swappaItems[i].description,
                            itemId: '',
                            price: parseFloat(swappaItems[i].price),
                            condition: 'Used',
                            listingType: 'Swappa'
                        });
                    }
                    processItems(items, function () {
                        console.log('Done with', func);
                        cb();
                    });
                });
            }
            else {
                processItems(items, function () {
                    console.log('Done with', func);
                    cb();
                });
            }
        });

    }, function (err) {
        if (err)
            console.error(err);
        else
            console.log('All done.');
    });

}

function analyzeDescription(description) {
    let color = "";
    let capacity = 0;
    let wireless = "";
    let screenSize = "";

    if (description.indexOf('cellular') != -1 || description.indexOf('celluar') != -1 || description.indexOf('verizon') != -1 || description.indexOf('t-mobile') != -1 || description.indexOf('unlocked') != -1 || description.indexOf('at&t') != -1)
        wireless = "cell";
    else if (description.indexOf('wifi') != -1)
        wireless = "wifi";

    if (description.indexOf("32gb") != -1 || description.indexOf("32 gb") != -1)
        capacity = 32;
    if (description.indexOf("64gb") != -1 || description.indexOf("64 gb") != -1)
        capacity = 64;
    if (description.indexOf("128gb") != -1 || description.indexOf("128 gb") != -1)
        capacity = 128;
    if (description.indexOf("256gb") != -1 || description.indexOf("256 gb") != -1)
        capacity = 256;
    if (description.indexOf("512gb") != -1 || description.indexOf("512 gb") != -1)
        capacity = 512;

    if (description.indexOf("97in") != -1)
        screenSize = "9.7";
    if (description.indexOf("105in") != -1)
        screenSize = "10.5";
    if (description.indexOf("129in") != -1)
        screenSize = "12.9";

    if (description.indexOf("rose gold") != -1)
        color = "rose gold";
    else if (description.indexOf("gold") != -1)
        color = "gold";
    else if (description.indexOf("space gray") != -1)
        color = "space gray";
    else if (description.indexOf("silver") != -1)
        color = "silver";
    return {capacity, wireless, screenSize, color};
}


function getItems(func, keywords, items, page, cb) {
    var itemFilter = [
        {name: 'FreeShippingOnly', value: true},
        {name: 'ListingType', value: 'AuctionWithBIN'},
        //{name: 'MaxPrice', value: '650'},
        {name: 'country', value: 'US'}
    ];

    if (func == 'findCompletedItems')
        itemFilter = [
            {name: 'country', value: 'US'}
        ];

    let params = {
        //sandbox: true,

        keywords: [keywords],

        // add additional fields
        outputSelector: ['AspectHistogram'],

        paginationInput: {
            entriesPerPage: 100,
            pageNumber: page
        },

        itemFilter: itemFilter,

        sortOrder: 'StartTimeNewest'

    };


    ebay.xmlRequest({
            serviceName: 'Finding',
            opType: func,
            appId: properties.get('ebay.api.appId'),
            params: params,
            parser: ebay.parseResponseJson    // (default)
        },
        function itemsCallback(error, itemsResponse) {

            if (error) cb([]);
            else {
                let returnedItems = itemsResponse.searchResult.item;
                if (returnedItems) {
                    for (var i = 0; i < returnedItems.length; i++) {
                        items.push(returnedItems[i]);
                    }
                }
                if (!returnedItems || returnedItems.length < 100 || items.length > 1000) { // Up to 10 pages, but that is more, than enough.
                    cb(items);
                }
                else {
                    getItems(func, keywords, items, page + 1, cb);
                }
            }
        });
}

function processItems(items, cb) {


    var buckets = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].listingType == 'Swappa') {
            let bucket = items[i].bucket;
            if (!buckets[bucket])
                buckets[bucket] = [];
            buckets[bucket].push({
                bucket: bucket,
                title: items[i].title,
                itemId: items[i].itemId,
                price: parseFloat(items[i].price),
                condition: items[i].condition,
                listingType: items[i].listingType
            });
        }
        else {
            if (items[i].isMultiVariationListing == 'true' || items[i].paymentMethod != 'PayPal' || !items[i].condition || items[i].condition.conditionId == '7000')
                continue;


            let {capacity, wireless, screenSize, color} = analyzeDescription(normalize(items[i].title));

            if (screenSize != '' && capacity > 0) {
                if (wireless === '')
                    wireless = 'wifi';

                let bucket = screenSize + "-" + capacity + "-" + wireless;
                if (!buckets[bucket])
                    buckets[bucket] = [];

                intentClassifier.trainOnline(normalize(items[i].title), bucket);

                var price = 0;
                if (items[i].listingInfo.buyItNowAvailable == 'true')
                    price = items[i].listingInfo.buyItNowPrice.amount;
                else {
                    price = items[i].sellingStatus.currentPrice.amount;
                }

                buckets[bucket].push({
                    bucket: bucket,
                    title: items[i].title,
                    itemId: items[i].itemId,
                    price: parseFloat(price),
                    condition: items[i].condition.conditionDisplayName,
                    listingType: items[i].listingInfo.listingType
                });
            }
        }

    }

    /*

     //Sort by property value
     let sorted = Object.keys(ngrams).sort((a, b) => ngrams[b] - ngrams[a]);
     for (var i = 0; i < 10 && i < sorted.length; i++) {
     console.log(sorted[i], '-', ngrams[sorted[i]]);
     }*/

    let bucketInfos = [];
    for (let bucket in buckets) {
        if (buckets.hasOwnProperty(bucket)) {
            let parsedItems = buckets[bucket];

            parsedItems.sort((a, b) => {
                return a.price - b.price;
            });

            let averagePrice = 0;
            let minPrice = 0;
            let maxPrice = 0;

            for (let i = 0; i < parsedItems.length; i++) {
                let price = parsedItems[i].price;
                averagePrice += price;
                if (minPrice == 0)
                    minPrice = price;
                minPrice = Math.min(minPrice, price);
                maxPrice = Math.max(maxPrice, price);
            }
            averagePrice = averagePrice / parsedItems.length;
            let bucketInfo = {bucket: bucket, min: minPrice, max: maxPrice, avg: averagePrice, items: []};
            bucketInfos.push(bucketInfo);

            for (let i = 0; i < parsedItems.length; i++) {
                if (i <= 3) {
                    parsedItems[i].deviation = (averagePrice - parsedItems[i].price) / averagePrice;
                    if (parsedItems[i].deviation > 0 || parsedItems.length == 1) {
                        bucketInfo.items.push(parsedItems[i]);
                    }
                }
            }
        }
    }

    bucketInfos.sort((a, b) => {
        return a.min - b.min;
    });

    console.log();
    console.log('Best deals:');
    for (let bucket in bucketInfos) {

        var deals = bucketInfos[bucket].items;

        if (deals) {
            console.log(bucketInfos[bucket].bucket, '[' + bucketInfos[bucket].min.toFixed(2) + '-' + bucketInfos[bucket].max.toFixed(2) + '], avg = ', bucketInfos[bucket].avg.toFixed(2));

            deals.sort((a, b) => {
                return b.deviation - a.deviation;
            });

            for (let i = 0; i < deals.length; i++) {
                console.log('\t\t' + deals[i].price + ' - ' + deals[i].listingType + ' - ' + deals[i].title + ' - ' + deals[i].condition + ' - ' + deals[i].itemId + ' - ' + deals[i].deviation.toFixed(2)); // intentClassifier.classify(normalize(bestDeals[i].title))
            }
        }
    }

    cb();
}
