clicks = 0;
start = 0;
running = false

user.mousedown(function()
	if clicks == 0 then
		start = time()
		running = true
		print("Started")
	end

	clicks = clicks + 1
end)

function onupdate()
	if running then
		local dt = time() - start
		if dt > 5 then
			local cps = clicks / dt 
			print("Clicks per second: " .. cps)
			running = false
		end
	end		
end

print("Click to start test")