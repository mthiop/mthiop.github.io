const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');
const Graph3D = require('react-graph3d-vis');

const d33d = require('d3-3d');
var v = require('vectorious/withoutblas'),
Vector = v.Vector;

const size = 500;
const circleRadius = 10;
const transitionDuration = 450;//ms
const timerFrequency = 500;//ms

class CustomPlot extends D3Component {
  
calc_d(x, y, gx, gy) {
    return Math.pow(x-gx,2)+Math.pow(y-gy,2); 
}
 
genAttractiveForce(goal) {
    let data = []
    const steps =  50;  // number of datapoints will be steps*steps
    var axisMax = 500;
    var axisStep = axisMax / steps;

    var e = 1;
    var e = this.inAttractionFactor;
	//F_Att = -e * (robot-qG) / norm(robot-goal); #quadratic
    
    
    var gx = 25; // goal x
    var gy = 25; // goal y   

    for (var x = 0; x < axisMax; x+=axisStep) {
      for (var y = 0; y < axisMax; y+=axisStep) {
	var robot = new Vector([x, y]);
        var direction = Vector.subtract(robot, goal);

	var normTerm = e*direction.magnitude();
	var result = Vector.scale(direction, (-e / normTerm));
	//var d = this.calc_d(x, y, gx, gy);
	//var normTerm = 0.5*Math.pow(Math.sqrt(d),2);
        data.push({
          x: x,
          y: y,
          z: normTerm,
          style: normTerm
        })
      }
    }
 
    return data
}

genRepulsiveForce(obstacle) {


	//const v = this.props.hallo;
	let data = []
    var steps = 50;  // number of datapoints will be steps*steps
    var axisMax = 500;
    var axisStep = axisMax / steps;
    var gx = 105; // obstacle x
    var gy = 105; // obstacle y
 //   var range = 1000;   

    for (var x = 0; x < axisMax; x+=axisStep) {
      for (var y = 0; y < axisMax; y+=axisStep) {
	var n = this.inRepulsiveFactor * 10000;// We need to scale the factor because the distances are to high since we use pixel values.
	//var radius = circleRadius; // We assume a circle for obstacles.
	var influenceRange = this.inInfluenceRange;
	var robot = new Vector([x, y]);
	var direction = Vector.subtract(robot, obstacle);
	var distance = direction.magnitude();
//var n = 2000;

	if (distance > influenceRange) {
		//return new Vector([0,0]);
		var value = 0;
	} else {
		var firstTerm = ((1/distance) - (1/influenceRange));
		var secondTerm = (1/(distance*distance));
		var thirdTerm = (1/direction.magnitude());
		var factor = firstTerm * secondTerm * thirdTerm;
		var force = Vector.scale(direction, factor);
		var value = 0.5*n*firstTerm;
		/**if (value < 0) {
			value = 0;
		}**/
		if (value > 1000) {
			value = 1000;
		}


		//return force;
	}
	/**var d = this.calc_d(x, y, gx, gy);
	var term1 = 1/Math.sqrt(d);
	var term2 = 1/range;
	var res = term1-term2;
	
	if (d <= range) {
		var value = 0.5*v*Math.pow(res,2);
	} else {
		var value = 0
	}**/
//console.log(value)
        data.push({
          x: x,
          y: y,
          z: value,
          style: value,
        })
      }
    }
 //console.log(data)
    return data


}

genPotentialForce(array1, array2) {
 var data = array1.concat(array2)
var grouped = []
data.forEach(function (a) {
    var key = ['x', 'y'].map(function (k) { return a[k]; }).join('&');
    if (!this[key]) {
        this[key] = { x: a.x, y: a.y, z: a.z };
        grouped.push(this[key]);
    }
    this[key].z += a.z;
}, Object.create(null));
//console.log(grouped)
return grouped;
}

/**initialize(node, props) {
	  // Parameters
	//const inAnimationRunning = this.inAnimationRunning = 1;
	//const inMovableObjects = this.inMovableObjects = props.movable_objects;
	const inAttractionFactor = this.inAttractionFactor = props.attr_factor;
	//const inRepulsiveFactor = this.inRepulsiveFactor = this.props.rep_factor;
	//const inStepSize = this.inStepSize = props.step_size;
	const inInfluenceRange = this.inInfluenceRange= props.influence_range;
}**/

/**update(props, oldProps) {
	// Update algorithm properties
	
	if (oldProps.attr_factor != props.attr_factor) {
		this.inAttractionFactor = props.attr_factor;
	}

	if (oldProps.rep_factor != this.props.rep_factor) {
		this.inRepulsiveFactor = this.props.rep_factor;
	}

	if (oldProps.influence_range != props.influence_range) {
		this.inInfluenceRange = props.influence_range;
	}

	if (oldProps.step_size != props.step_size) {
		this.inStepSize = props.step_size;
	}
}**/

render () {
	  // Parameters
	//const inAnimationRunning = this.inAnimationRunning = 1;
	//const inMovableObjects = this.inMovableObjects = props.movable_objects;
	const inAttractionFactor = this.inAttractionFactor = this.props.attr_factor;
	const inRepulsiveFactor = this.inRepulsiveFactor = this.props.rep_factor;
	//const inStepSize = this.inStepSize = props.step_size;
	const inInfluenceRange = this.inInfluenceRange= this.props.influence_range;
var options = {
    zMax: 2000,
    style: 'surface'
};

	var goal = new Vector([25, 25]);
var obstacle = new Vector([100, 100]);
    let dataAttr = this.genAttractiveForce(goal)
    let dataRep = this.genRepulsiveForce(obstacle)
    let dataPot = this.genPotentialForce(dataRep, dataAttr)
    return (
<div>
<Graph3D data={dataPot} options={options}/>

</div>	
)
  }

}
module.exports = CustomPlot;
