const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');
//var Victor = require('victor');
var v = require('vectorious/withoutblas'),
Vector = v.Vector;

// Size of svg
const size = 450;
// Radius of circles, used for rep force calculation
const circleRadius = 30;
// Image x,y are top left instead of center, so we need to apply this offset
const imageOffset = circleRadius / 2;
// How long does a transition (move robot, path) take
const transitionDuration = 450;//ms
// How often do we update the robot position
const timerFrequency = 500;//ms
// Obstacle images
const obstacleImages = ["static/images/Star_Wars_Boba\ Fett.svg", "static/images/Star_Wars_Darth\ Vader.svg", "static/images/Star_Wars_Battle\ Droid.svg", "static/images/Star_Wars_Storm-Trooper-2.svg"];
const NO_BACKGROUND = -500;

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
	var xRobot = parseInt(this.svg.select("#robot").attr("x"));
	var yRobot = parseInt(this.svg.select("#robot").attr("y"));
	var robotPosition = new Vector([xRobot, yRobot]);

	// Calculate attractive force
	var xGoal = parseInt(this.svg.select("#goal").attr("x"));
	var yGoal = parseInt(this.svg.select("#goal").attr("y"));
	var goalPosition = new Vector([xGoal, yGoal]);
	var attractiveVector = this.attractiveForce(robotPosition, goalPosition);
	
	// Find closest obstacle
	var closestLength = 999999999;
	var closestObstacle = new Vector([-1,-1]);
	this.svg.selectAll("#obstacle").each(function(){
		var x = (d3.select(this).attr("x"));
		var y = (d3.select(this).attr("y"));

		var obstacle = new Vector([parseInt(x), parseInt(y)]);
		var distance = Vector.subtract(obstacle, robotPosition).magnitude();
		if (distance < closestLength) {
			closestLength = distance;
			closestObstacle = obstacle;
		}
	});

	if (closestLength-circleRadius < this.inInfluenceRange) {
		this.svg.select("#obstacleBackground")
		.attr("cx", closestObstacle.x)
		.attr("cy", closestObstacle.y);
	} else {
		this.svg.select("#obstacleBackground")
		.attr("cx", NO_BACKGROUND)
		.attr("cy", NO_BACKGROUND);
	}


	
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
		this.robotPathDataOld = this.robotPathData;
		this.svg.select("#robotPathOld").attr('d', this.robotPathDataOld).attr('d', this.lineFunction(this.robotPathData));
		this.robotPathData = [];
	}

	  // render robot position
	this.svg.select("#robot")
		.transition()
		.duration(transitionDuration)
		.attr("x", Math.ceil(robotPosition.x))
		.attr("y", Math.ceil(robotPosition.y));
	this.svg.select("#robotBackground")
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


}


