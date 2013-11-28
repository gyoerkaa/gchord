var gchord = {};

gchord.svgNS   = 'http://www.w3.org/2000/svg';
gchord.xlinkNS = 'http://www.w3.org/1999/xlink';
// Constructor
gchord.ChordDiagram = function(container) {
    this.containerElement = container;
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
    this.targetArcWidth = 60;
    this.sourceTxtSize = 10;
    this.targetTxtColor = '#FFFFFF';
    this.sourceTxtColor = '#000000';
    // Angle at which to start and and the drawing of targets
    this.targetDisplay = {start: Math.PI*1.15, end: Math.PI*1.85};
    // Angle at which to start and and the drawing of sources
    this.sourceDisplay = {start: Math.PI*-0.1, end: Math.PI*1.1};
    // Stroke width for target-source connections
    // Max stroke width is used for max weight
    this.connectWidth = {min: 1, max: 5};
    this.horiTextHelperID = 'horitexthelper';
    this.minTargetArcLength = this.targetTxtSize;
    
    // We can use an oject to emulate a simple set, 
    // as no removals are necessary
    this.targetList = new Object();
    this.sourceList = new Object();
    
    // Needed for normalization
    this.totalWeight = 0;
    this.numTargets = 0;
    this.numSources = 0;
    this.positionHint = {min: Number.MAX_VALUE, max: Number.MIN_VALUE};
    this.weight = {min: Number.MAX_VALUE, max: Number.MIN_VALUE};
    this.flagUsePositionHint = true;
    
    /*                  
    // RGB Color palette
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


// Utility function to escape HTML special characters
gchord.ChordDiagram.prototype.escapeHtml = function(text) {
    if (text == null) {
        return '';
    }
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
 
 
// Utility function to check the sanity of input data
gchord.ChordDiagram.prototype.checkInputSanity = function(data) {
    
    if (data.getNumberOfRows() < 4) {
        this.flagUsePositionHint = false;
    }
    
    if (data.getNumberOfRows() < 3) {
        this.containerElement.innerHTML = 
            'Error: Invalid data. Minimum of 3 rows required';
        return false;
    }
    if (data.getNumberOfColumns < 2) {
        this.containerElement.innerHTML = 
            'Error: Invalid data. Minimum of 2 columns required';
        return false;
    }
    return true;
}


// ...
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
            this.containerElement.innerHTML = 
                'Error: Invalid option. Graph radius(' + options.graphRadius + ')larger than canvas size (' + options.canvasSize + ')';
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
 * Creates a new defs element, which contains a few (invisible) helper 
 * objects.
 *
 * @return {object} The new defs object
 */
gchord.ChordDiagram.prototype.createDefinitions = function() {
    var defElement = document.createElementNS(gchord.svgNS, 'defs');
    
    var horiTextHelper = this.createArc(this.horiTextHelperID, 
                                        0, 
                                        1.9999*Math.PI,
                                        (this.graphRadius+this.targetArcWidth*0.4));
    defElement.appendChild(horiTextHelper); 
    
    return defElement;
}


gchord.ChordDiagram.prototype.createTextHori = function(text,
                                                        elementId, 
                                                        angle,
                                                        size,
                                                        color) {
    var txtElem = document.createElementNS(gchord.svgNS, 'text');
    txtElem.setAttributeNS(null, 'x', this.graphCenter.x);
    txtElem.setAttributeNS(null, 'y', this.graphCenter.y);
    txtElem.setAttributeNS(null, 'fill', color);
    txtElem.setAttributeNS(null, 'id', elementId);
    txtElem.setAttributeNS(null, 'font-size', size);
    txtElem.setAttributeNS(null, 'text-anchor', 'middle');
    
    var txtPath = document.createElementNS(gchord.svgNS, 'textPath');
    
    txtPath.setAttributeNS(gchord.xlinkNS, 'href', '#'+this.horiTextHelperID);
    txtPath.setAttributeNS(null, 'startOffset', angle*(this.graphRadius+this.targetArcWidth*0.4));
    
    var txtNode = document.createTextNode(text);    
    
    txtElem.appendChild(txtPath);
    txtPath.appendChild(txtNode);
    
    return txtElem;
}


/**
 * Creates a new text element vertical to the defining circle of the graph.
 * Coordinates are defined by an angle (polar coordinates with constant radius, 
 * 0� = 3 o'clock)
 * Angles are in radians.
 *
 * @param {string} text         Text
 * @param {string} elementId    Unique ID of the text element
 * @param {number} angle        Position of the text element (in rad)
 * @param {number} radius       Position of the text element 
 * @param {number} size         Text size 
 * @param {number} color        Text color
 * @return {object} The new text object.
 */
gchord.ChordDiagram.prototype.createTextVert = function(text,
                                                        elementId, 
                                                        angle,
                                                        radius,
                                                        size,
                                                        color) {
    var txtElem = document.createElementNS(gchord.svgNS, 'text');
    txtElem.setAttributeNS(null, 'fill', color);
    txtElem.setAttributeNS(null, 'id', elementId);
    txtElem.setAttributeNS(null, 'font-size', size);
    
    // Sometimes it's radians, sometimes degrees 
    // ... you people are on my list now !  
    var modifiedAngle = angle*180/Math.PI; 
      
    var x = this.graphCenter.x + radius;
    var y = this.graphCenter.y + this.sourceTxtSize/4;
    var textAnchor = 'front';
    
    // For better readability:
    // Rotate text by 180�, when between 90� and 270�
    if ((modifiedAngle > 90) && (modifiedAngle < 270)) {
        x = this.graphCenter.x - radius;
        modifiedAngle = (modifiedAngle-180);
        textAnchor = 'end';
    } 
    txtElem.setAttributeNS(null, 'x', x);
    txtElem.setAttributeNS(null, 'y', y);
    txtElem.setAttributeNS(null, 'text-anchor', textAnchor);

    var rotation = 'rotate(' + 
                   modifiedAngle +
                   ' ' +
                   this.graphCenter.x.toString() + 
                   ',' + 
                   this.graphCenter.y.toString() +
                   ')';
    txtElem.setAttributeNS(null, 'transform', rotation);
    
    var txtNode = document.createTextNode(text);
    txtElem.appendChild(txtNode);
    
    return txtElem;                   
}


/**
 * Creates a new arc. Start and end points are defined
 * by an angle (polar coordinates with equal radius, 0� = 3 o'clock)
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
    var start = {x:0, y:0};
    start.x = radius * Math.cos(angleStart) + this.graphCenter.x;
    start.y = radius * Math.sin(angleStart) + this.graphCenter.y;   
    var end = {x:0, y:0};
    end.x = radius * Math.cos(angleEnd) + this.graphCenter.x;
    end.y = radius * Math.sin(angleEnd) + this.graphCenter.y;
    
    // Make sure angleEnd > angleStart. Add 360� if necessary.
    var large_arc_flag = (((2*Math.PI+angleEnd)-angleStart) > Math.PI) ? 1 : 0;
    if (angleEnd > angleStart) {
        large_arc_flag = ((angleEnd-angleStart) > Math.PI) ? 1 : 0;
    }

    // Determines draw direction 1 = positive
    var sweep_flag = 1;
    
    var path = document.createElementNS(gchord.svgNS, 'path');
    path.setAttributeNS(null, 'id', elementId);
    path.setAttributeNS(null, 'fill', 'none');
    if (typeof(strokeColor) === 'string') {
        path.setAttributeNS(null, 'stroke', strokeColor);
    }
    if (typeof(strokeWidth) === 'number') {
        path.setAttributeNS(null, 'stroke-width', strokeWidth);
    }
    path.setAttributeNS(null, 'd', 'M' + start.x + ',' +
                                         start.y + ' ' +
                                   'A' + radius + ',' +
                                         radius + ' ' +
                                   0 + ' ' +
                                   large_arc_flag + ' ' +
                                   sweep_flag + ' ' + 
                                   end.x + ',' +
                                   end.y);    
    return path;   
}


/**
 * Creates a new quadratic bezier curve. Start and end points are defined
 * by an angle (polar coordinates with equal radius, 0� = 3 o'clock).
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
    var start = {x:0, y:0};
    start.x = radius * Math.cos(angleStart) + this.graphCenter.x;
    start.y = radius * Math.sin(angleStart) + this.graphCenter.y;
    
    var end = {x:0, y:0};
    end.x = radius * Math.cos(angleEnd) + this.graphCenter.x;
    end.y = radius * Math.sin(angleEnd) + this.graphCenter.y;
    
    var ctrl = {x:this.graphCenter.x, y:this.graphCenter.y};
    
    var path = document.createElementNS(gchord.svgNS, 'path');
    path.setAttributeNS(null, 'id', elementId);
    path.setAttributeNS(null, 'fill', 'none');
    path.setAttributeNS(null, 'stroke', strokeColor);
    path.setAttributeNS(null, 'stroke-width', strokeWidth);
    path.setAttributeNS(null, 'd', 'M' + start.x + ',' +
                                         start.y + ' ' +
                                   'Q' + ctrl.x + ',' +
                                         ctrl.y + ' ' +
                                         end.x + ',' +
                                         end.y);
                                 
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
    
    var targetID         = '';
    var connectionWeight = 0;
    var sourceID         = '';
    var posHint          = ''; // may not be present
    var connection;   
    // Get data from spreadsheet
    for (var row = 0; row < data.getNumberOfRows(); row++) {
        targetID = data.getFormattedValue(row, this.dataColumns.targetID);
        if (typeof targetID != 'string') {
            targetID = 'invalid';
        } else {
            // We have to remove leading and trailing whitespaces, 
            // because of the evil people who may put them in randomly
            targetID = targetID.trim();
        }        
        connectionWeight = parseInt(data.getFormattedValue(row, this.dataColumns.weight));        
        if (!isFinite(connectionWeight)) {
            // this connection won't be displayed at all
            connectionWeight = 0; 
        }       
        sourceID = data.getFormattedValue(row, this.dataColumns.sourceID);
        if (typeof sourceID != 'string') {
            sourceID = 'invalid';
        } else {
            sourceID = sourceID.trim(); // because of even more evil people
        }         
        if (this.flagUsePositionHint) {
            posHint = this.parsePositionHint(data.getFormattedValue(row, this.dataColumns.positionHint));
        }
        else {
            posHint = 0;
        }
          
        // Create a new target if necessary
        if (!this.targetList.hasOwnProperty(targetID)){      
            this.targetList[targetID] = new Object();
            this.targetList[targetID].name = targetID; // for now
            this.targetList[targetID].id = targetID;
            this.targetList[targetID].color = this.getColor();
            this.targetList[targetID].connections = new Array();
            this.targetList[targetID].totalWeight = 0;
            this.numTargets++;           
        }
        // Add target data
        connection = {sourceID: sourceID, 
                      weight: connectionWeight, 
                      positionHint: posHint};
        this.positionHint.min = Math.min(this.positionHint.min, posHint);
        this.positionHint.max = Math.max(this.positionHint.max, posHint);
        this.weight.min = Math.min(this.weight.min, connectionWeight);
        this.weight.max = Math.max(this.weight.max, connectionWeight); 
        this.targetList[targetID].connections.push(connection);
        this.targetList[targetID].totalWeight += connectionWeight; 
        
        // Create a new source if necessary
        if (!this.sourceList.hasOwnProperty(sourceID)) {
            this.sourceList[sourceID] = new Object();
            this.sourceList[sourceID].name = sourceID; // for now
            this.sourceList[sourceID].id = sourceID;
            this.sourceList[sourceID].svgPos = -1; // invalid Pos
            this.numSources++;
        }
        // Add source data        
        this.totalWeight += connectionWeight;        
    }
       
    // Normalize Weights ... or not
}


gchord.ChordDiagram.prototype.fromArray = function(data, options) {

}


gchord.ChordDiagram.prototype.fromCSVFile = function(filename, options) {

}


/**
 * Generates the svg object.
 *
 */
gchord.ChordDiagram.prototype.draw = function() {    
    var html = [];
 
    html.push('<svg id="chord_graph" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">');
    html.push('</svg>');
    this.containerElement.innerHTML = html.join('');
    
    var svgDocument = document.getElementById('chord_graph');
    
    svgDocument.setAttributeNS(null, 'version', 1.1);
    svgDocument.setAttributeNS(null, 'width', this.canvasWidth);
	svgDocument.setAttributeNS(null, 'height', this.canvasHeight);
    
    svgDocument.appendChild(this.createDefinitions());    
    
    var useElement = document.createElementNS(gchord.svgNS, 'use');
    useElement.setAttribute('xlink:href', '#'+this.horiTextHelperID);
    svgDocument.appendChild(useElement);
    
    // Create source names in the lower half and save coords
    var angle  = this.sourceDisplay.start;
    var offset = Math.abs(this.sourceDisplay.end-this.sourceDisplay.start)/(this.numSources-1);
    var sourceTxt = {};
    for(var source in this.sourceList) {
        sourceTxt = this.createTextVert(this.sourceList[source].name, 
                                        this.sourceList[source].id +'_txt', 
                                        angle,
                                        this.graphRadius+2,
                                        this.sourceTxtSize, 
                                        this.sourceTxtColor);
        svgDocument.appendChild(sourceTxt);
        // Save position for source-target connections
        this.sourceList[source].svgPos = angle;
        angle += offset;
    }
    
    // Create target names in the upper half and save coords
    var arcStart = 0;
    var arcEnd   = this.targetDisplay.start;
    var targetTxt = {};
    var targetArc = {};
    var connection = {};
    
    for(var target in this.targetList) {
        arcStart = arcEnd;
        arcEnd   = arcStart+(this.targetList[target].totalWeight/this.totalWeight)*(this.targetDisplay.end-this.targetDisplay.start);
        targetArc = this.createArc(this.targetList[target].id + '_arc', 
                                   arcStart, 
                                   arcEnd+0.001, // add a small value to avoid gaps on some renderers
                                   this.graphRadius+this.targetArcWidth/2, 
                                   this.targetList[target].color, 
                                   this.targetArcWidth);
        svgDocument.appendChild(targetArc);
        
        // TODO: Try to fit the text onto the target bar. Preferably horizontally,
        //       but put it vertically if there is a lack of space.
        //       Ultimately it is the users responsibility to choose names of 
        //       appropriate length                                     
        targetTxt = this.createTextHori(this.targetList[target].name, 
                                        this.targetList[target].id + '_txt', 
                                        (arcStart+arcEnd)/2,
                                        this.targetTxtSize, 
                                        this.targetTxtColor);                                
        svgDocument.appendChild(targetTxt);
        
        // Create source-target connections
        
        if (this.flagUsePositionHint) {
            var bezier2Start;
            var bezier2End;
            var bezier2Width;
            var normalizedWeight;            
            for (var i=0; i < this.targetList[target].connections.length; i++) {
                connection = this.targetList[target].connections[i];
                bezier2Start = this.sourceList[connection.sourceID].svgPos;               
                normalizedWeight = (connection.weight-this.weight.min) / (this.weight.max-this.weight.min);
                bezier2Width = this.connectWidth.min + normalizedWeight * (this.connectWidth.max-this.connectWidth.min);
                bezier2End   = arcStart + normalizedWeight * (arcEnd-arcStart);
                
                bezier2 = this.createBezier2(connection.sourceID + '_' + this.targetList[target].id + '_' + i.toString(), 
                                             bezier2Start, 
                                             bezier2End,
                                             this.graphRadius,    
                                             this.targetList[target].color, 
                                             bezier2Width);
                svgDocument.appendChild(bezier2);
            }
        }
        else {
            
        }
    }

}