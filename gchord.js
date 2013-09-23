var gchord = {};

gchord.svgNS = "http://www.w3.org/2000/svg";

// Constructor
gchord.Chord_Diagram = function(container) {
    this.containerElement = container;
    
    this.canvasWidth  = 400;
    this.canvasHeight = 400;
    
    this.graphRadius = 150;
    this.graphCenter = {x:250, y:250};
    
    this.listOfTargets = [];
    this.listOfSources = [];
}


// Utility function to escape HTML special characters
gchord.Chord_Diagram.prototype.escapeHtml = function(text) {
    if (text == null) {
        return '';
    }
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
 
 
// Utility function to check the sanity of input data
gchord.Chord_Diagram.prototype.checkInputSanity = function(data) {
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
gchord.Chord_Diagram.prototype.setOptions = function(options) {
    if (options.canvas_size !== undefined) {
        this.canvasWidth  = options.canvas_size;
        this.canvasHeight = options.canvas_size;
        
        this.graphCenter.x = this.canvasWidth/2;
        this.graphCenter.y = this.canvasHeight/2;
    }
    if (options.graph_radius !== undefined) {
        if (options.graph_radius < Math.min(this.canvasWidth, 
                                            this.canvasHeight)) {
            this.containerElement.innerHTML = 
                'Error: Invalid option. Graph radius larger than canvas size';
            return false;
        }
        this.graphRadius  = options.radius;
    }
    return true;  
}


gchord.Chord_Diagram.prototype.weightList2targetList = function(weightList) {
    for (var row = 0; row < weightList.getNumberOfRows(); row++) {  
        for (var col = 0; col < weightList.getNumberOfColumns(); col++) {
        
        }   
    }    
}


/**
 * Creates a new arc.
 *
 * @param {string} elementId   Unique ID of the arc.
 * @param {number} angle1      Starting angle of the arc.
 * @param {number} angle2      Ending angle of the arc.
 * @param {number} radius      Radius of the arc.
 * @param {string} strokeColor Stroke color of the arc. 
 * @param {number} strokeWidth Stroke width of the arc.
 * @return {path} The new path object.
 */
gchord.Chord_Diagram.prototype.createArc = function(elementId, 
                                                    angle1, 
                                                    angle2, 
                                                    radius, 
                                                    strokeColor, 
                                                    strokeWidth) {
    
    // Start and ending points for the arc
    startX = radius * Math.cos(angle1) + this.graphCenter.x;
    startY = radius * Math.sin(angle1) + this.graphCenter.y;   
    endX   = radius * Math.cos(angle2) + this.graphCenter.x;
    endY   = radius * Math.sin(angle2) + this.graphCenter.y;
    
    // Make sure end_angle > start_angle. Add 360° if necessary.
    if (angle2 > angle1) {
        large_arc_flag = ((angle2-angle1) > Math.PI) ? 1 : 0;
    }
    else {
        large_arc_flag = (((2*Math.PI+angle2)-angle1) > Math.PI) ? 1 : 0;
    }
    // Determines draw direction 1 = positive
    sweep_flag = 1;
    
    var path = document.createElementNS(gchord.svgNS, 'path');
    path.setAttributeNS(null, 'id', elementId);
    path.setAttributeNS(null, 'fill', 'none');
    path.setAttributeNS(null, 'stroke', strokeColor);
    path.setAttributeNS(null, 'stroke-width', strokeWidth);
    path.setAttributeNS(null, 'd', 'M' + startX + ',' +
                                         startY + ' ' +
                                   'A' + radius + ',' +
                                         radius + ' ' +
                                         0 + ' ' +
                                         large_arc_flag + ' ' +
                                         sweep_flag + ' ' + 
                                         endX + ',' +
                                         endY);    
    return path;   
}
 
/**
 * Creates a new quadratic bezier curve path.
 *
 * @param {string} elementId Unique ID of the arc.
 * @param {number} angle1 Starting angle of the arc.
 * @param {number} angle2 Ending angle of the arc.
 * @param {x: number, y:number} controlPnt Ending angle of the arc. 
 * @param {string} strokeColor Stroke color of the arc. 
 * @param {number} strokeWidth Stroke width of the arc.
 * @return {path} The new path object.
 */
gchord.Chord_Diagram.prototype.createBezier2 = function(elementId, 
                                                        angle1, 
                                                        angle2, 
                                                        controlPnt,
                                                        strokeColor, 
                                                        strokeWidth) {

}


gchord.Chord_Diagram.prototype.fromGoogleSpreadsheet = function(data, options) {

}


gchord.Chord_Diagram.prototype.fromSQLDatabase = function(options) {

}


gchord.Chord_Diagram.prototype.fromCSVFile = function(filename, options) {

}


gchord.Chord_Diagram.prototype.draw = function() {    
    var html = [];
    html.push('<svg id="chord_graph" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">');
    html.push('</svg>');
    this.containerElement.innerHTML = html.join('');
    
    var svgDocument = document.getElementById('chord_graph');
    
    svgDocument.setAttribute('width', this.canvasWidth);
	svgDocument.setAttribute('height', this.canvasHeight); 
    
    var centerPoint = document.createElementNS(gchord.svgNS, 'circle');
    centerPoint.setAttributeNS(null,'id', 'centerPoint');
    centerPoint.setAttributeNS(null,'cx', this.graphCenter.x);
    centerPoint.setAttributeNS(null,'cy', this.graphCenter.x);
    centerPoint.setAttributeNS(null,'r', 2);
    centerPoint.setAttributeNS(null,'fill', 'black');
    centerPoint.setAttributeNS(null,'stroke', 'none');    
    svgDocument.appendChild(centerPoint);    
    
    arc1 = this.createArc('arc1', Math.PI*0.5, 0, 30, '#000080', 15);
    svgDocument.appendChild(arc1);
    
    arc2 = this.createArc('arc2', Math.PI, 0, 50, '#008000', 15);
    svgDocument.appendChild(arc2);
    
    arc3 = this.createArc('arc3', Math.PI*1.5, 0, 70, '#800000', 15);
    svgDocument.appendChild(arc3);
    
    /*
    this.containerElement.innerHTML = '<canvas id="chord_graph"></canvas>';
    
    var canvas = document.getElementById('chord_graph');
    
    canvas.setAttribute('width', this.canvasWidth);
	canvas.setAttribute('height', this.canvasHeight);
    
    var ctx=canvas.getContext("2d");

    ctx.lineWidth = 20;

    ctx.beginPath();
    ctx.arc(this.canvasWidth/2, this.canvasHeight/2, this.graphRadius, 0, 2*Math.PI);
    //ctx.closePath();

    ctx.fillStyle = '#FF0000';
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.stroke();*/
}
