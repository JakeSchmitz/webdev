
"use strict";

/*
    Constants used for computing order cost
*/
const SHIPPING_PRICE = 5.00;
const TAX_RATE       = 0.10;

// inventory contains a map from unique ID to an Item instance
var inventory = {};

/*
    An Item represents an orderable item that will be displayed in the items list

    Items contain a configurable quantity. When an order is placed all items with a 
    quantity > 0 will be added to the order. Setting the quantity to 0 effectively
    removes the item from the pending order. All quantities default to null.
*/
class Item {
    constructor(divReference, name, price, details, imgUrl, quantity, id) {
        try {
            this.div      = $(divReference);
            this.name     = name;
            this.price    = price;
            this.details  = details;
            this.imgUrl   = imgUrl;
            this.quantity = 0;
            this.id       = getRandomId(10000000,99999999).toString();
        } catch(e) {
            throw Error("Item must contain name, price, and details.");
        }


        /*
            Render this item in the div assigned in the constructor

            Honestly, this feels worse than the previous html implementation 
            (see: https://github.com/JakeSchmitz/webdev/blob/master/hwk4/index.html#L37-L52)
        */
        this.renderItem = function() {
            // how do I reference this objects variables inside change and click handlers defined on these elements?
            var itemId = this.id;
            var name = this.name;
            var quantity = this.quantity;
            var itemDiv = $('<div />', {
                "class": "item row"
            }).appendTo(this.div);
            var leftCol = $('<div />', {
                "class": "col-md-4"
            }).appendTo(itemDiv);
            var itemImg = $('<img />', {
                "class": "itemImage",
                "src": this.imgUrl
            }).appendTo(leftCol);
            var middleCol = $('<div />', {
                "class": "col-md-4"
            }).appendTo(itemDiv);
            var itemName = $('<h2 />', {
                "css": {
                    "width": "100%"
                },
                "class": "itemName",
                "text": this.name
            }).appendTo(middleCol);
            var itemDetails = $('<em />', {
                "css": {
                    "width": "100%"
                },
                "class": "itemDetails",
                "text": this.details
            }).appendTo(middleCol);
            var rightCol = $('<div />', {
                "class": "itemControls col-md-4"
            }).appendTo(itemDiv);
            var removeButton = $('<button />', {
                "class": "btn btn-danger removeItemButton",
                "text": "Remove",
                "click": function() {
                    // for some reason I don't understand, this.updateQuantity doesn't work here?
                    // maybe it's an issue with what "this" is inside this function
                    updateQuantity(itemId, 0);
                }
            }).appendTo(rightCol);
            var itemPrice = $('<p />', {
                "class": "itemPrice",
                "id": "price" + itemId,
                "text": this.price.toFixed(2)
            }).appendTo(rightCol);
             var itemQuantity = $('<input />', {
                "class": "itemQuantity",
                "type": "number",
                "placeholder": 0,
                "min": 0,
                "max": 10,
                "id": "quantity" + itemId,
                // It's really annoying that I can't just point change at this.updateQuantity
                // because this loses meaning inside of updateQuantity and no longer refers back 
                // to the original item.
                "change": function() {
                    var currentQuantity = $("#quantity" + itemId).val();
                    updateQuantity(itemId, currentQuantity);
                },
                "val": this.quantity
            }).appendTo(rightCol);
        }

         /*
            Update the displayed price for this item to reflect the quantity ordered

            When quantity is 0, the price per unit is displayed, but when a quantity > 0 
            is selected the price will be the price per unit times the quantity
        */
        this.updatePrice = function() {
            var count = this.quantity > 0 ? this.quantity : 1;
            $("#price" + this.id).text = (count * this.price).toFixed(2);
        }

        /*
            Update this items quantity to a non-negative number

            When the quantity is updated update the displayed price for this line item
        */
        this.updateQuantity = function(count) {
            if (count < 0) {
                count = 0;
            }
            this.quantity = count;
            var currentPrice = (count * this.price).toFixed(2);
            // If the quantity was updated to 0 and the currentPrice
            // evaluates to 0 then set the price to the price of a single item
            if (currentPrice == 0) {
                currentPrice = this.price;
            }
            $("#quantity" + this.id).val(count);
            $("#price" + this.id).text(currentPrice);
            updateValues();
        }

        /*
            Get the subtotal cost associated with this item, which is equal to the price
            times the quantity ordered
        */
        this.getPrice = function() {
            var cost = this.quantity * this.price;
            return cost;
        }

        /*
            Generate order info from an item. This will include a cost, but will not
            include the item details.
        */
        this.getOrderInfo = function() {
            return {
                "name": this.name,
                "quantity": this.quantity,
                "price": this.price,
                "cost": this.price * this.quantity
            }
        }

        /*
            Simple getter for name
        */
        this.getName = function() {
            return this.name;
        }
    }
}

