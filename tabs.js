(function(){
	"use strict";

	var UNDEF;
	var touchEnabled = "ontouchstart" in document.documentElement;
	var pressEvent   = touchEnabled ? "touchend" : "click";


	var uniqueID = (function(){
		var IDs     = {};
		var indexes = {};
		
		
		/**
		 * Generate a unique ID for a DOM element.
		 *
		 * By default, minimalist IDs like "_1" or "_2" are generated using internally
		 * tracked incrementation. Uglier, more collision-proof IDs can be generated by
		 * passing a truthy value to the function's first argument.
		 *
		 * Irrespective of whether values are being generated simply or randomly, the
		 * document tree is always consulted first to ensure a duplicate ID is never
		 * returned.
		 *
		 * @param {String}  prefix - Prefix prepended to result. Default: "_"
		 * @param {Boolean} random - Generate collision-proof IDs using random symbols
		 * @param {Number}  length - Length of random passwords. Default: 6
		 * @return {String}
		 */
		return function(prefix, complex, length){
			length     = +(length || 6);
			var result =  (prefix = prefix || "_");
			
			/** Simple IDs */
			if(!complex){
				
				/** Set this prefix's starting index if it's not been used yet */
				if(!indexes[prefix])
					indexes[prefix] = 0;
				
				result += ++indexes[prefix];
			}
			
			/** Uglier/safer IDs */
			else{
				var chars   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				chars      += chars.toLowerCase();
				result     += chars[ Math.round(Math.random() * (chars.length - 1)) ];
				chars      += "0123456789";
				
				while(result.length < length)
					result += chars[ Math.round(Math.random() * (chars.length - 1))];
			}
			
			return IDs[result] || document.getElementById(result)
				? uniqueID(prefix, complex)
				: (IDs[result] = true, result);
		}
	}());




	function TabGroup(el, options){
		var THIS           = this;
		var elClasses      = el.classList;
		var elStyle        = el.style;
		var _disabled;
		var _active;
		var _topSlug;
		
		
		Object.defineProperties(THIS, {
			update: { value: update },
			
			/** Whether the tab-group's been deactivated */
			disabled: {
				get: function(){ return _disabled; },
				set: function(input){
					if((input = !!input) !== _disabled){
						_disabled   = input;
						enabledClass  && elClasses.toggle(enabledClass,  !input);
						disabledClass && elClasses.toggle(disabledClass,  input);
						
						for(var i = 0, l = tabs.length; i < l; ++i)
							tabs[i].disabled = input;
						
						input
							? elStyle.paddingTop = null
							: update();
					}
				}
			},
			
			
			
			/** Zero-based index of the currently-selected tab */
			active: {
				get: function(){ return _active || 0 },
				set: function(input){
					if((input = +input) !== _active){
						
						for(var tab, i = 0, l = tabs.length; i < l; ++i){
							tab = tabs[i];
							tab.active = input === tab.index;
						}
							
						_active = input;
					}
				}
			},
			
			
			/** Additional padding to insert between the tab labels and the container's top-edge */
			topSlug: {
				get: function(){ return _topSlug },
				set: function(input){
					input = +input;
					if(input < 0) input = 0;
					if((input = +input) !== _topSlug){
						_topSlug = input;
						update();
					}
				}
			}
		});
		
		
		options            = options || {};
		var activeClass    = options.activeClass || "active";
		var enabledClass   = UNDEF === options.enabledClass ? "tabs" : options.enabledClass;
		var disabledClass  = options.disabledClass;
		
		THIS.el            = el;
		THIS.activeClass   = activeClass;
		THIS.noAria        = !!options.noAria;
		THIS.noKeys        = !!options.noKeys;
		
		/** Create a list of Tab instances from the container's children */
		var tabs           = [];
		var index          = 0;
		var children       = el.children;
		var firstActiveTab;
		for(var i = 0, l = children.length; i < l; ++i){
			var child = children[i];
			
			/** If the tab element's flagged as active, store the current index */
			if(UNDEF === firstActiveTab && child.classList.contains(activeClass))
				firstActiveTab = index;
			
			var tab   = new Tab(child, THIS);
			tab.index = index++;
			tabs.push(tab);
		}
		THIS.tabs    = tabs;
		
		
		/**
		 * If a tab element was flagged in the DOM as active, default to its index if
		 * the option hash's .active property wasn't explicitly provided. Otherwise,
		 * default to the first tab.
		 */
		THIS.active  = UNDEF === options.active
			? (UNDEF === firstActiveTab ? 0 : firstActiveTab)
			: options.active;
		
		THIS.disabled = !!options.disabled;
		

		function update(){
			var maxHeight = 0;
			var offset    = 0;
			
			for(var tab, i = 0, l = tabs.length; i < l; ++i){
				tab        = tabs[i];
				tab.offset = offset;
				var box    = tab.label.getBoundingClientRect();
				offset    += Math.round(box.right  - box.left) + tab.marginRight;
				var height = Math.round(box.bottom - box.top);
				if(height > maxHeight)
					maxHeight = height;
				
				if(UNDEF !== _topSlug)
					tab.label.style.top = _topSlug > 0 ? _topSlug + "px" : null;
			}
			elStyle.paddingTop = (maxHeight + (_topSlug || 0)) + "px";
		}
	}




	function Tab(el, group){
		var THIS = this;

		var label        = el.firstElementChild;
		var panel        = el.lastElementChild;
		var elClasses    = el.classList;
		var labelStyle   = label.style;
		var activeClass  = group.activeClass;
		var onKeyDown;
		var onPress;

		var _disabled;
		var _ariaEnabled;
		var _marginLeft;
		var _marginRight;
		var _marginTop;
		var _marginBottom;
		var _active;
		var _offset;
		
		
		Object.defineProperties(THIS, {
			
			/** Whether the tab's been deactivated */
			disabled: {
				get: function(){ return _disabled },
				set: function(input){
					if((input = !!input) !== !!_disabled){
						
						/** Deactivated */
						if(_disabled = input){
							label.removeEventListener(pressEvent, onPress);
							elClasses.remove(activeClass);
							labelStyle.left = null;
							
							if(UNDEF !== _marginLeft)   labelStyle.marginLeft   = null;
							if(UNDEF !== _marginRight)  labelStyle.marginRight  = null;
							if(UNDEF !== _marginTop)    labelStyle.marginTop    = null;
							if(UNDEF !== _marginBottom) labelStyle.marginBottom = null;
							
							if(onKeyDown){
								label.removeEventListener("keydown", onKeyDown);
								label.removeAttribute("tabindex");
							}
							
							if(_ariaEnabled){
								THIS.ariaEnabled = false;
								_ariaEnabled = true;
							}
						}
						
						/** Reactivated */
						else{
							label.addEventListener(pressEvent, onPress);
							group.active === THIS.index && elClasses.add(activeClass);
							labelStyle.left = _offset + "px";
							
							if(onKeyDown){
								label.addEventListener("keydown", onKeyDown);
								label.tabIndex = 0;
							}
						}
					}
				}
			},
			
			
			/** Add or remove relevant ARIA attributes from the tab's elements */
			ariaEnabled: {
				get: function(){ return _ariaEnabled; },
				set: function(input){
					if((input = !!input) !== !!_ariaEnabled){
						_ariaEnabled = input;
						
						/** Enable ARIA-attribute management */
						if(input){
							label.setAttribute("role", "tab");
							panel.setAttribute("role", "tabpanel");
							
							
							/** Ensure the tab's elements have unique ID attributes. */
							var labelSuffix  = "-heading";
							var panelSuffix  = "-content";
							var elID         = el.id;
							var id;
							
							/** Neither of the tab's elements have an ID attribute */
							if(!label.id && !panel.id){
								id        = elID || uniqueID("a");
								label.id  = id + labelSuffix;
								panel.id  = id + panelSuffix;
							}
							
							/** Either the label or panel lack an ID */
							else if(!panel.id) panel.id   = (elID || label.id) + panelSuffix;
							else if(!label.id) label.id   = (elID || panel.id) + labelSuffix;
							
							/** Finally, double-check each element's ID is really unique */
							var $ = function(s){ return document.querySelectorAll("#"+s); };
							while($(panel.id).length > 1 || $(label.id).length > 1){
								id       = uniqueID("a");
								panel.id = id + panelSuffix;
								label.id = id + labelSuffix;
							}
							
							/** Update ARIA attributes */
							label.setAttribute("aria-controls",   panel.id);
							panel.setAttribute("aria-labelledby", label.id);				
							
							
							/** Update the attributes that're controlled by .active's setter */
							label.setAttribute("aria-selected",  _active);
							label.setAttribute("aria-expanded",  _active);
							panel.setAttribute("aria-hidden",   !_active);
						}
						
						/** Disabling; remove all relevant attributes */
						else{
							label.removeAttribute("role");
							label.removeAttribute("aria-controls");
							label.removeAttribute("aria-selected");
							label.removeAttribute("aria-expanded");
							
							panel.removeAttribute("role");
							panel.removeAttribute("aria-labelledby");
							panel.removeAttribute("aria-hidden");
						}
					}
				}
			},

			
			/** Whether the tab is currently selected/visible */
			active: {
				get: function(){ return _active },
				set: function(input){
					if((input = !!input) !== _active){
						elClasses.toggle(activeClass, input);
						_active = input;
						
						/** Update ARIA attributes */
						if(_ariaEnabled){
							label.setAttribute("aria-selected", input);
							label.setAttribute("aria-expanded", input);
							panel.setAttribute("aria-hidden",  !input);
						}
					}
				}
			},
			

			/** Label's horizontal offset at the top of the container */
			offset: {
				get: function(){
					if(UNDEF === _offset)
						_offset = parseInt(labelStyle.left) || 0;
					return _offset;
				},
				set: function(input){
					if((input = +input) !== _offset){
						_offset = input;
						labelStyle.left = input + "px";
					}
				}
			},
			
			
			
			/** Label element's left horizontal margin */
			marginLeft: {
				get: function(){
					UNDEF === _marginLeft && evalMargins();
					return _marginLeft;
				},
				set: function(input){
					if((input = +input) !== _marginLeft){
						_marginLeft = input;
						labelStyle.marginLeft = input + "px";
						group.update();
					}
				}
			},

			
			
			/** Label element's right horizontal margin */
			marginRight: {
				get: function(){
					UNDEF === _marginRight && evalMargins();
					return _marginRight;
				},
				set: function(input){
					if((input = +input) !== _marginRight){
						_marginRight = input;
						labelStyle.marginRight = input + "px";
						group.update();
					}
				}
			},
			
			
			/** Label element's top vertical margin */
			marginTop: {
				get: function(){
					UNDEF === _marginTop && evalMargins();
					return _marginTop;
				},
				set: function(input){
					if((input = +input) !== _marginTop){
						_marginTop = input;
						labelStyle.marginTop = input + "px";
						group.update();
					}
				}
			},
			
			
			/** Label element's bottom vertical margin */
			marginBottom: {
				get: function(){
					UNDEF === _marginBottom && evalMargins();
					return _marginBottom;
				},
				set: function(input){
					if((input = +input) !== _marginBottom){
						_marginBottom = input;
						labelStyle.marginBottom = input + "px";
						group.update();
					}
				}
			}
		});


		
		THIS.el          = el;
		THIS.group       = group;
		THIS.label       = label;
		THIS.panel       = panel;
		THIS.ariaEnabled = !group.noAria;
		
		if(!group.noKeys){
			label.tabIndex = 0;
			label.addEventListener("keydown", onKeyDown = function(e){
				var key = e.keyCode;
				var tab;
				
				switch(key){
					
					/** Right arrow: Focus on next tab */
					case 39:{
						if(tab = group.tabs[1 + THIS.index])
							tab.label.focus();
						else return;
						break;
					}
					
					/** Left arrow: Focus on previous tab */
					case 37:{
						if(tab = group.tabs[THIS.index - 1])
							tab.label.focus();
						else return;
						break;
					}
					
					/** Enter: Select tab */
					case 13:{
						group.active = THIS.index;
						break;
					}
					
					/** Escape: clear focus */
					case 27:{
						label.blur();
						break;
					}
					
					default:{
						return;
					}
				}
				
				e.preventDefault();
				return false;
			});
		}
		
		label.addEventListener(pressEvent, onPress = function(e){
			if(e.type !== "touchend" || e.cancelable){
				group.active = THIS.index;
				e.preventDefault();
			}
			return false;
		});
		
		
		/** Update the tab's internal margin properties by scanning the label's calculated style */
		function evalMargins(){
			var style     = window.getComputedStyle(label);
			_marginLeft   = Math.round(parseFloat(style.marginLeft))   || 0;
			_marginRight  = Math.round(parseFloat(style.marginRight))  || 0;
			_marginTop    = Math.round(parseFloat(style.marginTop))    || 0;
			_marginBottom = Math.round(parseFloat(style.marginBottom)) || 0;
			return style;
		}
	}


	/** If IE8PP exists, it means the author wants/needs IE8 support. See also: tinyurl.com/fixIE8-9 */
	if("function" === typeof IE8PP)
		TabGroup = IE8PP(TabGroup),
		Tab      = IE8PP(Tab);
	
	
	/** Export */
	window.TabGroup = TabGroup;
}());
