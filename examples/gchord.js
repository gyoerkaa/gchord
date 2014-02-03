/* 
    Chord graph library
    Description: Creates chord graphs from google spreadsheets or (javascript) arrays
    License: GPL v2
    Author: Attila Gyoerkoes
    Author URL: http://www.github.com/gyoerkaa
*/ 
var gchord = {};

gchord.svgNS   = 'http://www.w3.org/2000/svg';
gchord.xlinkNS = 'http://www.w3.org/1999/xlink';

// Constructor
gchord.ChordDiagram = function() {
    //this.containerElement = container;
    this.dataColumns = {targetID: 0,                    
                        weight: 1,
                        sourceID: 2,
                        positionHint: 3};
    
    // Layout options
    this.canvasWidth  = 500;
    this.canvasHeight = 500;
    this.graphRadius  = 150;
    this.graphCenter  = {x:250, y:250};  
    this.targetTxtSize  = 12;
    this.targetTxtColor = '#FFFFFF';
    this.targetArcWidth = 65;
    // Angle (polar coords) at which to start and end the drawing of target arcs
    this.targetArcDisplay = {start: Math.PI*1.15, end: Math.PI*1.85};
    this.targetArcLength = {min: this.targetTxtSize/(2*(this.targetArcDisplay.end - this.targetArcDisplay.start)*this.graphRadius),
                            max: (this.targetArcDisplay.end - this.targetArcDisplay.start)};
    this.targetArcLength = {min: 0.5,
                            max: 1};   
    this.sourceTxtSize = 10;   
    this.sourceTxtColor = '#000000';
    // Angle (polar coords) at which to start and end the drawing of sources
    this.sourceDisplay = {start: Math.PI*-0.1, end: Math.PI*1.1};
    // Stroke width for target-source connections
    // Max stroke width is used for max weight
    this.connectWidth = {min: 1, max: 5};
    this.horiTextHelperID = 'horitexthelper';
   
    // We can use an oject to emulate a simple set, 
    // as no removals are necessary
    this.targetList = new Object();
    this.sourceList = new Object();
    
    // Needed for normalization
    this.numTargets = 0;
    this.numSources = 0;
    this.positionHint      = {min: Number.MAX_VALUE, max: Number.MIN_VALUE};
    this.targetWeights     = {min: Number.MAX_VALUE, max: Number.MIN_VALUE, total: 0};
    this.connectionWeights = {min: Number.MAX_VALUE, max: Number.MIN_VALUE, total: 0};
    this.usePositionHint = true;
    this.useAutoRotate   = true;
    
    /*                  
    // Alternative RGB Color palette
    this.colorPalette = [ [ 63,   0, 255], // Indigo     (B)
                          [  0, 255,  63], // Malachite  (G)
                          [255,  63,   0], // Vermillion (R)
                          [  0,  63, 255], // Sapphire   (B)
                          [ 63, 255,   0], // Harlequin  (G)
                          [255,   0,  63], // Crimson    (R)
                          [  0, 191, 255], // Cerulean   (B)
                          [191, 255,   0], // Lime Green (G)
                          [255,   0, 191], // Fuchsia    (R)
                          [191,   0, 255], // Mulberry   (B)
                          [  0, 255, 191], // Turquoise  (G)
                          [255, 191,   0]  // Amber      (R)
                        ];*/ 
    this.colorPalette = [ [  0,  72, 140],
                          [ 30, 108,  11],
                          [240, 180,   0],
                          [179,   0,  35],
                          [ 67,  76,  67],
                          [216,  64,   0],
                          [ 51,  38,   0],
                          [79,   49,  79],
                          [ 46, 139,  87],
                          [ 79,  79,  49]
                        ];                       
    this.colorID = 0;
}


/**
 * Utility function to escape html special characters
 *
 * @param {string} text String to escape
 * @return {string} Escaped string
 */
gchord.ChordDiagram.prototype.escapeHtml = function(text) {
    if (text == null) {
        return '';
    }
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#039;");
}


/**
 * Utility function to escape css special characters
 *
 * @param {string} text String to escape
 * @return {string} Escaped string
 */
