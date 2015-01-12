/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */
// jQuery combobox widget

(function ($) {
  $.widget('$.combobox', {
    // Default widget options
    options: {
      options: [],
      valueKey: 'value',
      labelKey: 'label',
    },

    _create: function () {
      // Create wrapper for the combobox elements
      var self = this, $element = this.element;
      var $wrapper = this.$wrapper = $('<div>').addClass('ui-combobox')
                         .insertAfter($element.hide());

      // Create the autocompletion list that drives the combobox
      var $list = this.$list = $('<input>').appendTo($wrapper).val($element.val())
                      .addClass('ui-widget ui-widget-content ui-state-default ui-corner-left')
                      .autocomplete({ delay: 0, minLength: 0, source: $.proxy(this, '_getOptions') });
      var listData = $list.data('ui-autocomplete');
      listData._renderItem = this._renderOption;
      listData._resizeMenu = function () { this.menu.element.outerWidth($wrapper.outerWidth()); };
      $list.click(function () { $list.autocomplete('search', ''); });

      // Create the dropdown button
      var unfolded = false;
      $('<a>').appendTo($wrapper)
              .attr({ tabIndex: -1, title: 'Show all' })
              .button().text('\u25be')
              .removeClass('ui-corner-all').addClass('ui-corner-right')
              .mousedown(function () { unfolded = $list.autocomplete('widget').is(':visible'); })
              .click(function () { $list.focus(); if (!unfolded) $list.click(); });

      // Keep the autocomplete list and element in sync
      this._on($element, { change: elementChanged });
      this._on($list, { autocompleteselect: listChanged, autocompletechange: listChanged });
      function elementChanged(event) { updateListLabel($element.val()); }
      function listChanged(event, value) {
        var newValue = value && value.item && value.item.value || $list.val();
        if ($element.val() !== newValue) {
          updateListLabel(newValue);
          $element.val(newValue);
          $element.trigger('change');
        }
        event.preventDefault();
      }
      // Tries to set an appropriate label for the given list value
      function updateListLabel(value) {
        var label = self.options.onlyLabelTerms ? '' : value;
        self._options.some(function (o) { if (o.value === value) return label = o.label; });
        $list.val(label);
      }

      // Apply all options
      for (var key in this.options)
        this._setOption(key, this.options[key]);
    },

    // Sets a specific widget option
    _setOption: function (key, value) {
      switch (key) {
      // Sets the items out of which the user can choose
      case 'options':
        var valueKey = this.options.valueKey, labelKey = this.options.labelKey;
        this._options = value.map(function (option) {
          return { value: option[valueKey], label: option[labelKey] };
        });
        break;
      }
    },

    // Gets matching items out of which the user can choose
    _getOptions: function (request, response) {
      var termMatcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), 'i');
      response(this._options.filter(function (option) {
        return (option.label && termMatcher.test(option.label)) || termMatcher.test(option.value);
      }));
    },

    // Gets the HTML code for a specific item
    _renderOption: function (list, item) {
      return $('<li>').append($('<span>').text(item.label).addClass('value'), ' ',
                              $('<span>').text(item.value).addClass('label'))
                      .appendTo(list);
    },

    // Removes the widget
    _destroy: function () {
      this.element.show();
      this.$wrapper.remove();
    },
  });
})(jQuery);