/*
    When the window loads initialize the inventory via resetItems
*/
window.onload = function() {
    fetchItems();
}

/*
    Reset the state of the page by clearing out the existing inventory and re-fetching
    the complete inventory from items.json and reloading the HTML content of the items
    div.
*/
function resetItems() {
    for (let i in inventory) {
        var item = inventory[i];
        item.updateQuantity(0);
    }
}

function fetchItems() {
    inventory = {};
    get('items.json').then(
        function(response) {
            $("#items").val("");
            var rawItems = response;
            var items = JSON.parse(rawItems);
            items.forEach(function(i) {
                var item = new Item("#items", i.name, i.price, i.details, i.url);
                inventory[item.id] = item;
                item.renderItem();
            });
            updateValues();
        },
        function(error) {
            console.log("Failed with error: " + e.message);
            alert('abort');
        });
}

/*
    Submit an order.

    This function gathers all of the information from the state of inventory and
    generates a customer and order json objects which are submitted via the creditForm
*/
function submitItems() {
    var order = [];
    var subtotal = 0;

    for (let key in inventory) {
        var item = inventory[key];
        var price = item.getPrice();
        if ( price > 0) {
            order.push(item.getOrderInfo());
            subtotal += price;
        }
    }

    var tax      = parseFloat((TAX_RATE * subtotal).toFixed(2));
    var shipping = parseFloat(SHIPPING_PRICE.toFixed(2));
    var total    = subtotal + (TAX_RATE * subtotal) + SHIPPING_PRICE;
    total        = parseFloat(total.toFixed(2))
    subtotal     = parseFloat(subtotal.toFixed(2))

    var customer = {
        name       : $("#name-input").val(),
        cc         : $("#cc-input").val(),
        cvv        : $("#cvv-input").val(),
        expiration : $("#exp-input").val(),
        address    : $("#address-input").val()
    }

    $("#order").val(JSON.stringify(order));
    $("#customer").val(JSON.stringify(customer));
    $("#tax").val(tax);
    $("#shipping").val(shipping);
    $("#subtotal").val(subtotal);
    $("#total").val(total);
    // submit form
    $("#creditForm").submit();
}

/*
    Remove the item identified by id from the pending order by setting 
    it's quantity to 0.
*/
function removeItem(id) {
    updateQuantity(id, 0);
}

/*
    Update the quantity of the item identified by id.
*/
function updateQuantity(id, quantity) {
    var item = inventory[id];
    if (!item) {
        throw Error("Could not find item with id: " + id);
    }
    if (quantity < 0) {
        quantity = 0
    }
    item.updateQuantity(quantity);
    updateValues();
}

/*
    Update the values of total, subtotal and tax in the costs div at the 
    bottom of the page.
*/
function updateValues() {
    var subtotal = 0.0;
    for (let key in inventory) {
        var item = inventory[key];
        subtotal += item.getPrice();
    }
    var tax = (subtotal * TAX_RATE).toFixed(2);
    var total = (subtotal + (subtotal * TAX_RATE) + SHIPPING_PRICE).toFixed(2);
    // Update the displayed costs
    $("#currentSubtotal").text(subtotal.toFixed(2));
    $("#currentTax").text(tax);
    $("#currentTotal").text(total);
}

/*
    Below are utility functions that were copy and pasted from either
    the notes in unex/Session-6 or from StackOverflow
*/
function get(url) {
  // Return a new promise.
  return new Promise( function(resolve, reject) {
    var req = new XMLHttpRequest();    // Setup to get JSON (or whatever) from a URL
    req.open('GET', url);

    req.onload = function() {           // even on 404 errors (200==real success)

      if (req.status == 200) {
        resolve(req.response);          // Resolve the promise with the response text
      }
      else {
        reject( Error(req.statusText) );    // Reject with the status text which will hopefully be a meaningful error
      }
    };

    req.onerror = function() {           // Network (not HTTP) errors
      reject( Error("Network Error") );
    };

    // Make the request
    req.send();
  });
}

function getRandomId(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    var randomInt = Math.floor(Math.random() * (max - min)) + min;
    // Check if this randomInt is already a key in the inventory map
    if (inventory[randomInt] != null) {
        // Try again if this randomInt is already an assigned key
        return getRandomId(min, max);
    } else {
        return randomInt;
    }
}