gchord.ChordDiagram.prototype.escapeCSS = function(value) {
    var string = String(value);
    var length = string.length;
    var index = -1;
    var charCode;
    var result = '';
    var firstCharCode = string.charCodeAt(0);
    while (++index < length) {
        charCode = string.charCodeAt(index);

        // If the character is NULL (U+0000), then throw an
        // `InvalidCharacterError` exception and terminate these steps.
        if (charCode == 0x0000) {
            throw Error('INVALID_CHARACTER_ERR');
        }

        if ((charCode >= 0x0001 && charCode <= 0x001F) ||
            (charCode >= 0x007F && charCode <= 0x009F) ||
            (index == 0 && charCode >= 0x0030 && charCode <= 0x0039) ||
            (index == 1 && charCode >= 0x0030 && charCode <= 0x0039 && firstCharCode == 0x002D)
        ) {
            // http://dev.w3.org/csswg/cssom/#escape-a-character-as-code-point
            result += '\\' + charCode.toString(16) + ' ';
            continue;
        }

        // If the character is the second character and is `-` (U+002D) and the
        // first character is `-` as well, […]
        if (index == 1 && charCode == 0x002D && firstCharCode == 0x002D) {
            // http://dev.w3.org/csswg/cssom/#escape-a-character
            result += '\\' + string.charAt(index);
            continue;
        }

        // If the character is not handled by one of the above rules and is
        // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
        // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
        // U+005A), or [a-z] (U+0061 to U+007A), […]
        if (charCode >= 0x0080 ||
            charCode == 0x002D ||
            charCode == 0x005F ||
            charCode >= 0x0030 && charCode <= 0x0039 ||
            charCode >= 0x0041 && charCode <= 0x005A ||
            charCode >= 0x0061 && charCode <= 0x007A
        ) {
            // the character itself
            result += string.charAt(index);
            continue;
        }

        // Otherwise, the escaped character.
        // http://dev.w3.org/csswg/cssom/#escape-a-character
        result += '\\' + string.charAt(index);

    }
    return result;
}


/**
 * Utility function to check the sanity of input data
 *
 * @param {object} data Data
 * @return {boolean} True, if checks are passed
 */  
gchord.ChordDiagram.prototype.checkInputSanity = function(data) {
    if (data.getNumberOfRows() < 4) {
        this.usePositionHint = false;
    }
    
    if (data.getNumberOfRows() < 3) {
        //this.containerElement.innerHTML = 
        //    'Error: Invalid data. Minimum of 3 rows required';
        return false;
    }
    if (data.getNumberOfColumns < 2) {
        //this.containerElement.innerHTML = 
        //    'Error: Invalid data. Minimum of 2 columns required';
        return false;
    }
    return true;
}


/**
 * Set some options
 * TODO: create documentation of possible options
 *
 * @param {object} options A set of options as object
 */
gchord.ChordDiagram.prototype.setOptions = function(options) {
    if (options.hasOwnProperty('canvasSize') && (typeof options.canvasSize === 'number') ) {
        this.canvasWidth  = options.canvasSize;
        this.canvasHeight = options.canvasSize;
        this.graphCenter.x = this.canvasWidth/2;
        this.graphCenter.y = this.canvasHeight/2;
    }
    
    if (options.hasOwnProperty('graphRadius') && (typeof options.graphRadius === 'number') ) {
        if (options.graphRadius > Math.min(this.canvasWidth, 
                                           this.canvasHeight)) {
            //this.containerElement.innerHTML = 
            //    'Error: Invalid option. Graph radius(' + options.graphRadius + ')larger than canvas size (' + options.canvasSize + ')';
            return false;
        }
        this.graphRadius  = options.graphRadius;
    }
    
    if (options.hasOwnProperty('targetTextColor') && (typeof options.targetTextColor === 'string') ) {
        this.targetTxtColor = options.targetTextColor;
    } 
    
    if (options.hasOwnProperty('sourceTextColor') && (typeof options.sourceTextColor === 'string') ) {
        this.sourceTxtColor = options.sourceTextColor;
    } 
    
    if (options.hasOwnProperty('targetArcWidth') && (typeof options.targetTextColor === 'number') ) {
        this.targetArcWidth = options.targetArcWidth;
    } 
    
    if (options.hasOwnProperty('dataColumns')) {           
        if (options.dataColumns.hasOwnProperty('targetID')) {
            this.dataColumns.targetID = options.dataColumns.targetID; 
        }
        if (options.dataColumns.hasOwnProperty('weight')) {
            this.dataColumns.weight = options.dataColumns.weight;
           
        } 
        if (options.dataColumns.hasOwnProperty('sourceID')) {
            this.dataColumns.sourceID = options.dataColumns.sourceID;
        } 
        if (options.dataColumns.hasOwnProperty('positionHint')) {
            this.dataColumns.positionHint = options.dataColumns.positionHint; 
        }
    }
    
    if (options.hasOwnProperty('colorPalette')) {
        this.colorPalette = options.colorPalette;
    }    
    
    return true;
}


