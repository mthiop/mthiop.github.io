graphics_toolkit("gnuplot")
# Start and goal
q = [0,0]
qG = [10,10]

# Obstacle
#very simple case
qC = [4.1,4]
# simple case
#qC = [6,4; 2,3;4,4]
# this breaks for some reason
#qC = [5,0;5,1;5,2;5,3;5,4;5,5;  9,12;9,11;9,10;9,9]
# cool curve
#qC = [5,0;5,1;5,2;5,3;5,4;5,5;  8,9;7,10]

# ATTRACTOR
function F_Att = F_AttFunc(q,qG)
	e = 0.3;
	#F_Att = -e * (q-qG) / norm(q-qG); #linear
	F_Att = -e * (q-qG) / norm(q-qG); #quadratic
endfunction

# REPULSIVE
function F_Rep = F_RepFunc(q, qC)
	n = 0.8;
	pq = norm(q-qC);
	p0 = 5; # influence range
	if (pq > p0)
		F_Rep = [0,0];
	else
		F_Rep_first =((1./pq) - (1./p0));
		F_Rep_second = (1./(pq*pq));
		F_Rep_third = (1./norm(q-qC));
		F_Rep = n * F_Rep_first * F_Rep_second * F_Rep_third * (q-qC);
	endif
endfunction

Q = q

iteration = 0
while (norm(q-qG) > 0.3 && iteration < 400)
	iteration++
	F = F_AttFunc(q,qG) 
	for i = 1:rows(qC)
		F = F + F_RepFunc(q,qC(i,:));
	endfor
	q = q + F
	Q = [Q;q];
endwhile

# Print everything in the same graph
hold on;
# plot goal
plot(10,10, 'marker', '*')
# plot obstacles
plot(qC(:,1),qC(:,2), 'marker', 's', 'linestyle', 'none')
plot(Q(:, 1), Q(:,2), 'marker', '.')
hold off;
pause()
