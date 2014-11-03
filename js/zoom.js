/*!
 * zoom.js 0.3
 * http://lab.hakim.se/zoom-js
 * MIT licensed
 *
 * Copyright (C) 2011-2014 Hakim El Hattab, http://hakim.se
 *
 * Modified by Ken Sugiura (Nov 1, 2014)
 */

var zoom = ( function ( window, document ) {

	var TRANSITION_DURATION = 800;

	var	PAN_RANGE           = 0.12,
		PAN_DISTANCE        = 14;

	// The current zoom level (scale)
	var level  = 1;

	// The current mouse position, used for panning
	var mouseX = 0,
		mouseY = 0;

	// Timeout before pan is activated
	var panEngageTimeout  = -1,
		panUpdateInterval = -1;

	// Timeout for callback function
	var callbackTimeout = -1;

	var supportsTransforms;

	// Viewport and content to be zoomed
	var outerElem,
		innerElem;

	// Whether zoomed content is fixed or scrollable
	var isZoomFixed = false;

	// Wait until DOM is loaded before initializing zoom.js
	document.addEventListener( 'DOMContentLoaded', function () {

		// Check for transform support so that we can fallback otherwise
		supportsTransforms = 	'WebkitTransform' in document.body.style ||
								'MozTransform'    in document.body.style ||
								'msTransform'     in document.body.style ||
								'OTransform'      in document.body.style ||
								'transform'       in document.body.style;

		// Set default innerElem and outerElem to body and window
		setInnerElem( document.body );
		outerElem = window;

		// Add events

		// Zoom out if the user hits escape
		document.addEventListener( 'keyup', function ( event ) {
			if ( level !== 1 && event.keyCode === 27 ) {
				out();
			}
		} );

		// Monitor mouse movement for panning
		document.addEventListener( 'mousemove', function ( event ) {
			if ( level !== 1 ) {
				mouseX = event.clientX;
				mouseY = event.clientY;
			}
		} );

		document.addEventListener( 'click', function ( event ) {
			window.console.log('clickX : ' + event.pageX + ', clickY : ' + event.pageY + '');
		} );

	} );

	/**
	 * Specify the HTML element that is enlarged
	 * default is document.body
	 *
	 * @param {Element} elem
	 */
	function setInnerElem ( elem ) {
		if ( elem instanceof Element ) {
			innerElem = elem;
			// scrollable zoom does not work with easings
			if ( supportsTransforms && isZoomFixed ) {
				// The easing that will be applied when we zoom in/out
				var innerElemStyle = innerElem.style;
				innerElemStyle.transition       = 'transform '         + TRANSITION_DURATION + 'ms ease';
				innerElemStyle.OTransition      = '-o-transform '      + TRANSITION_DURATION + 'ms ease';
				innerElemStyle.msTransition     = '-ms-transform '     + TRANSITION_DURATION + 'ms ease';
				innerElemStyle.MozTransition    = '-moz-transform '    + TRANSITION_DURATION + 'ms ease';
				innerElemStyle.WebkitTransition = '-webkit-transform ' + TRANSITION_DURATION + 'ms ease';
			}
			if ( innerElem.parentNode instanceof Element ) {
				outerElem = innerElem.parentNode;
				outerElem.style.overflow = 'auto';
			}
			else {
				outerElem = window;
			}
		}
	}

	/**
	 * Applies the CSS required to zoom in, prefers the use of CSS3
	 * transforms but falls back on zoom for IE.
	 *
	 * @param {Object} rect
	 * @param {Number} scale
	 */
	function magnify ( rect, scale ) {
		var scrollOffset   = getScrollOffset(),
			outerRect      = getOuterRect(),
			innerElemStyle = innerElem.style;

		// Ensure a width/height is set
		rect.width  = rect.width  || 1;
		rect.height = rect.height || 1;

		// Center the rect within the zoomed viewport
		rect.x -= ( outerRect.width  - ( rect.width  * scale ) ) / 2;
		rect.y -= ( outerRect.height - ( rect.height * scale ) ) / 2;

		if ( supportsTransforms ) {
			// Reset
			if ( scale === 1 ) {
				innerElemStyle.transform       = '';
				innerElemStyle.OTransform      = '';
				innerElemStyle.msTransform     = '';
				innerElemStyle.MozTransform    = '';
				innerElemStyle.WebkitTransform = '';
			}
			// Scale
			else {
				var origin    = '0 0';
					transform = '';

				if ( isZoomFixed ) {
					origin     = scrollOffset.x + 'px ' + scrollOffset.y + 'px';
					transform += 'translate(' + -rect.x +'px, '+ -rect.y + 'px) ';
				}

				transform += 'scale(' + scale + ') ';

				innerElemStyle.transformOrigin       = origin;
				innerElemStyle.OTransformOrigin      = origin;
				innerElemStyle.msTransformOrigin     = origin;
				innerElemStyle.MozTransformOrigin    = origin;
				innerElemStyle.WebkitTransformOrigin = origin;

				innerElemStyle.transform       = transform;
				innerElemStyle.OTransform      = transform;
				innerElemStyle.msTransform     = transform;
				innerElemStyle.MozTransform    = transform;
				innerElemStyle.WebkitTransform = transform;
			}
		}
		else {
			// Reset
			if ( scale === 1 ) {
				innerElemStyle.position = '';
				innerElemStyle.left     = '';
				innerElemStyle.top      = '';
				innerElemStyle.width    = '';
				innerElemStyle.height   = '';
				innerElemStyle.zoom     = '';
			}
			// Scale
			else {
				innerElemStyle.position = 'relative';
				if ( isZoomFixed ) {
					innerElemStyle.left = ( - ( scrollOffset.x + rect.x ) / scale ) + 'px';
					innerElemStyle.top  = ( - ( scrollOffset.y + rect.y ) / scale ) + 'px';
				}
				innerElemStyle.width    = ( scale * 100 ) + '%';
				innerElemStyle.height   = ( scale * 100 ) + '%';
				innerElemStyle.zoom     = scale;
			}
		}

		level = scale;
	}

	/**
	 * Pan the document when the mouse cursor approaches the edges
	 * of the viewport.
	 */
	function pan () {
		var scrollOffset = getScrollOffset(),
			outerRect    = getOuterRect(),
			rangeX       = outerRect.width  * PAN_RANGE,
			rangeY       = outerRect.height * PAN_RANGE,
			mouseOffsetX = mouseX - outerRect.left,
			mouseOffsetY = mouseY - outerRect.top;

		// Up
		if ( mouseOffsetY < rangeY && mouseOffsetY > 0 ) {
			scrollOuterRect(
				scrollOffset.x,
				scrollOffset.y - ( 1 - ( mouseOffsetY / rangeY ) ) * ( PAN_DISTANCE / level )
			);
		}
		// Down
		else if ( mouseOffsetY > outerRect.height - rangeY && mouseOffsetY < outerRect.height ) {
			scrollOuterRect(
				scrollOffset.x,
				scrollOffset.y + ( 1 - ( outerRect.height - mouseOffsetY ) / rangeY ) * ( PAN_DISTANCE / level )
			);
		}

		// Left
		if ( mouseOffsetX < rangeX && mouseOffsetX > 0 ) {
			scrollOuterRect(
				scrollOffset.x - ( 1 - ( mouseOffsetX / rangeX ) ) * ( PAN_DISTANCE / level ),
				scrollOffset.y
			);
		}
		// Right
		else if ( mouseOffsetX > outerRect.width - rangeX && mouseOffsetX < outerRect.width ) {
			scrollOuterRect(
				scrollOffset.x + ( 1 - ( outerRect.width - mouseOffsetX ) / rangeX ) * ( PAN_DISTANCE / level ),
				scrollOffset.y
			);
		}
	}

	/**
	 * Zooms in on either a rectangle or HTML element.
	 *
	 * @param {Object} options
	 *
	 *   (required)
	 *   - element: HTML element to zoom in on
	 *   OR
	 *   - x/y: coordinates in non-transformed space to zoom in on
	 *   - width/height: the portion of the screen to zoom in on
	 *   - scale: can be used instead of width/height to explicitly set scale
	 *
	 *   (optional)
	 *   - callback: call back when zooming in ends
	 *   - padding: spacing around the zoomed in element
	 */
	function to ( options ) {

		// Due to an implementation limitation we can't zoom in
		// to another element without zooming out first
		if ( level !== 1 ) {
			out();
		}
		else {
			options.x = options.x || 0;
			options.y = options.y || 0;
			options.centerX = getOuterRect().width  / 2;
			options.centerY = getOuterRect().height / 2;

			// If an element is set, that takes precedence
			if ( !!options.element ) {
				// Space around the zoomed in element to leave on screen
				var padding = ( typeof options.padding === 'number' ) ? options.padding : 20,
					bounds  = options.element.getBoundingClientRect(),
					coords  = getAbsolutePos( options.element );

				options.x       = bounds.left   - padding;
				options.y       = bounds.top    - padding;
				options.width   = bounds.width  + ( padding * 2 );
				options.height  = bounds.height + ( padding * 2 );
				options.centerX = coords.x + bounds.width  / 2;
				options.centerY = coords.y + bounds.height / 2;
			}

			// If width/height values are set, calculate scale from those values
			if ( options.width !== undefined && options.height !== undefined ) {
				var outerRect = getOuterRect();
				options.scale = Math.max( Math.min( outerRect.width / options.width, outerRect.height / options.height ), 1 );
			}

			// ???
			if ( options.scale > 1 ) {
				options.x = Math.max( options.x * options.scale, 0 );
				options.y = Math.max( options.y * options.scale, 0 );

				magnify( options, options.scale );

				if ( options.pan !== false ) {
					// Wait with engaging panning as it may conflict with the
					// zoom transition
					panEngageTimeout = window.setTimeout( function () {
						panUpdateInterval = window.setInterval( pan, 1000 / 60 );
					}, TRANSITION_DURATION );
				}

				if ( options.callback instanceof Function ) {
					callbackTimeout = window.setTimeout( options.callback, TRANSITION_DURATION );
				}

				if ( !isZoomFixed ) {
					window.console.log( 'centerX : ' + options.centerX +', centerY : '+ options.centerY );
					scrollCenterToPoint( options.centerX, options.centerY );
				}
			}
		}
	}

	/**
	 * Resets the document zoom state to its default.
	 *
	 * @param {Object} options
	 *   - callback: call back when zooming out ends
	 */
	function out ( options ) {
		window.clearTimeout  ( panEngageTimeout );
		window.clearInterval ( panUpdateInterval );
		window.clearTimeout  ( callbackTimeout );

		magnify( { x: 0, y: 0 }, 1 );

		if( options && options.callback instanceof Function ) {
			window.setTimeout( options.callback, TRANSITION_DURATION );
		}

		level = 1;
	}

	// Utilities

	function getAbsolutePos ( elem ) {
		var x = elem.offsetLeft,
			y = elem.offsetTop;
		while ( elem.offsetParent && elem !== document.body && elem !== outerElem ) {
			elem = elem.offsetParent;
			x += elem.offsetLeft;
			y += elem.offsetTop;
		}
		return { x : x, y : y };
	}

	function getOuterRect () {
		if ( outerElem === window ) {
			return {
				top    : 0,
				left   : 0,
				bottom : window.innerHeight,
				right  : window.innerWidth,
				width  : window.innerWidth,
				height : window.innerHeight
			};
		}
		else if ( outerElem instanceof Element ) {
			return outerElem.getBoundingClientRect();
		}
	}

	function getScrollOffset () {
		if ( outerElem === window ) {
			return {
				x : ( window.scrollX !== undefined ) ? window.scrollX : window.pageXOffset,
				y : ( window.scrollY !== undefined ) ? window.scrollY : window.pageYOffset
			};
		}
		else if ( outerElem instanceof Element ) {
			return {
				x : outerElem.scrollLeft,
				y : outerElem.scrollTop
			};
		}
	}

	function scrollOuterRect ( x, y ) {
		if ( outerElem === window ) {
			window.scroll( x, y );
		}
		else if ( outerElem instanceof Element ) {
			outerElem.scrollLeft = x;
			outerElem.scrollTop  = y;
		}
	}

	function scrollCenterToPoint ( x, y ) {
		var outerRect = getOuterRect();
		scrollOuterRect(
			( x * level - outerRect.width  / 2 ),
			( y * level - outerRect.height / 2 )
		);
	}

	// Export

	return {

		to  : to,
		out : out,

		// Alias

		magnify   : function ( options, elem ) {
			if ( elem instanceof Element ) {
				setInnerElem( elem );
			}
			else {
				setInnerElem( document.body );
				outerElem = window;
			}
			to( options );
		},
		reset     : function () { out(); },
		zoomLevel : function () { return level; },
		fixed     : function ( bool ) {
			out();
			isZoomFixed = !!bool;
		}

	};

} )( window, document );

