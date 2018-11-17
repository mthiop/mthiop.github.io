const React = require('react');
const D3Component = require('idyll-d3-component');
const d3 = require('d3');

const size = 600;

class CustomD3Component extends D3Component {

  initialize(node, props) {
	  debugger;
    const svg = this.svg = d3.select(node).append('svg');
    svg.attr('viewBox', `0 0 ${size} ${size}`)
      .style('width', '100%')
      .style('height', 'auto');

//	const circle = this.circle = svg.append("circle")
//		circle
//      .attr('r', props.radius)
//      .attr('cx', Math.random() * size)
//      .attr('cy', Math.random() * size);

	const data = this.data = [1,2,3,4,5,6];

	  svg.append("g")
	  .selectAll("circle")
	  .data(data)
	  .enter()
	  .append("circle")
	  .attr("r", props.radius)
	  .attr("cx", (d) => { return  d*30;})
	  .attr("cy", (d) => { return  d*30;});

  }

  update(props, oldProps) {
    this.svg.selectAll('circle').
//	  .data(this.data)
//	  .enter()
	  .append('circle')
      //.transition()
      //.duration(750)
      .attr('cx', (d) => return Math.random() * size;)
      .attr('cy', (d) => return Math.random() * size;)
	  .attr("r", oldProps.radius));
  }
}

module.exports = CustomD3Component;
