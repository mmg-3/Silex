/**
 * Silex, live web creation
 * http://projects.silexlabs.org/?/silex/
 *
 * Copyright (c) 2012 Silex Labs
 * http://www.silexlabs.org/
 *
 * Silex is available under the GPL license
 * http://www.silexlabs.org/silex/silex-licensing/
 */

/**
 * @fileoverview
 *   This class is used to access Silex elements properties
 */

goog.provide('silex.model.Property');
goog.require('silex.Config');
goog.require('silex.service.SilexTasks');


/**
 * @constructor
 * @param  {silex.types.Model} model  model class which holds the other models
 * @param  {silex.types.View} view  view class which holds the other views
 */
silex.model.Property = function(model, view) {
  // store the model and the view
  /**
   * @type {silex.types.Model}
   */
  this.model = model;
  /**
   * @type {silex.types.View}
   */
  this.view = view;
};


/**
 *
 * @typedef {{rule: CSSRule, parent: (CSSRule|CSSStyleSheet), index: number}}
 */
silex.model.Property.CSSRuleInfo;



/**
 * constant for the ID of the style tag
 * containing all CSS rules for the elements on stage
 * which are being edited with the wysiwyg
 * @const
 */
silex.model.Property.INLINE_STYLE_TAG_CLASS_NAME = 'silex-inline-styles';

silex.model.Property.JSON_STYLE_TAG_CLASS_NAME = 'silex-json-styles';
/**
 * constant for the prefix of the IDs given to Silex editable elements
 * @const
 */
silex.model.Property.ELEMENT_ID_PREFIX = 'silex-id-';


/**
 * constant for the attribute name holding the IDs given to Silex editable elements
 * @const
 */
silex.model.Property.ELEMENT_ID_ATTR_NAME = 'data-silex-id';


/**
 * constant for the value of media query for mobile version
 * @const
 * @static
 */
silex.model.Property.MOBILE_MEDIA_QUERY = '(max-width: 400px)'


/**
 * the current file's silex style sheet which holds silex elements styles
 * this is stored for performance reasons
 * @type {?CSSStyleSheet}
 */
silex.model.Property.prototype.styleSheet = null;


/**
 * a number appended to the current timestamp in order to make unique Silex IDs
 * @type {number}
 */
silex.model.Property.prototype.nextId = 0;


/**
 * @type {Object}
 */
silex.model.Property.prototype.stylesObj = {};


/**
 * @type {Object}
 */
silex.model.Property.prototype.mobileStylesObj = {};


/**
 * get/set Silex ID
 * @param {Element} element
 * @return {?string} uniqueId
 */
silex.model.Property.prototype.getSilexId = function(element) {
  return element.getAttribute(silex.model.Property.ELEMENT_ID_ATTR_NAME);
};


/**
 * get/set Silex ID
 * @param {Element} element
 * @param {string} uniqueId
 */
silex.model.Property.prototype.setSilexId = function(element, uniqueId) {
  var oldId = this.getSilexId(element);
  if (oldId) {
    element.classList.remove(oldId);
  }
  element.setAttribute(silex.model.Property.ELEMENT_ID_ATTR_NAME, uniqueId);
  element.classList.add(uniqueId);
};


/**
 * @param {string} uniqueId
 * @param {?Document=} doc docment of the iframe containing the website
 * @return {Element}
 */
silex.model.Property.prototype.getElementBySilexId = function(uniqueId, doc) {
  doc = doc || this.model.file.getContentDocument();
  return doc.querySelector('[' + silex.model.Property.ELEMENT_ID_ATTR_NAME + '="' + uniqueId + '"]');
};


/**
 * @param {?Document=} doc docment of the iframe containing the website
 * @return {string}
 */
silex.model.Property.prototype.generateSilexId = function(doc) {
  var uniqueId;
  do {
    uniqueId = Date.now().toString() + '-' + (this.nextId++);
  } while (this.getElementBySilexId(uniqueId, doc));
  return uniqueId;
};


