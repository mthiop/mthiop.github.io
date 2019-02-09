const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');
//var Victor = require('victor');
var v = require('vectorious/withoutblas'),
Vector = v.Vector;

const size = 500;
const circleRadius = 10;
const transitionDuration = 450;//ms
const timerFrequency = 500;//ms

class CustomD3Component extends D3Component {

// [x,y] robot, [x,y] goal
attractiveForce(robot,goal) 
{
	// Scaling factor
	var e = this.inAttractionFactor;
	var direction = Vector.subtract(robot, goal);
	//F_Att = -e * (robot-qG) / norm(robot-goal); #quadratic
	var normTerm = direction.magnitude();
	var result = Vector.scale(direction, (-e / normTerm));
	return result;
}

repulsiveForce(robot, obstacle) 
{
	var n = this.inRepulsiveFactor * 10000;// We need to scale the factor because the distances are to high since we use pixel values.
	var radius = circleRadius; // We assume a circle for obstacles.
	var influenceRange = this.inInfluenceRange;

	var direction = Vector.subtract(robot, obstacle);
	var distance = direction.magnitude() - radius;

	if (distance > influenceRange) {
		return new Vector([0,0]);
	} else {
		var firstTerm = ((1./distance) - (1./influenceRange));
		var secondTerm = (1./(distance*distance));
		var thirdTerm = (1./direction.magnitude());
		var factor = firstTerm * secondTerm * thirdTerm * n;
		var force = Vector.scale(direction, factor);
		return force;
	}
}

updateRobotPosition()
{
	// Update robot position
	var xRobot = parseInt(this.svg.select("#robot").attr("cx"));
	var yRobot = parseInt(this.svg.select("#robot").attr("cy"));
	var robotPosition = new Vector([xRobot, yRobot]);

	// Calculate attractive force
	var xGoal = parseInt(this.svg.select("#goal").attr("cx"));
	var yGoal = parseInt(this.svg.select("#goal").attr("cy"));
	var goalPosition = new Vector([xGoal, yGoal]);
	var attractiveVector = this.attractiveForce(robotPosition, goalPosition);
	
	// Find closest obstacle
	var closestLength = 999999999;
	var closestObstacle = new Vector([-1,-1]);
	this.svg.selectAll("#obstacle").each(function(){
		// Parse transform string to numbers
		var str = (d3.select(this).attr("transform"));
		var beginBracket = str.indexOf('(');
		var komma = str.indexOf(',');
		var endBracket = str.indexOf(')');

		var x = str.substring(beginBracket+1, komma);
		var y = str.substring(komma+1, endBracket);

		var obstacle = new Vector([parseInt(x), parseInt(y)]);
		var distance = Vector.subtract(obstacle, robotPosition).magnitude();
		if (distance < closestLength) {
			closestLength = distance;
			closestObstacle = obstacle;
		}
	});
	
	// Calculate repulsiveForce
	var repulsiveVector = this.repulsiveForce(robotPosition, closestObstacle);

	// Apply attractive force
	repulsiveVector.add(attractiveVector);

	// Apply step size
	repulsiveVector.scale(this.inStepSize / repulsiveVector.magnitude());

	// Add to position
	robotPosition.add(repulsiveVector);

	// Clip to size of playground
	if (robotPosition.x > size) {
		robotPosition.x = size;
	}
	if (robotPosition.y > size) {
		robotPosition.y = size;
	}
	if (robotPosition.x < 0) {
		robotPosition.x = 0;
	}
	if (robotPosition.y < 0) {
		robotPosition.y = 0;
	}

	// Check whether we reached the goal
	if (Vector.subtract(robotPosition, goalPosition).magnitude() < circleRadius) {
//		robotPosition.x = Math.random() * size;
//		robotPosition.y = Math.random() * size;
		robotPosition.x = 50;
		robotPosition.y = 50;
		this.robotPathData = [];
	}

	  // render robot position
	this.svg.select("#robot")
		.transition()
		.duration(transitionDuration)
		.attr("cx", Math.ceil(robotPosition.x))
		.attr("cy", Math.ceil(robotPosition.y));

	// render robot path
	var oldRobotPathData = this.robotPathData.slice(); // copy data
	this.robotPathData.push([robotPosition.x, robotPosition.y]);// update real path data
	oldRobotPathData.push(oldRobotPathData[oldRobotPathData.length-1]);// copy element to match path length
	// https://bocoup.com/blog/improving-d3-path-animation
	this.svg.select("#robotPath").attr('d', oldRobotPathData).transition().duration(transitionDuration).attr('d', this.lineFunction(this.robotPathData));

	//var t = this;
	// d3.interpolatePath is not working:(
	//.attrTween("d",function() {return d3.interpolatePath(t.lineFunction(oldRobotPathData), t.lineFunction(t.robotPathData));});

}

selectCircle(d) {
	console.log("selectCircle");
	d3.select(this).style("stroke", "black");
}

deselectCircle(d) {
	console.log("deselectCircle");
	d3.select(this).style("stroke", "transparent");
}

draggedCircle(d) {
	console.log("dragCircle");
	d3.select(this).attr("cx", d[0] = d3.event.x).attr("cy", d[1] = d3.event.y);
}

selectObstacle(d) {
	d3.select(this).attr("stroke-width", 3);
}

deselectObstacle(d) {
	d3.select(this).attr("stroke-width", 1);
}

draggedObstacle(d) {
	d3.select(this)
  .attr('transform', function(d) {
    return "translate(" + d3.event.x + "," + d3.event.y + ")";
  });
//	d3.select(this).attr("d", [parseInt(d3.event.x), parseInt(d3.event.y)]);
}

initialize(node, props) {

	  // Parameters
	const inAnimationRunning = this.inAnimationRunning = 1;
	const inMovableObjects = this.inMovableObjects = props.movable_objects;
	const inAttractionFactor = this.inAttractionFactor = props.attr_factor;
	const inRepulsiveFactor = this.inRepulsiveFactor = props.rep_factor;
	const inStepSize = this.inStepSize = props.step_size;
	const inInfluenceRange = this.inInfluenceRange= props.influence_range;

	// We need this idString to create a unique svg for each components, otherwise we get side effects!!!
	const idString = this.idString = Math.floor(Math.random() * 999999).toString(2); 
	  // SVG setup
    const svg = this.svg = d3.select(node).append('svg').attr("id", idString);
	svg
	  .attr("width", size)
	  .attr("height", size);
//    svg.attr('viewBox', `0 0 ${size} ${size}`)
//      .style('width', '100%')
//      .style('height', '100%');
	// Outline
	svg.append("rect").attr("width", size-2).attr("height", size-2).attr("stroke", "black").attr("fill", "transparent").attr('x', 1).attr('y',1);

	  // Robot setup
	const robotData = this.robotData = [[50,50]];
	svg.selectAll("#robot")
	  .data(robotData)
	  .enter()
	  .append("circle")
	  .attr("r", circleRadius)
	  .attr("stroke-width", 2)
	  .attr("stroke", "transparent")
	  .attr("cx", (d) => { return  d[0];})
	  .attr("cy", (d) => { return  d[1];})
	  .attr("id", "robot")
	  .style("fill", "green")

	if (this.inMovableObjects) {
		svg.select("#robot")
	  .call(d3.drag()
        .on("drag", this.draggedCircle)
		.on("start", this.selectCircle)
		.on("end", this.deselectCircle));
	}

	  // Path setup
	const robotPathData = this.robotPathData = [[50,50]];
	const lineFunction = this.lineFunction = d3.line()
	.x(function(d) { return d[0]; })
	.y(function(d) { return d[1]; })
	.curve(d3.curveLinear);

	svg.append("path")
      .attr("d", lineFunction(robotPathData))
      .attr("stroke", "steelblue")
      .attr("stroke-width", "2")
	  .attr("id", "robotPath")
      .attr("fill", "none");

	  // Obstacle setup
	const obstacleData = this.obstacleData = [[50,100],[400,100],[450,400],[50,400],[200,202],[200,300],[200,400],[400,300],[100,200]];

var arc = d3.symbol().type(d3.symbolTriangle).size(300);

svg.selectAll('#obstacle')
  .data(obstacleData)
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', 'steelblue')
  .attr('stroke', '#000')
  .attr('stroke-width', 1)
  .attr('id', 'obstacle')
//  .attr('cx', (d) => {return d[0];})
//  .attr('cy', (d) => {return d[1];});
  .attr('transform', function(d) {
    return "translate(" + d[0] + "," + d[1] + ")";
  });

	if (this.inMovableObjects) {
		svg.selectAll("#obstacle")
	  .call(d3.drag()
        .on("drag", this.draggedObstacle)
        .on("start", this.selectObstacle)
        .on("end", this.deselectObstacle));

	}


	  // Goal setup
	var goalData = [[size-50, size-50]];

	svg.append("g").selectAll("#goal")
	  .data(goalData)
	  .enter()
	  .append("circle")
	  .attr("r", circleRadius)
	  .attr("stroke-width", 2)
	  .attr("stroke", "transparent")
	  .attr("cx", (d) => { return  d[0];})
	  .attr("cy", (d) => { return  d[1];})
	  .attr("id", "goal")
	  .style("fill", "red");

	if (this.inMovableObjects) {
		svg.select("#goal")
	  .call(d3.drag()
        .on("drag", this.draggedCircle)
        .on("start",this.selectCircle)
        .on("end", this.deselectCircle));
	}

	// We need to write this in a strange way because js doens't know what 'this' in the function is.
	var t = this;
	const timer = this.timer = setInterval(function(){t.updateRobotPosition();}, timerFrequency);
  }

update(props, oldProps) {
	// Toggle animation
	if (oldProps.state != props.state) {
		if (this.inAnimationRunning) {
			this.inAnimationRunning = 0;
			clearInterval(this.timer);
		} else {
			// We need to write this in a strange way because js doens't know what 'this' in the function is.
			var t = this;
			const timer = this.timer = setInterval(function(){t.updateRobotPosition();}, timerFrequency);
			this.inAnimationRunning = 1;
		}
	}

	// Update algorithm properties
	
	if (oldProps.attr_factor != props.attr_factor) {
		this.inAttractionFactor = props.attr_factor;
	}

	if (oldProps.rep_factor != props.rep_factor) {
		this.inRepulsiveFactor = props.rep_factor;
	}

	if (oldProps.influence_range != props.influence_range) {
		this.inInfluenceRange = props.influence_range;
	}

	if (oldProps.step_size != props.step_size) {
		this.inStepSize = props.step_size;
	}

}

}// end of class

module.exports = CustomD3Component;
