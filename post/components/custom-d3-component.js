const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');
//var Victor = require('victor');
var v = require('vectorious/withoutblas'),
Vector = v.Vector;

const size = 500;
const circleRadius = 15;
const transitionDuration = 250;//ms
const timerFrequency = 500;//ms

class CustomD3Component extends D3Component {

// [x,y] robot, [x,y] goal
attractiveForce(robot,goal) 
{
	// Scaling factor
	var e = this.inAttrationFactor; 
	var direction = Vector.subtract(robot, goal);
	//F_Att = -e * (robot-qG) / norm(robot-goal); #quadratic
	var normTerm = direction.magnitude();
	var result = Vector.scale(direction, (-e / normTerm));
	return result;
}

repulsiveForce(robot, obstacle) 
{
	var n = this.inRepulsiveFactor * 10000;// We need to scale the factor because the distances are to high since we use pixel values.
	var radius = 15;// TODO param from outside
	var influenceRange = 300;// TODO param from outside

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
	var attractiveVector = this.attractiveForce(robotPosition, this.goalPos);
	attractiveVector.x = Math.ceil(attractiveVector.x);
	attractiveVector.y = Math.ceil(attractiveVector.y);
	
	// Find closest obstacle
	var closestLength = 999999999;
	var closestObstacle = new Vector([-1,-1]);
	this.obstacleData.forEach(function(position){
		var obstacle = new Vector(position);
		var distance = Vector.subtract(obstacle, robotPosition).magnitude();
		if (distance < closestLength) {
			closestLength = distance;
			closestObstacle = obstacle;
		}
	});
	


	// Calculate repulsiveForce
	var repulsiveVector = this.repulsiveForce(robotPosition, closestObstacle);
	repulsiveVector.x = Math.floor(repulsiveVector.x);
	repulsiveVector.y = Math.floor(repulsiveVector.y);

	// Apply repulsiveForce
	robotPosition.add(repulsiveVector);


	// Apply attractive force
	robotPosition.add(attractiveVector);


	// Check whether we reached the goal
	if (Vector.subtract(robotPosition, this.goalPos).magnitude() < circleRadius) {
		robotPosition.x = Math.random() * size;
		robotPosition.y = Math.random() * size;
	}

	  // render it
	this.svg.select("#robot")
		.transition()
		.duration(transitionDuration)
		.attr("cx", Math.ceil(robotPosition.x))
		.attr("cy", Math.ceil(robotPosition.y));
}

  initialize(node, props) {

	const animationRunning = this.animationRunning = 0;
	const inAttrationFactor = this.inAttrationFactor = props.attr_factor;
	const inRepulsiveFactor = this.inRepulsiveFactor = props.rep_factor;

    const svg = this.svg = d3.select(node).append('svg');
	svg
	  .attr("width", size)
	  .attr("height", size);
    svg.attr('viewBox', `0 0 ${size} ${size}`)
      .style('width', '100%')
      .style('height', 'auto');

	const robotData = this.robotData = [[50,50]];
	svg.selectAll("circle")
	  .data(robotData)
	  .enter()
	  .append("circle")
	  .attr("r", circleRadius)
	  .attr("cx", (d) => { return  d[0];})
	  .attr("cy", (d) => { return  d[1];})
	  .attr("id", "robot")
	  .style("fill", "green");

	//const obstacleData = this.obstacleData = [[200,202],[200,300],[200,400],[400,300],[100,200]];
	const obstacleData = this.obstacleData = [[50,100],[400,100],[450,400],[50,400],[200,202],[200,300],[200,400],[400,300],[100,200]];

//	  svg.append("g")
//	  .selectAll("circle")
//	  .data(obstacleData)
//	  .enter()
//	  .append("circle")
//	  .attr("r", circleRadius)
//	  .attr("cx", (d) => { return  d[0];})
//	  .attr("cy", (d) => { return  d[1];})
//	  .attr("id", "obstacle")
//	  .style("fill", "steelblue");
var arc = d3.symbol().type(d3.symbolTriangle).size(300);

var line = svg.selectAll('path')
  .data(obstacleData)
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', 'steelblue')
  .attr('stroke', '#000')
  .attr('stroke-width', 1)
  .attr('transform', function(d) {
    return "translate(" + d[0] + "," + d[1] + ")";
  });

	var goalData = [[size-50, size-50]];

	const goalPos = this.goalPos = new Vector(goalData[0]);
	svg.append("g").selectAll("circle")
	  .data(goalData)
	  .enter()
	  .append("circle")
	  .attr("r", circleRadius)
	  .attr("cx", (d) => { return  d[0];})
	  .attr("cy", (d) => { return  d[1];})
	  .attr("id", "goal")
	  .style("fill", "red");
  }

update(props, oldProps) {
	// Toggle animation
	if (oldProps.state != props.state) {
		if (this.runningAnimation) {
			this.runningAnimation = 0;
			clearInterval(this.timer);
		} else {
			// We need to write this in a strange way because js doens't know what 'this' in the function is.
			var t = this;
			const timer = this.timer = setInterval(function(){t.updateRobotPosition();}, timerFrequency);
			this.runningAnimation = 1;
		}
	}

	// Update algorithm properties
	
	if (oldProps.attr_factor != props.attr_factor) {
		this.inAttrationFactor = props.attr_factor;
	}

	if (oldProps.rep_factor != props.rep_factor) {
		this.inRepulsiveFactor = props.rep_factor;
	}

}

}// end of class

module.exports = CustomD3Component;
