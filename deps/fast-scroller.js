/**
 * FastScroller – Copyright 2016 Ruben Verborgh
 *
 * Strongly based on infinite-scroller
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function(scope) {

// Number of items to instantiate beyond current view in the scroll direction.
var RUNWAY_ITEMS = 50;

// Number of items to instantiate beyond current view in the opposite direction.
var RUNWAY_ITEMS_OPPOSITE = 10;

scope.FastScrollerSource = function() {
}

scope.FastScrollerSource.prototype = {
  /**
   * Fetch more items from the data source. This should try to fetch at least
   * count items but may fetch more as desired. Subsequent calls to fetch should
   * fetch items following the last successful fetch.
   * @param {number} count The minimum number of items to fetch for display.
   * @return {Promise(Array<Object>)} Returns a promise which will be resolved
   *     with an array of items.
   */
  fetch: function(count) {},

  /**
   * Render an item, re-using the provided item div if passed in.
   * @param {Object} item The item description from the array returned by fetch.
   * @param {?Element} element If provided, this is a previously displayed
   *     element which should be recycled for the new item to display.
   * @return {Element} The constructed element to be displayed in the scroller.
   */
  render: function(item, div) {},
};


/**
 * Construct an infinite scroller.
 * @param {Element} scroller The scrollable element to use as the infinite
 *     scroll region.
 * @param {FastScrollerSource|Function} source A renderer and, optionally,
           provider of the content to be displayed in the scroll region.
 */
scope.FastScroller = function(scroller, source) {
  // Parse arguments
  if (scroller.length && scroller[0])
    scroller = scroller[0];
  if (!source.render && typeof source === 'function')
    source = { render: source };

  // Initialize scroller
  this.reset_();
  this.scroller_ = scroller;
  this.source_ = source;
  this.requestInProgress_ = false;
  this.scroller_.addEventListener('scroll', this.onScroll_.bind(this));
  window.addEventListener('resize', this.onResize_.bind(this));

  // Create an element to force the scroller to allow scrolling to a certain
  // point.
  this.scrollRunway_ = document.createElement('div');
  this.scrollRunway_.className = 'scrollRunway';
  // Internet explorer seems to require some text in this div in order to
  // ensure that it can be scrolled to.
  this.scrollRunway_.textContent = ' ';
  this.scrollRunwayEnd_ = 0;
  this.scrollRunway_.style.position = 'absolute';
  this.scrollRunway_.style.height = '1px';
  this.scrollRunway_.style.width = '1px';
  this.scrollRunway_.style.transition = 'transform 0.2s';
  this.scroller_.appendChild(this.scrollRunway_);
  this.onResize_();
}