/**
 * Creates a new definitions element, which contains a few (invisible) helper 
 * objects.
 *
 * @return {object} The new defs object
 */
gchord.ChordDiagram.prototype.createDefinitions = function() {
    var defElem = document.createElementNS(gchord.svgNS, 'defs');
    
    // Helper elemets
    var horiTextHelper = this.createArc(this.horiTextHelperID, 
                                        0, 
                                        1.9999*Math.PI,
                                        (this.graphRadius+this.targetArcWidth*0.4));
    defElem.appendChild(horiTextHelper); 
    
    // Stylesheet
    var styleElem = this.createCSS();
    defElem.appendChild(styleElem);
    
    return defElem;
}


/**
 * Creates a new style element.
 *
 * @return {object} The new css object
 */
gchord.ChordDiagram.prototype.createCSS = function() {
    // Stylesheet
    var styleElem = document.createElementNS(gchord.svgNS, 'style');
    styleElem.setAttributeNS(null, 'type', 'text/css');
    
    //styleElem.appendChild(document.createTextNode('<![CDATA['));
    styleElem.appendChild(document.createTextNode('.ttext {'));
    styleElem.appendChild(document.createTextNode('font-size: ' + this.targetTxtSize + 'px;')); 
    styleElem.appendChild(document.createTextNode('font-variant: small-caps;'));
    styleElem.appendChild(document.createTextNode('fill: ' + this.targetTxtColor + ';'));
    styleElem.appendChild(document.createTextNode('}'));
    styleElem.appendChild(document.createTextNode('.stext {'));
    styleElem.appendChild(document.createTextNode('font-size: ' + this.sourceTxtSize + 'px;'));
    styleElem.appendChild(document.createTextNode('fill: ' + this.sourceTxtColor + ';'));
    styleElem.appendChild(document.createTextNode('}'));    
    //styleElem.appendChild(document.createTextNode(']]>')); 
   
    return styleElem;
}


/**
 * Creates a new script element, containing scripts for mouseover events
 *
 *
 * @return {object} The new script object
 */
gchord.ChordDiagram.prototype.createScripts = function() {
    var scriptElem = document.createElementNS(gchord.svgNS, 'script');
    scriptElem.setAttributeNS(null, 'type', 'text/ecmascript');

    // TODO: Move this script to separate file   
    var CDATANode;
    CDATANode = document.createTextNode('<![CDATA[');
    scriptElem.appendChild(CDATANode);
    CDATANode = document.createTextNode('// Write scripts here');
    scriptElem.appendChild(CDATANode);   
    CDATANode = document.createTextNode(']]>');
    scriptElem.appendChild(CDATANode);
    
    return scriptElem;
}


/**
 * Creates a new text element horizontal to the defining circle of the graph.
 * Coordinates are defined by an angle (polar coordinates with constant radius, 
 * 0° = 3 o'clock, angles are in radians).
 * The text element will be centered between the two angles.
 *  
 *
 * @param {string} text         Text
 * @param {string} elementId    Unique ID of the text element
 * @param {number} angle        Position of the text element (in rad)
 * @param {number} radius       Position of the text element 
 * @param {string} cssClass     css class
 * @return {object} The new text object.
 */
