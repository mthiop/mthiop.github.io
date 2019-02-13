const React = require('react');
const vis = require('vis');
const uuid = require('uuid')

var v = require('vectorious/withoutblas'),
    Vector = v.Vector;


class DebugComponentAttr extends React.Component {

    constructor(props) {
        super(props);

        const {identifier} = props;
        this.state = {
            identifier: identifier !== undefined ? identifier : uuid.v4()
        };

        console.log("after constructor");
        this.updateGraph = this.updateGraph.bind(this);
    }

    genAttractiveForce(goal) {
        let data = [];
        //steps =  50;  // number of datapoints will be steps*steps
        var axisMax = 450;
        var axisStep = axisMax / (axisMax/this.props.steps);


        //var e = 5;
        var e = this.props.attr_factor/5;
        console.log("Props.attr_factor:" + e);
        //F_Att = -e * (robot-qG) / norm(robot-goal); #quadratic


        var gx = 25; // goal x
        var gy = 25; // goal y

        for (var x = 0; x < axisMax; x += axisStep) {
            for (var y = 0; y < axisMax; y += axisStep) {
                var robot = new Vector([x, y]);
                var direction = Vector.subtract(robot, goal);

                var normTerm = e * direction.magnitude();

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
        //var steps = 50;  // number of datapoints will be steps*steps
        var axisMax = 450;
        var axisStep = axisMax / (axisMax/this.props.steps);
        var gx = 105; // obstacle x
        var gy = 105; // obstacle y
        //   var range = 1000;

        for (var x = 0; x < axisMax; x += axisStep) {
            for (var y = 0; y < axisMax; y += axisStep) {
                var n = this.props.rep_factor * 10000;// We need to scale the factor because the distances are to high since we use pixel values.
                //var radius = circleRadius; // We assume a circle for obstacles.
                var influenceRange = this.props.influence_range/2;
                var robot = new Vector([x, y]);
                var direction = Vector.subtract(robot, obstacle);
                var distance = direction.magnitude();

                if (distance > influenceRange) {
                    //return new Vector([0,0]);
                    var value = 0;
                } else {
                    var firstTerm = ((1 / distance) - (1 / influenceRange));
                    var secondTerm = (1 / (distance * distance));
                    var thirdTerm = (1 / direction.magnitude());
                    var factor = firstTerm * secondTerm * thirdTerm;
                    var force = Vector.scale(direction, factor);
                    var value = 0.5 * n * firstTerm;
                    if (value > 1000) {
                        value = 1000;
                    }
                }
                data.push({
                    x: x,
                    y: y,
                    z: value,
                })
            }
        }
        return data
    }

    genPotentialForce(array1, array2) {
        var data = array1.concat(array2)
        var grouped = []
        data.forEach(function (a) {
            var key = ['x', 'y'].map(function (k) {
                return a[k];
            }).join('&');
            if (!this[key]) {
                this[key] = {x: a.x, y: a.y, z: a.z};
                grouped.push(this[key]);
            }
		if (this[key].z + a.z > 10000) {
                        this[key].z = 10000;
                    } else {
            this[key].z += a.z;}
        }, Object.create(null));
        return grouped;
    }

    updateGraph() {
        console.log("Hallo");
        var data = new vis.DataSet();

        var goal = new Vector([50, 50]);
        var obstacle = new Vector([205,195]);
        let dataAttr = this.genAttractiveForce(goal);
        //let dataRep = this.genRepulsiveForce(obstacle);
        //let dataPot = this.genPotentialForce(dataRep, dataAttr);

        data.add(dataAttr);
        //console.log("Data is:" + this.props.data);
        //data.add(this.props.data);
        this.$el.setData(data);
        this.$el.setOptions(this.props.options);
        this.$el.redraw();
    }

    shouldComponentUpdate(nextProps) {
        let shouldUpdate = ((this.props.rep_factor != nextProps.rep_factor)
            || (this.props.influence_range != nextProps.influence_range)
            || (this.props.attr_factor != nextProps.attr_factor)
            || (this.props.steps != nextProps.steps));
        console.log(shouldUpdate);
        return shouldUpdate;
    }

    componentDidUpdate() {
        this.updateGraph()
    }

    componentDidMount() {
        const container = document.getElementById(this.state.identifier);
        this.$el = new vis.Graph3d(container, undefined, this.props.options);
        this.$el.on('cameraPositionChange', this.props.cameraPositionChangeHandler);
        this.updateGraph();
    }

    // [DebugComponent rep_factor:rep_factor attr_factor:attr_factor influence_range:influence_range steps:steps /]
    render() {
        const {identifier} = this.state;

        console.log('render called');

        var options = {
            zMax: 2000,
            style: 'surface'
        };

        return (
            <div>
                <div id={identifier}/>
            </div>
        )
    };
}

/*
                <p>Rep_Factor:
                    {this.props.rep_factor}</p>
                <p>attr_factor:
                    {this.props.attr_factor}</p>
                <p>influence_range:
                    {this.props.influence_range}</p>
                <p>steps:
                    {this.props.steps}</p>
 */

DebugComponentAttr.defaultProps = {
    options: {
        width: '400px',
        height: '350px',
        style: 'surface',
        showPerspective: true,
        showGrid: true,
        showShadow: false,
        keepAspectRatio: true,
        verticalRatio: 0.5,
        zMax: 2000,
	cameraPosition:{horizontal: 1.8, vertical: 0.35, distance: 1.7}
    },
    cameraPositionChangeHandler: function () {
    }
};

module.exports = DebugComponentAttr;