scope.FastScroller.prototype = {
  /**
   * Resets the scroller to its initial state
   */
  reset_: function() {
    this.anchorItem = {index: 0, offset: 0};
    this.firstAttachedItem_ = 0;
    this.lastAttachedItem_ = 0;
    this.anchorScrollTop = 0;
    this.items_ = [];
    this.loadedItems_ = 0;
    this.scrollRunwayEnd_ = 0;
  },

  /**
   * Called when the browser window resizes to adapt to new scroller bounds and
   * layout sizes of items within the scroller.
   */
  onResize_: function() {
    // Reset the cached size of items in the scroller as they may no longer be
    // correct after the item content undergoes layout.
    for (var i = 0; i < this.items_.length; i++) {
      this.items_[i].height = 0;
    }
    this.onScroll_();
  },

  /**
   * Called when the scroller scrolls. This determines the newly anchored item
   * and offset and then updates the visible elements, requesting more items
   * from the source if we've scrolled past the end of the currently available
   * content.
   */
  onScroll_: function() {
    var delta = this.scroller_.scrollTop - this.anchorScrollTop;
    // Special case, if we get to very top, always scroll to top.
    if (this.scroller_.scrollTop == 0) {
      this.anchorItem = {index: 0, offset: 0};
    } else {
      this.anchorItem = this.calculateAnchoredItem(this.anchorItem, delta);
    }
    this.anchorScrollTop = this.scroller_.scrollTop;
    var lastScreenItem = this.calculateAnchoredItem(this.anchorItem, this.scroller_.offsetHeight);
    if (delta < 0)
      this.fill(this.anchorItem.index - RUNWAY_ITEMS, lastScreenItem.index + RUNWAY_ITEMS_OPPOSITE);
    else
      this.fill(this.anchorItem.index - RUNWAY_ITEMS_OPPOSITE, lastScreenItem.index + RUNWAY_ITEMS);
  },

  /**
   * Calculates the item that should be anchored after scrolling by delta from
   * the initial anchored item.
   * @param {{index: number, offset: number}} initialAnchor The initial position
   *     to scroll from before calculating the new anchor position.
   * @param {number} delta The offset from the initial item to scroll by.
   * @return {{index: number, offset: number}} Returns the new item and offset
   *     scroll should be anchored to.
   */
  calculateAnchoredItem: function(initialAnchor, delta) {
    if (delta == 0)
      return initialAnchor;
    delta += initialAnchor.offset;
    var i = initialAnchor.index;
    if (delta < 0) {
      while (delta < 0 && i > 0 && this.items_[i - 1].height) {
        delta += this.items_[i - 1].height;
        i--;
      }
    } else {
      while (delta > 0 && i < this.items_.length && this.items_[i].height && this.items_[i].height < delta) {
        delta -= this.items_[i].height;
        i++;
      }
    }
    return {
      index: i,
      offset: delta,
    };
  },

  /**
   * Sets the range of items which should be attached and attaches those items.
   * @param {number} start The first item which should be attached.
   * @param {number} end One past the last item which should be attached.
   */
  fill: function(start, end) {
    this.firstAttachedItem_ = Math.max(0, start);
    this.lastAttachedItem_ = end;
    this.attachContent();
  },

  /**
   * Attaches content to the scroller and updates the scroll position if
   * necessary.
   */
  attachContent: function() {
    // Collect nodes which will no longer be rendered for reuse.
    // TODO: Limit this based on the change in visible items rather than looping
    // over all items.
    var i;
    var unusedNodes = [];
    var first = this.firstAttachedItem_;
    var last = Math.min(this.lastAttachedItem_, this.items_.length);
    for (i = 0; i < this.items_.length; i++) {
      // Skip the items which should be visible.
      if (i == first) {
        i = last - 1;
        continue;
      }
      if (this.items_[i].node) {
          unusedNodes.push(this.items_[i].node);
          this.items_[i].node = null;
      }
    }

    // Create DOM nodes.
    for (i = first; i < last; i++) {
      if (!this.items_[i].node) {
        var node = this.source_.render(this.items_[i].data, unusedNodes.pop());
        if (node.length && node[0])
          node = node[0];
        // Maybe don't do this if it's already attached?
        node.style.position = 'absolute';
        this.items_[i].top = -1;
        this.scroller_.appendChild(node);
        this.items_[i].node = node;
      }
    }

    // Remove all unused nodes
    while (unusedNodes.length) {
      this.scroller_.removeChild(unusedNodes.pop());
    }

    // Get the height of all nodes which haven't been measured yet.
    for (i = first; i < last; i++) {
      if (!this.items_[i].height) {
        this.items_[i].height = this.items_[i].node.offsetHeight;
      }
    }

    // Fix scroll position in case we have realized the heights of elements
    // that we didn't used to know.
    // TODO: We should only need to do this when a height of an item becomes
    // known above.
    this.anchorScrollTop = 0;
    for (i = 0; i < this.anchorItem.index; i++) {
      this.anchorScrollTop += this.items_[i].height;
    }
    this.anchorScrollTop += this.anchorItem.offset;

    // Position all nodes.
    var curPos = this.anchorScrollTop - this.anchorItem.offset;
    i = this.anchorItem.index;
    while (i > first) {
      curPos -= this.items_[i - 1].height;
      i--;
    }
    while (i < first) {
      curPos += this.items_[i].height;
      i++;
    }
    for (i = first; i < last; i++) {
      if (curPos !== this.items_[i].top) {
        this.items_[i].node.style.transform = 'translateY(' + curPos + 'px)';
        this.items_[i].top = curPos;
      }
      curPos += this.items_[i].height || this.tombstoneSize_;
    }

    this.scrollRunwayEnd_ = Math.max(this.scrollRunwayEnd_, curPos);
    this.scrollRunway_.style.transform = 'translate(0, ' + this.scrollRunwayEnd_ + 'px)';
    this.scroller_.scrollTop = this.anchorScrollTop;

    this.maybeRequestContent();

  },

  /**
   * Requests additional content if we don't have enough currently.
   */
  maybeRequestContent: function() {
    // Don't issue another request if one is already in progress as we don't
    // know where to start the next request yet.
    if (this.requestInProgress_)
      return;
    var itemsNeeded = this.lastAttachedItem_ - this.loadedItems_;
    if (itemsNeeded <= 0)
      return;
    this.requestInProgress_ = true;
    var lastItem = this.items_[this.loadedItems_ - 1];
    if (this.source_.fetch)
      this.source_.fetch(itemsNeeded).then(this.addContent.bind(this));
  },

  /**
   * Adds the given array of items to the items list and then calls
   * attachContent to update the displayed content.
   * @param {Array<Object>} items The array of items to be added to the infinite
   *     scroller list.
   */
  addContent: function(items) {
    this.requestInProgress_ = false;
    var startIndex = this.items_.length;
    for (var i = 0; i < items.length; i++) {
      this.items_[this.loadedItems_++] = {
        'data': items[i],
        'node': null,
        'height': 0,
        'top': 0,
      }
    }
    // Attach content only if a visible change was made
    if (startIndex < this.lastAttachedItem_)
      this.attachContent();
  },

  /**
   * Removes all items from the list.
   */
  removeAll: function() {
    // Remove all nodes
    for (var i = 0; i < this.items_.length; i++) {
      if (this.items_[i].node)
        this.scroller_.removeChild(this.items_[i].node);
    }
    this.reset_();
    // Scroll to top
    this.scroller_.scrollTop = 0;
    this.onScroll_();
  },
}
})(self);