gchord.ChordDiagram.prototype.createTextHori = function(text,
                                                        elementId, 
                                                        angleStart,
                                                        angleEnd,
                                                        cssClass) {
    var txtElem;  
    txtElem = document.createElementNS(gchord.svgNS, 'text');
    txtElem.setAttributeNS(null, 'x', this.graphCenter.x);
    txtElem.setAttributeNS(null, 'y', this.graphCenter.y);
    txtElem.setAttributeNS(null, 'id', elementId);
    txtElem.setAttributeNS(null, 'text-anchor', 'middle');
    txtElem.setAttributeNS(null, 'class', cssClass);
    
    var txtPath = document.createElementNS(gchord.svgNS, 'textPath');
    txtPath.setAttributeNS(gchord.xlinkNS, 'href', '#'+this.horiTextHelperID);
    txtPath.setAttributeNS(null, 'startOffset', ((angleEnd+angleStart)/2)*(this.graphRadius+this.targetArcWidth*0.4));
    
    txtElem.appendChild(txtPath);
    txtPath.appendChild(document.createTextNode(text));
    return txtElem;
}


/**
 * Creates a new text element vertical to the defining circle of the graph.
 * Coordinates are defined by an angle (polar coordinates with constant radius, 
 * 0° = 3 o'clock)
 * Angles are in radians.
 *
 * @param {string} text         Text
 * @param {string} elementId    Unique ID of the text element
 * @param {number} angle        Position of the text element (in rad)
 * @param {number} radius       Position of the text element 
 * @param {string} cssClass     css class
 * @return {object} The new text object.
 */
gchord.ChordDiagram.prototype.createTextVert = function(text,
                                                        elementId, 
                                                        angle,
                                                        radius,
                                                        cssClass) {
    var txtElem = document.createElementNS(gchord.svgNS, 'text');
    txtElem.setAttributeNS(null, 'id', elementId);
    txtElem.setAttributeNS(null, 'class', cssClass);
    
    // Sometimes it's radians, sometimes degrees 
    // ... gonna put those people on my list.
    var modifiedAngle = angle*180/Math.PI; 
   
    // For better readability:
    // Rotate text by 180°, when between 90° and 270°
    if ((modifiedAngle > 90) && (modifiedAngle < 270)) {
        txtElem.setAttributeNS(null, 'text-anchor', 'end');
        txtElem.setAttributeNS(null, 'x', this.graphCenter.x - radius);
        
        modifiedAngle = (modifiedAngle-180);
    } else {
        txtElem.setAttributeNS(null, 'text-anchor', 'front');
        txtElem.setAttributeNS(null, 'x', this.graphCenter.x + radius);       
    }
    txtElem.setAttributeNS(null, 'y', this.graphCenter.y + this.sourceTxtSize/4);
    
    var rotation = 'rotate(' + 
                   modifiedAngle +
                   ' ' +
                   this.graphCenter.x.toString() + 
                   ',' + 
                   this.graphCenter.y.toString() +
                   ')';
    txtElem.setAttributeNS(null, 'transform', rotation);   
    txtElem.appendChild(document.createTextNode(text));
    
    return txtElem;
}


/**
 * Creates a new arc. Start and end points are defined
 * by an angle (polar coordinates with equal radius, 0° = 3 o'clock)
 * Angles are in radians.
 *
 * @param {string} elementId   Unique ID of the arc.
 * @param {number} angle1      Starting angle of the arc.
 * @param {number} angle2      Ending angle of the arc.
 * @param {number} radius      Radius of the arc.
 * @param {string} strokeColor Stroke color of the arc. 
 * @param {number} strokeWidth Stroke width of the arc.
 * @return {object} The new path object.
 */