/**
 * @param {Element} element
 * @param {?Document=} doc docment of the iframe containing the website
 */
silex.model.Property.prototype.initSilexId = function(element, doc) {
  // add the selector for this element
  var idAndClass = silex.model.Property.ELEMENT_ID_PREFIX + this.generateSilexId(doc);
  this.setSilexId(element, idAndClass);
};


silex.model.Property.prototype.saveStyles = function(doc) {
  var styleTag = doc.querySelector('.' + silex.model.Property.JSON_STYLE_TAG_CLASS_NAME);
  if (!styleTag) {
    styleTag = doc.createElement('script');
    styleTag.classList.add(silex.model.Property.JSON_STYLE_TAG_CLASS_NAME);
    goog.dom.appendChild(doc.head, styleTag);
  }
  styleTag.innerHTML = JSON.stringify({
    "desktop": this.stylesObj,
    "mobile": this.mobileStylesObj
  });
  console.log('saveStyles', styleTag, this.stylesObj);
}

silex.model.Property.prototype.loadStyles = function(doc) {
  var styleTag = doc.querySelector('.' + silex.model.Property.JSON_STYLE_TAG_CLASS_NAME);
  if(styleTag != null) {
    let styles = /** @type {Object} */ (JSON.parse(styleTag.innerHTML));
    if(styles && styles['desktop'] && styles['mobile']) {
      this.stylesObj = styles['desktop'];
      this.mobileStylesObj = styles['mobile'];
    }
    else {
      console.error('Error: could not retreve desktop and mobile styles from .' + silex.model.Property.JSON_STYLE_TAG_CLASS_NAME);
    }
  }
  else {
    this.stylesObj = {};
    console.error('Error: no JSON styles array found in the dom');
  }
}

/**
 * check existance and possibly create a style tag holding Silex elements styles
 * @param {Document} doc docment of the iframe containing the website
 * @return {Element}
 */
silex.model.Property.prototype.initStyles = function(doc) {
  // make sure of the existance of the style tag with Silex definitions
  var styleTag = doc.querySelector('.' + silex.model.Property.INLINE_STYLE_TAG_CLASS_NAME);
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.classList.add(silex.model.Property.INLINE_STYLE_TAG_CLASS_NAME);
    styleTag.setAttribute('type', 'text/css');
    goog.dom.appendChild(doc.head, styleTag);
  }
  //retrieve the style sheet with Silex definitions
  this.styleSheet = null;
  for (var idx in doc.styleSheets) {
    if (doc.styleSheets[idx].ownerNode && doc.styleSheets[idx].ownerNode == styleTag) {
      this.styleSheet =  doc.styleSheets[idx];
    }
  }
  if(this.styleSheet === null) {
    console.error('no stylesheet found');
  }
  return styleTag;
};


/**
 * get / set the css style of an element
 * this creates or update a rule in the style tag with id INLINE_STYLE_TAG_CLASS_NAME
 * if opt_style is null this will remove the rule
 * @param {Element} element
 * @param {Object|null} style
 */
silex.model.Property.prototype.setStyle = function(element, style) {
  var elementId =  /** @type {string} */ (this.getSilexId(element));
  // store in JSON
  if(this.view.workspace.getMobileEditor()) {
    this.mobileStylesObj[elementId] = style;
  }
  else {
    this.stylesObj[elementId] = style;
  }
  // convert style to string
  var styleStr = silex.utils.Style.styleToString(style || '');
  // we use the class name because elements have their ID as a css class too
  styleStr = '.' + elementId + '{' + styleStr + '} ';
  if(this.view.workspace.getMobileEditor()) {
    styleStr = '@media ' + silex.model.Property.MOBILE_MEDIA_QUERY + '{' + styleStr + '}';
  }
  // find the index of the rule for the given element
  var cssRuleObject = this.findCssRule(elementId, this.view.workspace.getMobileEditor());
  // update or create the rule
  if (cssRuleObject) {
    this.styleSheet.deleteRule(cssRuleObject.index);
  }
  if (style) {
    this.styleSheet.insertRule(styleStr, this.styleSheet.cssRules.length);
  }
};


