playerX = 100
playerY = 100
playerW = 100
playerH = 100

keys = {}

user.keydown(function(k)
	keys[k] = true
end)

user.keyup(function(k)
	keys[k] = nil
end)

before = 0

function onupdate(now)
	canvas.setfill(0, 0, 0)
	canvas.fillrect(0, 0, canvas.width(), canvas.height())

	canvas.setfill(255, 255, 255)
	canvas.fillrect(playerX, playerY, playerW, playerH)

	if keys[68] then
	playerX = playerX + 10
	end

	if keys[65] then
	playerX = playerX - 10
	end

	if keys[87] then
	playerY = playerY - 10
	end

	if keys[83] then
	playerY = playerY + 10
	end

	canvas.setfill(255, 255, 255)
	canvas.drawtext(0, 20, 20, math.floor(1000 / (now - before)))
	
	before = now
end