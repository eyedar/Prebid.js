/** @module adaptermanger */

var bidmanager = require('./bidmanager.js');
var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');
var events = require('./events');
import { BaseAdapter } from './adapters/baseAdapter';

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;

// just sticking these on global object for now
pbjs._bidsRequested = [];
pbjs._bidsReceived = [];

function uniques(value, index, _this) {
  return _this.indexOf(value) === index;
}

function flatten(arrayA, arrayB) {
  return arrayA.concat(arrayB);
}

function getBidSet() {
  return pbjs.adUnits.map(placement => placement.bids)
    .reduce(flatten, [])
    .map(bid => bid.bidder)
    .filter(uniques);
}

function getBids({ bidderCode, bidSetId, bidId }) {
  return pbjs.adUnits.map(adUnit => {
    return adUnit.bids.filter(bid => {
      bid.placementCode = adUnit.code;
      bid.sizes = adUnit.sizes;
      bid.bidId = bidId;
      bid.bidSetId = bidSetId;
      return bid.bidder === bidderCode;
    });
  }).reduce(flatten, []);
}

exports.callBids = () => {
  const bidSetId = utils.getUniqueIdentifierStr();

  getBidSet().forEach(bidderCode => {
    const bidId = utils.getUniqueIdentifierStr();
    const adapter = _bidderRegistry[bidderCode];
    if (adapter) {
      const bids = {
        bidSetId,
        bidId,
        bidderCode,
        bids: getBids({ bidderCode, bidSetId, bidId }),
        start: new Date().getTime()
      };
      utils.logMessage(`CALLING BIDDER ======= ${bidderCode}`);
      pbjs._bidsRequested.push(bids);
      events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bids);
      adapter.callBids(bids);
    } else {
      utils.logError(`Adapter trying to be called which does not exist: ${bidderCode} adaptermanager.callBids`);
    }
  });
};

exports.registerBidAdapter = function (bidAdaptor, bidderCode) {
  if (bidAdaptor && bidderCode) {

    if (typeof bidAdaptor.callBids === CONSTANTS.objectType_function) {
      _bidderRegistry[bidderCode] = bidAdaptor;

    } else {
      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
    }

  } else {
    utils.logError('bidAdaptor or bidderCode not specified');
  }
};

exports.aliasBidAdapter = function (bidderCode, alias) {
  var existingAlias = _bidderRegistry[alias];

  if (typeof existingAlias === CONSTANTS.objectType_undefined) {
    var bidAdaptor = _bidderRegistry[bidderCode];

    if (typeof bidAdaptor === CONSTANTS.objectType_undefined) {
      utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
    } else {
      try {
        let newAdapter = null;
        if (bidAdaptor instanceof BaseAdapter) {
          //newAdapter = new bidAdaptor.constructor(alias);
          utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
        } else {
          newAdapter = bidAdaptor.createNew();
          newAdapter.setBidderCode(alias);
          this.registerBidAdapter(newAdapter, alias);
        }
      } catch (e) {
        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
      }
    }
  } else {
    utils.logMessage('alias name "' + alias + '" has been already specified.');
  }
};

/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */

// here be adapters
/** END INSERT ADAPTERS */