/**
 * get / set the css style of an element
 * @param {Element} element
 * @param {?boolean=} opt_isMobile
 * @return {Object|null}
 */
silex.model.Property.prototype.getStyle = function(element, opt_isMobile) {
  var elementId =  /** @type {string} */ (this.getSilexId(element));
  if(opt_isMobile === true || this.view.workspace.getMobileEditor()) {
    return this.mobileStylesObj[elementId];
  }
  return this.stylesObj[elementId];
};


/**
 * @param {string} elementId
 * @param {boolean} isMobile
 * @return {silex.model.Property.CSSRuleInfo|null} null if not found
 */
silex.model.Property.prototype.findCssRule = function (elementId, isMobile) {
  // find the rule for the given element
  for (var idx=0; idx < this.styleSheet.cssRules.length; idx++) {
    let cssRule = this.styleSheet.cssRules[idx];
    // we use the class name because elements have their ID as a css class too
    if(isMobile === false) {
      if(cssRule.selectorText === '.' + elementId) {
        return {
          rule: cssRule,
          parent: this.styleSheet,
          index: parseInt(idx, 10)
        }
      }
    }
    else if(cssRule.media
      && cssRule.cssRules
      && cssRule.cssRules[0]
      && cssRule.cssRules[0].selectorText === '.' + elementId) {
      return {
        rule: cssRule.cssRules[0],
        parent: cssRule,
        index: 0
      }
    }
  }
  return null;
 };


/**
 * update Silex style tag with the styles of all elements
 * because the dom do not update automatically when we change document.styleSheets
 * @param {Document} doc docment of the iframe containing the website
 */
silex.model.Property.prototype.updateStylesInDom = function(doc) {
  var styleTag = doc.querySelector('.' + silex.model.Property.INLINE_STYLE_TAG_CLASS_NAME);
  styleTag.innerHTML = this.getAllStyles(doc);
};


/**
 * @param {Document} doc docment of the iframe containing the website
 * @return {string} the string defining all elements styles
 */
silex.model.Property.prototype.getAllStyles = function(doc) {
  var elements = doc.querySelectorAll('body, .' + silex.model.Body.EDITABLE_CLASS_NAME);
  var allStyles = '';
  goog.array.forEach(elements, function(element) {
    var elementId =  /** @type {string} */ (this.getSilexId(element));
    // desktop
    let styleStr = silex.utils.Style.styleToString(this.getStyle(element, false), '\n    ');
    if(styleStr != '') {
      styleStr = '.' + elementId + ' {' + styleStr + '\n}\n';
      allStyles += styleStr;
    }
    // mobile
    styleStr = silex.utils.Style.styleToString(this.getStyle(element, true), '\n    ');
    if(styleStr != '') {
      styleStr = '.' + elementId + ' {' + styleStr + '\n}\n';
      styleStr = '@media ' + silex.model.Property.MOBILE_MEDIA_QUERY + '{' + styleStr + '}';
      allStyles += styleStr;
    }
  }, this);
  return allStyles;
};


/**
 * compute the bounding box of the given elements
 * it takes into account only the elements which have top, left, width and height set in px
 * @param {Array.<Element>|{length:number}} elements
 * @return {{top:?number, left:?number, width:?number, height:?number}} the bounding box containing all the elements
 */
