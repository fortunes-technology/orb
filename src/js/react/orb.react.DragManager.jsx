/* global module, require, react, reactUtils */
/*jshint eqnull: true*/

'use strict';

var dragManager = module.exports.DragManager = (function() {
	
	var _pivotComp = null;
	
	var _currDragElement = null;
	var _currDropTarget = null;
	var _currDropIndicator = null;

	var _dragNode = null;
	var _dropTargets = [];
	var _dropIndicators = [];

	function doElementsOverlap(elem1Rect, elem2Rect) {
		return !(elem1Rect.right < elem2Rect.left || 
                elem1Rect.left > elem2Rect.right || 
                elem1Rect.bottom < elem2Rect.top || 
                elem1Rect.top > elem2Rect.bottom);
	}

	function setCurrDropTarget(dropTarget, callback) {
		if(_currDropTarget) {
			signalDragEnd(_currDropTarget, function() {
				_currDropTarget = dropTarget;
				signalDragOver(dropTarget, callback);
			});
		} else {
			_currDropTarget = dropTarget;
			signalDragOver(dropTarget, callback);
		}
	}

	function setCurrDropIndicator(dropIndicator) {
		if(_currDropIndicator) {
			signalDragEnd(_currDropIndicator, function() {
				_currDropIndicator = dropIndicator;
				signalDragOver(dropIndicator);
			});
		} else {
			_currDropIndicator = dropIndicator;
			signalDragOver(dropIndicator);
		}
	}

	function signalDragOver(target, callback) {
		if(target && target.onDragOver) {
			target.onDragOver(callback);
		} else if(callback) {
			callback();
		}
	}

	function signalDragEnd(target, callback) {
		if(target && target.onDragEnd) {
			target.onDragEnd(callback);
		} else if(callback) {
			callback();
		}
	}

	function getDropTarget() {
		return reactUtils.forEach(_dropTargets, function(target) {
			if(target.component.state.isover) {
				return target;
			}
		}, true);
	}

	function getDropIndicator() {
		return reactUtils.forEach(_dropIndicators, function(indicator) {
			if(indicator.component.state.isover) {
				return indicator;
			}
		}, true);
	}

	var _initialized = false;

	return {
		init: function(pivotComp) {
			_initialized = true;
			_pivotComp = pivotComp;
		},
		setDragElement: function(elem) {
			
			var prevDragElement = _currDragElement;
			_currDragElement = elem;
			if(_currDragElement != prevDragElement) {
				if(elem == null) {

					if(_currDropTarget) {
						var position = _currDropIndicator != null ? _currDropIndicator.position : null;
						_pivotComp.moveButton(prevDragElement, _currDropTarget.component.props.axetype, position);
					}

					_dragNode = null;
					setCurrDropTarget(null);
					setCurrDropIndicator(null);

				} else {
					_dragNode = _currDragElement.getDOMNode();
				}
			}
		},
		registerTarget: function(target, axetype, dragOverHandler, dargEndHandler) {
			_dropTargets.push({
				component: target,
				axetype: axetype,
				onDragOver: dragOverHandler,
				onDragEnd: dargEndHandler
			});
		},
		unregisterTarget: function(target) {
			var tindex;
			for(var i = 0; i < _dropTargets.length; i++) {
				if(_dropTargets[i].component == target) {
					tindex = i;
					break;
				}
			}
			if(tindex != null) {
				_dropTargets.splice(tindex, 1);
			}
		},
		registerIndicator: function(indicator, axetype, position, dragOverHandler, dargEndHandler) {
			_dropIndicators.push({
				component: indicator,
				axetype: axetype,
				position: position,
				onDragOver: dragOverHandler,
				onDragEnd: dargEndHandler
			});
		},
		unregisterIndicator: function(indicator) {
			var iindex;
			for(var i = 0; i < _dropIndicators.length; i++) {
				if(_dropIndicators[i].component == indicator) {
					iindex = i;
					break;
				}
			}
			if(iindex != null) {
				_dropIndicators.splice(iindex, 1);
			}
		},
		elementMoved: function() {
			if(_currDragElement != null) {
				var dragNodeRect = _dragNode.getBoundingClientRect();
				var foundTarget;

				reactUtils.forEach(_dropTargets, function(target) {
					if(!foundTarget) {
						var tnodeRect = target.component.getDOMNode().getBoundingClientRect();
						var isOverlap = doElementsOverlap(dragNodeRect, tnodeRect);
						if(isOverlap) {
							foundTarget = target;
							return;
						}
					}
				}, true);

				if(foundTarget) {
					/* Added By Fortunes Technology - Begin
					 This is for required, when someone want to restrict rows, and column and value fields. Right now, we can move any fields into value, and column and rows.
					 Value fields wouldn't make much sense when they are move into column or row.
					 * */

					console.log("Found Target");
					var currentName = _currDragElement.props.field.name;

					var pgConfig = _currDragElement.props.pivotTableComp.pgrid.config;

					if(foundTarget.axetype)
					{// That means target is not fields
						if(foundTarget.axetype == 3)
						{// This means data
							if(!(pgConfig.fieldsForData.includes(currentName)))
							{
								setCurrDropTarget(null);
								setCurrDropIndicator(null);
								return;
							}
						}
						else if(foundTarget.axetype == 1)
						{//This means column
							if(!(pgConfig.fieldsForColumn.includes(currentName)))
							{
								setCurrDropTarget(null);
								setCurrDropIndicator(null);
								return;
							}
						}
						else if(foundTarget.axetype == 2)
						{//This means row
							if(!(pgConfig.fieldsForRow.includes(currentName)))
							{
								setCurrDropTarget(null);
								setCurrDropIndicator(null);
								return;
							}
						}
					}
					//We need to do something here. Here we got the Target. Here we need to compare whether it's the right target
					/* Added By Fortunes Technology - End */


					setCurrDropTarget(foundTarget, function() {
						var foundIndicator = null;

						reactUtils.forEach(_dropIndicators, function(indicator, index) {
							if(!foundIndicator) {
								var elementOwnIndicator = indicator.component.props.axetype === _currDragElement.props.axetype &&
														  indicator.component.props.position === _currDragElement.props.position;

								var targetIndicator = indicator.component.props.axetype === foundTarget.component.props.axetype;
								if(targetIndicator && !elementOwnIndicator) {	
									var tnodeRect = indicator.component.getDOMNode().getBoundingClientRect();
									var isOverlap = doElementsOverlap(dragNodeRect, tnodeRect);
									if(isOverlap) {
										foundIndicator = indicator;
										return;
									}
								}
							}
						});

						if(!foundIndicator) {
							var axeIndicators = _dropIndicators.filter(function(indicator) {
								return indicator.component.props.axetype === foundTarget.component.props.axetype;
							});
							if(axeIndicators.length > 0) {
								foundIndicator = axeIndicators[axeIndicators.length - 1];
							}
						}
						setCurrDropIndicator(foundIndicator);
					});
				}
				/* Added By Fortunes Technology - Begin
				 So What we're doing here, when there are no targets, we remove the targets.
				 Currently when there are no target, it use last one as target, damaging user experience.
				* */
				else
				{
					setCurrDropTarget(null);
					setCurrDropIndicator(null);
				}
				/* Added By Fortunes Technology - End */
			}
		}
	};
}());