gchord.ChordDiagram.prototype.createArc = function(elementId, 
                                                   angleStart, 
                                                   angleEnd, 
                                                   radius, 
                                                   strokeColor, 
                                                   strokeWidth) {
    // Start and ending points for the arc
    var start = {x:radius * Math.cos(angleStart) + this.graphCenter.x, 
                 y:radius * Math.sin(angleStart) + this.graphCenter.y};   
    var end   = {x:radius * Math.cos(angleEnd) + this.graphCenter.x, 
                 y:radius * Math.sin(angleEnd) + this.graphCenter.y};
    
    // Make sure angleEnd > angleStart. Add 360° if necessary.
    var larc_flag = (((2*Math.PI+angleEnd)-angleStart) > Math.PI) ? 1 : 0;
    if (angleEnd > angleStart) {
        larc_flag = ((angleEnd-angleStart) > Math.PI) ? 1 : 0;
    }
    
    var path = document.createElementNS(gchord.svgNS, 'path');
    path.setAttributeNS(null, 'id', elementId);
    path.setAttributeNS(null, 'fill', 'none');
    if (typeof(strokeColor) === 'string') {
        path.setAttributeNS(null, 'stroke', strokeColor);
    } 
    if (typeof(strokeWidth) === 'number') {
        path.setAttributeNS(null, 'stroke-width', strokeWidth);
    }
    path.setAttributeNS(null, 'd', 'M' + start.x + ',' + start.y +
                                   ' A' + radius + ',' + radius +
                                   ' 0 ' +
                                   larc_flag +
                                   ' 1 ' + 
                                   end.x + ',' + end.y);    
    return path;   
}


/**
 * Creates a new quadratic bezier curve. Start and end points are defined
 * by an angle (polar coordinates with equal radius, 0° = 3 o'clock).
 * Control point will be set automatically. Angles are in radians. 
 *
 * @param {string} elementId Unique ID of the curve.
 * @param {number} angleStart Starting angle/point of the curve.
 * @param {number} angleEnd Ending angle/point of the curve.
 * @param {number} radius Radius of the curve.
 * @param {string} strokeColor Stroke color of the curve. 
 * @param {number} strokeWidth Stroke width of the curve.
 * @return {object} The new path object.
 */
gchord.ChordDiagram.prototype.createBezier2 = function(elementId, 
                                                       angleStart, 
                                                       angleEnd,
                                                       radius,    
                                                       strokeColor, 
                                                       strokeWidth) {
    var start = {x:radius * Math.cos(angleStart) + this.graphCenter.x, 
                 y:radius * Math.sin(angleStart) + this.graphCenter.y};
    var end   = {x:radius * Math.cos(angleEnd) + this.graphCenter.x, 
                 y:radius * Math.sin(angleEnd) + this.graphCenter.y};
    
    var path = document.createElementNS(gchord.svgNS, 'path');
    path.setAttributeNS(null, 'id', elementId);
    path.setAttributeNS(null, 'fill', 'none');
    path.setAttributeNS(null, 'stroke', strokeColor);
    path.setAttributeNS(null, 'stroke-width', strokeWidth);
    path.setAttributeNS(null, 'd', 'M' + start.x + ',' + start.y +
                                   ' Q' + this.graphCenter.x + ',' + this.graphCenter.y  + ' ' +
                                          end.x  + ',' + end.y);
    return path;
}


/**
 * Get a color from the palette. 
 * Generates a random color if palette runs out.
 *
 * @return {string} RGB color.
 */
gchord.ChordDiagram.prototype.getColor = function() {   
    var r;
    var g;
    var b;
    if (this.colorID < this.colorPalette.length) {
        r = parseInt(this.colorPalette[this.colorID][0]);
        g = parseInt(this.colorPalette[this.colorID][1]);
        b = parseInt(this.colorPalette[this.colorID][2]);
        this.colorID += 1;
        return 'rgb('+r+','+g+','+b+')';
    } else {
        r = parseInt(Math.random()*255);
        g = parseInt(Math.random()*255);
        b = parseInt(Math.random()*255);
        return 'rgb('+r+','+g+','+b+')';
    }
}


/**
 * Reads data from a google visualization DataTable
 *
 * @param {string|number} sortingWeight Sorting weight 
 * @return {number} Sorting weight as number
 */
gchord.ChordDiagram.prototype.parsePositionHint = function(sortingWeight) {   
    switch (typeof sortingWeight) {
        case 'number':
            return sortingWeight;
            break;
        case 'string':
            return Date.parse(sortingWeight);
            break;
        default:
            return 0;
            break;
    }
    
    return sortingWeight;
}


/**
 * Reads data from a google visualization DataTable
 *
 * @param {object} Google visualization DataTable
 * @param {object} a set of options (optional) 
 */
