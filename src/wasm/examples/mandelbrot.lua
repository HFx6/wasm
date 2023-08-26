function map(s_min, s_max, d_min, d_max, v)
	return (v - s_min) / (s_max - s_min) * (d_max - d_min) + d_min
end

width = canvas.width()
height = canvas.height()

xmin = -2.5
xmax = 1.0
ymin = 1.0
ymax = -1.0
maxiter = 100

canvas.beginpixels()

for px = 0, width - 1 do
	for py = 0, height - 1 do
		local x0 = map(0.0, width, xmin, xmax, px)
		local y0 = map(0.0, height, ymin, ymax, py)
		
		local x = 0.0
		local y = 0.0
		local iteration = 0
		
		while x*x + y*y <= 2*2 and iteration < maxiter do
			local xtemp = x*x - y*y + x0
			y = 2.0*x*y + y0
			x = xtemp
			iteration = iteration + 1
		end
		
		local intensity = iteration / maxiter
		intensity = intensity ^ 0.4
		local col = math.floor(intensity * 255)
		
		canvas.setpixel(px, py, col, col, col)
	end
end

canvas.applypixels()