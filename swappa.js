'use strict';

const Crawler = require("crawler");


function crawlSwappa(cb){
    let items = [];

    let crawler = new Crawler({
        maxConnections: 10
    });

    crawler.on('drain', function () {
        cb(items);
    });

    retrieveProductLinks(crawler, 'https://swappa.com/buy/devices/tablets?search=pro&platform=ios');


    function retrieveProductLinks(crawler, entryPoint) {
        crawler.queue({
            uri: entryPoint,
            jQuery: true,
            callback: function (error, res, done) {

                var linkArray = [];
                if (error) {
                    console.log(error);
                } else {
                    var $ = res.$;

                    var links = $("section.section_main > div.row.dev_grid > div.col-md-2.col-sm-3.col-xs-4 > div > div.title > a");


                    links.each(function (index) {
                        linkArray.push($(this).attr('href'));
                    });

                }

                for (var i in linkArray) {
                    crawler.queue({
                        uri: 'https://swappa.com' + linkArray[i],
                        jQuery: true,
                        callback: function (error, res, done1) {
                            var $ = res.$;

                            let productDescription = $('#breadcrumbs > div > ul > li.active.hidden-xs').text().toLowerCase();

                            var products = $("div.listing_preview_wrapper > div > div.inner > div.media > div.media-body ");

                            products.each(function (index) {
                                let price = $(this).find("div.row > div.col-xs-2.col-md-2 > a.price").text().trim().replace('$', '');
                                let description = $(this).find('div.more_area > div.headline > a').text().trim();
                                let capacity = $(this).find("div.row > div.col-xs-2.col-md-2 > span.storage").text().replace(' GB', '').trim();
                                let connectivity = 'wifi';
                                if (productDescription.indexOf('verizon') > -1 || productDescription.indexOf('unlocked') > -1 || productDescription.indexOf('at&amp;t') > -1 || productDescription.indexOf('t-mobile') > -1) {
                                    connectivity = 'cell';
                                }
                                let screenSize = '';
                                if (productDescription.indexOf('9.7') > -1) {
                                    screenSize = '9.7';
                                }
                                if (productDescription.indexOf('10.5') > -1) {
                                    screenSize = '10.5';
                                }
                                if (productDescription.indexOf('12.9') > -1) {
                                    screenSize = '12.9';
                                }

                                let bucket = screenSize+'-'+capacity+'-'+connectivity;

                                items.push({
                                    bucket: bucket,
                                    capacity: parseInt(capacity),
                                    connectivity: connectivity,
                                    description: description,
                                    price: parseFloat(price),
                                    screenSize: screenSize
                                });
                            });
                            done1();
                        }
                    });
                }

                done();
            }
        });
    }
}

/*crawlSwappa(function (items) {
    items.sort((a, b) => a.price - b.price);
    for (var i in items) {
        if (items[i].capacity>32)
            console.log(items[i].bucket + '\t'+ items[i].price  + '\t' + items[i].description);
    }
    console.log('Draining.');
});*/

module.exports.crawlSwappa = crawlSwappa;