gchord.ChordDiagram.prototype.fromGoogleDataTable = function(data, options) {
    this.setOptions(options);
    
    var targetID;
    var targetName;
    var connectionWeight;
    var sourceID;
    var sourceName;
    var posHint = ''; // may not be present  
    // Get data from spreadsheet
    for (var row = 0; row < data.getNumberOfRows(); row++) {
        targetID = data.getFormattedValue(row, this.dataColumns.targetID);
        
        if (typeof targetID != 'string') {
            targetID = 'inv';
        } else {
            // Remove whitespaces. A lot of data sets seem to
            // have random whitespaces in their labels.
            targetName = targetID.trim();
            targetID   = this.escapeCSS(targetID.trim());
        }        
        connectionWeight = parseInt(data.getFormattedValue(row, this.dataColumns.weight));        
        if (!isFinite(connectionWeight)) {
            // this connection won't be displayed at all
            connectionWeight = 0; 
        }       
        sourceID = data.getFormattedValue(row, this.dataColumns.sourceID);
        if (typeof sourceID != 'string') {
            sourceID = 'inv';
        } else {
            sourceName = sourceID.trim();
            sourceID   = this.escapeCSS(sourceID.trim());
        }         
        if (this.usePositionHint) {
            posHint = this.parsePositionHint(data.getFormattedValue(row, this.dataColumns.positionHint));
        } else {
            posHint = 0;
        }
          
        // Create a new target if necessary
        if (!this.targetList.hasOwnProperty(targetID)){      
            this.targetList[targetID] = new Object();
            this.targetList[targetID].name = targetName;
            this.targetList[targetID].id = targetID;
            this.targetList[targetID].color = this.getColor();
            this.targetList[targetID].connections = new Array();
            this.targetList[targetID].totalWeight = 0;
            this.numTargets++;           
        }
        // Add target data
        this.positionHint.min = Math.min(this.positionHint.min, posHint);
        this.positionHint.max = Math.max(this.positionHint.max, posHint);
        this.connectionWeights.min = Math.min(this.connectionWeights.min, connectionWeight);
        this.connectionWeights.max = Math.max(this.connectionWeights.max, connectionWeight);
        this.targetList[targetID].connections.push({sourceID: sourceID, 
                                                    weight: connectionWeight, 
                                                    positionHint: posHint});
        this.targetList[targetID].totalWeight += connectionWeight; 
        
        // Create a new source if necessary
        if (!this.sourceList.hasOwnProperty(sourceID)) {
            this.sourceList[sourceID] = new Object();
            this.sourceList[sourceID].name = sourceName;
            this.sourceList[sourceID].id = sourceID;
            this.sourceList[sourceID].svgPos = -1; // invalid Pos
            this.numSources++;
        }
        // Add source data        
        this.connectionWeights.total += connectionWeight;        
    }
    
    for(var target in this.targetList) {
        this.targetWeights.min = Math.min(this.targetWeights.min, this.targetList[target].totalWeight);
        this.targetWeights.max = Math.max(this.targetWeights.max, this.targetList[target].totalWeight);
    }
    
    // Normalize Weights ... doing it later on demand
    
}


gchord.ChordDiagram.prototype.fromArray = function(data, options) {
    // TODO: Ditch googles DataTable completely, convert them to an array and use this method instead
    //       as we don't use any of the built-in functions anyway
}


gchord.ChordDiagram.prototype.fromCSVFile = function(filename, options) {

}


/**
 * Generates the svg object.
 *
 */