silex.model.Property.prototype.getBoundingBox = function(elements) {
  // compute the positions and sizes, which may end up to be NaN or a number
  var top = NaN,
      left = NaN,
      right = NaN,
      bottom = NaN;
  // browse all elements and compute the containing rect
  goog.array.forEach(elements, function(element) {
    // retrieve the styles strings (with "px")
    var elementStyle = this.getStyle(element);
    if (!elementStyle) {
      elementStyle = {
        'top': '',
        'left': '',
        'width': '',
        'height': ''
      };
    }
    else {
      if(!elementStyle.top) elementStyle.top = '';
      if(!elementStyle.left) elementStyle.left = '';
      if(!elementStyle.width) elementStyle.width = '';
      if(!elementStyle.height) elementStyle.height = '';
    }
    // compute the styles numerical values, which may end up to be NaN or a number
    var elementMinWidth = elementStyle.minWidth ? parseFloat(elementStyle.minWidth.substr(0, elementStyle.minWidth.indexOf('px'))) : null;
    var elementWidth = Math.max(elementMinWidth || 0, parseFloat(elementStyle.width.substr(0, elementStyle.width.indexOf('px'))));
    var elementMinHeight = elementStyle.minHeight ? parseFloat(elementStyle.minHeight.substr(0, elementStyle.minHeight.indexOf('px'))) : null;
    var elementHeight = Math.max(elementMinHeight || 0, parseFloat(elementStyle.height.substr(0, elementStyle.height.indexOf('px'))));
    var elementTop = parseFloat(elementStyle.top.substr(0, elementStyle.top.indexOf('px')));
    var elementLeft = parseFloat(elementStyle.left.substr(0, elementStyle.left.indexOf('px')));
    var elementRight = (elementLeft || 0) + elementWidth;
    var elementBottom = (elementTop || 0) + elementHeight;
    // take the smallest top and left and the bigger bottom and rigth
    top = isNaN(top) ? elementTop : Math.min(top, isNaN(elementTop) ? top : elementTop);
    left = isNaN(left) ? elementLeft : Math.min(left, isNaN(elementLeft) ? left : elementLeft);
    bottom = isNaN(bottom) ? elementBottom : Math.max(bottom, isNaN(elementBottom) ? bottom : elementBottom);
    right = isNaN(right) ? elementRight : Math.max(right, isNaN(elementRight) ? right : elementRight);
  }, this);
  // no value for NaN results
  var res = {};
  if (!isNaN(top)) {
    res.top = top;
  }
  if (!isNaN(left)) {
    res.left = left;
  }
  if (!isNaN(bottom)) {
    res.height = bottom - (top || 0);
  }
  if (!isNaN(right)) {
    res.width = right - (left || 0);
  }
  return res;
};


/**
 * get / set the css style of an element
 * this creates or update a rule in the style tag with id INLINE_STYLE_TAG_CLASS_NAME
 * @param {Element} element
 * @param {?boolean=} opt_computed use window.getComputedStyle instead of the element's stylesheet
 * @return {Object|null}
 */
// silex.model.Property.prototype.getStyleObject = function (element, opt_computed) {
//   var cssStyleDeclaration = null;
//   if(opt_computed !== true) {
//     var cssRule = null;
//     var elementId =  /** @type {string} */ (this.getSilexId(element));
//     if(this.view.workspace.getMobileEditor()) {
//       let cssRuleObject = this.findCssRuleIndex(elementId, true);
//       if(cssRuleObject) {
//         cssRule = cssRuleObject.rule;
//       }
//     }
//     if(!cssRule) {
//       let cssRuleObject = this.findCssRuleIndex(elementId, false);
//       if(cssRuleObject) {
//         cssRule = cssRuleObject.rule;
//       }
//     }
//     if(cssRule) {
//       cssStyleDeclaration = cssRule.style;
//     }
//   }
//   else {
//     cssStyleDeclaration = this.model.file.getContentWindow().getComputedStyle(element);
//   }
//   if(cssStyleDeclaration) {
//     // build an object with only the keys which are set
//     return silex.utils.Style.styleToObject(cssStyleDeclaration);
//   }
//   return null;
// };