initialize(node, props) {
		d3.select("#button").style("visibility", "hidden");
		d3.select("#buttonPlaceholder").style("visibility", "hidden");
		d3.select("#forceViz").style("display", "none");
	// We need the class-this for callbacks
	var self = this;

	  // Parameters
	const inAnimationRunning = this.inAnimationRunning = 0;
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
	svg

	  // Robot setup
	const robotData = this.robotData = [[50,50]];
	svg.append("circle")
	  .attr("cx", robotData[0][0])
	  .attr("cy", robotData[0][1])
	.attr("id", "robotBackground")
	.attr("stroke-width",3)
	.attr("fill", "cornflowerblue")
	.attr("r", circleRadius)
	.attr("opacity", .2);

	svg.selectAll("#robot")
	  .data(robotData)
	  .enter()
	  .append("svg:image")
	  .attr("x", robotData[0][0])
	  .attr("y", robotData[0][1])
	  .attr("id", "robot")
	  .attr('width', circleRadius)
	  .attr('height', circleRadius)
	  .attr("transform", "translate(-"+(circleRadius/2)+",-"+(circleRadius/2)+")")
	  .attr("xlink:href", "static/images/Star_Wars_R2D2.svg");

	if (this.inMovableObjects) {
		svg.select("#robot")
	  .call(d3.drag()
        .on("drag", function(d) {
			
			d3.select(this).attr("x", d3.event.x ).attr("y", d3.event.y );
			self.svg.select("#robotBackground").attr("cx", d3.event.x).attr("cy", d3.event.y);
		})
		.on("start", function(d) {
			self.svg.select("#robotBackground").attr("stroke", "black");
		})
		.on("end", function(d) {
			self.svg.select("#robotBackground").attr("stroke", "transparent");
		}));
	}

	  // Path setup
	const robotPathData = this.robotPathData = [[50-(circleRadius/2),50-(circleRadius/2)]];
	const robotPathDataOld = this.robotPathDataOld = [];
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

	svg.append("path")
      .attr("d", lineFunction(robotPathDataOld))
      .attr("stroke", "steelblue")
      .attr("stroke-width", "2")
	  .attr("id", "robotPathOld")
	  .attr("opacity", .4)
      .attr("fill", "none");

	  // Obstacle setup
	svg.append("circle")
	.attr("cx", NO_BACKGROUND)
	.attr("cy", NO_BACKGROUND)
	.attr("id", "obstacleBackground")
	.attr("stroke-width",3)
	.attr("fill", "crimson")
	.attr("r", circleRadius)
	.attr("opacity", .1);

	svg.append("circle")
	.attr("cx", NO_BACKGROUND)
	.attr("cy", NO_BACKGROUND)
	.attr("id", "obstacleRing")
	.attr("fill", "transparent")
	.attr("stroke-width",3)
	.attr("stroke", "crimson")
	.attr("r", circleRadius)
	.attr("opacity", .0);


	const obstacleData = this.obstacleData = [[50,100],[400,100],[350,400],[50,390],[200,202],[200,300],[200,380],[350,300],[100,200]];

svg.append('g').selectAll('#obstacle')
  .data(obstacleData)
  .enter()
	  .append("svg:image")
	  .attr("x", (d) => {return d[0]-(circleRadius/2);})
	  .attr("y", (d) => {return d[1]-(circleRadius/2);})
	  .attr("id", "obstacle")
	  .attr('width', circleRadius)
	  .attr('height', circleRadius)
	  .attr("transform", "translate(-"+(circleRadius/2)+",-"+(circleRadius/2)+")")
	  .attr('id', 'obstacle')
	  .attr("xlink:href", (d,i) => {return obstacleImages[i % obstacleImages.length];});

	if (this.inMovableObjects) {
		svg.selectAll("#obstacle")
	  .call(d3.drag()
        .on("drag", function(d) {
			
			d3.select(this)
				.attr("x", d3.event.x)
				.attr("y", d3.event.y);
			self.svg.select("#obstacleRing").attr("cx",d3.event.x).attr("cy",d3.event.y);

			var obstacleBackground = self.svg.select("#obstacleBackground");
			// obstacleBackground active?
			if (obstacleBackground.attr("x") != NO_BACKGROUND && obstacleBackground.attr("y") != NO_BACKGROUND) {
				// obstacle with background selected?
				var selected = new Vector([d3.event.x, d3.event.y]);
				var background = new Vector([parseInt(obstacleBackground.attr("cx")), parseInt(obstacleBackground.attr("cy"))]);
				
				var dist = Vector.subtract(selected,background).magnitude();
				if (dist < circleRadius*1.5) {
					obstacleBackground
						.attr("cx", d3.event.x)
						.attr("cy", d3.event.y);
				}
			}
		})
        .on("start", function(d) {
			self.svg.select("#obstacleRing").attr("opacity",.4);
		})
        .on("end", function(d) {
			self.svg.select("#obstacleRing").attr("opacity",.0);
		}));
	}


	  // Goal setup
	var goalData = [[size-50, size-50]];


	svg.append("circle")
	.attr("cx", size-50)
	.attr("cy", size-50)
	.attr("id", "goalBackground")
	.attr("stroke-width",3)
	.attr("fill", "gold")
	.attr("r", circleRadius)
	.attr("opacity", .3);

	svg.selectAll("#goal")
	  .data(goalData)
	  .enter()
	  .append("svg:image")
	  .attr("x", size-50)
	  .attr("y", size-50)
	  .attr("id", "goal")
	  .attr("transform", "translate(-"+(circleRadius/2)+",-"+(circleRadius/2)+")")
	  .attr('width', circleRadius)
	  .attr('height', circleRadius)
	  .attr("xlink:href", "static/images/Star_Wars_C3PO.svg");

	if (this.inMovableObjects) {
		svg.select("#goal")
	  .call(d3.drag()
        .on("drag", function(d) {
			d3.select(this).attr("x", d3.event.x).attr("y", d3.event.y);
			self.svg.select("#goalBackground").attr("cx", d3.event.x).attr("cy", d3.event.y);
		})
		.on("start", function(d) {
			self.svg.select("#goalBackground").attr("stroke", "black");
		})
		.on("end", function(d) {
			self.svg.select("#goalBackground").attr("stroke", "transparent");
		}));
	}

	// We need to write this in a strange way because js doens't know what 'this' in the function is.
	//var t = this;
	//const timer = this.timer = setInterval(function(){t.updateRobotPosition();}, timerFrequency);
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

	if (props.visible == 0) {
		this.svg.attr("visibility", "hidden");
		d3.select("#forceViz").style("display", "inline");
	}
	if (props.visible == 1) {
		this.svg.attr("visibility", "visible");
		d3.select("#forceViz").style("display", "none");
	}
	if (props.forceViz == 0) {
		d3.select("#forceViz").style("display", "none");
	}
	if (props.forceViz == 1) {
		d3.select("#forceViz").style("display", "inline");
	}
	if (props.buttonVisible == 1) {
		d3.select("#button").style("visibility", "visible");
	}
	if (props.buttonVisible == 0) {
		d3.select("#button").style("visibility", "hidden");
	}

}

}// end of class

module.exports = CustomD3Component;