gchord.ChordDiagram.prototype.draw = function(containerElement) {    
    var html = [];
 
    html.push('<svg id="chord_graph" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="http://www.w3.org/2000/svg">');
    html.push('</svg>');
    containerElement.innerHTML = html.join('');
    
    var svgDocument = document.getElementById('chord_graph');
    
    svgDocument.setAttributeNS(null, 'version', 1.1);
    svgDocument.setAttributeNS(null, 'width', this.canvasWidth);
	svgDocument.setAttributeNS(null, 'height', this.canvasHeight);
    
    svgDocument.appendChild(this.createDefinitions()); 
    
    // TODO: Add mouseover effects/scripts for better readability 
    //       (reduce opacity for other elements than the highlighted)
    svgDocument.appendChild(this.createScripts());
    
    var useElement = document.createElementNS(gchord.svgNS, 'use');
    useElement.setAttribute('xlink:href', '#'+this.horiTextHelperID);
    svgDocument.appendChild(useElement);
    
    // Create source names in the lower half and save coords
    var angle  = this.sourceDisplay.start;
    var offset = Math.abs(this.sourceDisplay.end-this.sourceDisplay.start)/(this.numSources-1);
    var sourceTxt;
    for(var source in this.sourceList) {
        sourceTxt = this.createTextVert(this.sourceList[source].name, 
                                        this.sourceList[source].id +'_t', 
                                        angle,
                                        this.graphRadius+2,
                                        'stext');
        svgDocument.appendChild(sourceTxt);
        // Save position for source-target connections
        this.sourceList[source].svgPos = angle;
        angle += offset;
    }
    
    // Create target names in the upper half and save coords
    var arcStart;
    var arcEnd = this.targetArcDisplay.start;
    var targetTxt;
    var targetWeight;
    var targetArc;
    var connection;
  
    for(var target in this.targetList) {
        arcStart = arcEnd;
        targetWeight = this.targetList[target].totalWeight;
        arcEnd = arcStart+(targetWeight/this.connectionWeights.total)*(this.targetArcDisplay.end-this.targetArcDisplay.start);

        // Create target arc
        var targetArc = this.createArc(this.targetList[target].id + '_c', 
                                   arcStart, 
                                   arcEnd+0.005, // add a small value to avoid gaps on some renderers
                                   this.graphRadius+this.targetArcWidth/2, 
                                   this.targetList[target].color, 
                                   this.targetArcWidth);
        svgDocument.appendChild(targetArc);
        
        // Create target name                          
        targetTxt = this.createTextHori(this.targetList[target].name, 
                                        this.targetList[target].id + '_t', 
                                        arcStart,
                                        arcEnd,
                                        'ttext');
        var targetTxtNode = svgDocument.appendChild(targetTxt);
        
        // Try to fit the text onto the target bar. Preferably horizontally,
        // but put it vertically if there is a lack of space.
        // Ultimately it is the users responsibility to choose names of 
        // appropriate length          
        if (this.useAutoRotate)
        {
            if (targetTxt.getComputedTextLength() > 1.1*(arcEnd-arcStart)*this.graphRadius) {
                // Horizontal text is too long. Add vertical
                // text instead. May be still too long, but there is
                // only so much we can do.
                svgDocument.removeChild(targetTxtNode);
                targetTxt =  this.createTextVert(this.targetList[target].name, 
                                                 this.targetList[target].id + '_t', 
                                                 arcStart+(arcEnd-arcStart)/2,
                                                 this.graphRadius+10,
                                                 'ttext');
                targetTxtNode = svgDocument.appendChild(targetTxt);                                 
            }
        }
        
        
        // Create source-target connections 
        if (this.usePositionHint) {
            var bezier2Width;
            var normalizedWeight;
            var normalizedPos;
            for (var i=0; i < this.targetList[target].connections.length; i++) {
                connection = this.targetList[target].connections[i];
                
                normalizedWeight = (connection.weight-this.connectionWeights.min) / (this.connectionWeights.max-this.connectionWeights.min);
                bezier2Width = this.connectWidth.min + normalizedWeight * (this.connectWidth.max-this.connectWidth.min);
                normalizedPos = (connection.positionHint-this.positionHint.min) / (this.positionHint.max-this.positionHint.min); 
                
                bezier2 = this.createBezier2(connection.sourceID + '_' + this.targetList[target].id + '_' + i.toString(), 
                                             this.sourceList[connection.sourceID].svgPos, 
                                             arcStart + normalizedPos * (arcEnd-arcStart),
                                             this.graphRadius,    
                                             this.targetList[target].color, 
                                             bezier2Width);
                svgDocument.appendChild(bezier2);
            }
        } else {
            // TODO: Use some other kind of sorting to determine position, if no date is available
            //      (or draw graph differently)
        }
   
    }
}
