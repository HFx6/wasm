grid = {}

gridWidth = 100
gridHeight = 100

math.randomseed(math.floor(time() * 1000))

cellWidth = canvas.width() / gridWidth
cellHeight = canvas.height() / gridHeight

for x=1, gridWidth do
	grid[x] = {}

	for y=1, gridHeight do
		grid[x][y] = math.random(0, 10) == 0
	end
end

function getCell(x, y)
	if x <= 0 or x > gridWidth or y <= 0 or y > gridHeight then
		return false
	end

	return grid[x][y]
end

function step()
	local newGrid = {}

	for x=1, gridWidth do
		newGrid[x] = {}

		for y=1, gridHeight do
			local n = 0

			if getCell(x+1,y) then n = n + 1 end
			if getCell(x-1,y) then n = n + 1 end
			if getCell(x,y+1) then n = n + 1 end
			if getCell(x,y-1) then n = n + 1 end
			if getCell(x+1,y+1) then n = n + 1 end
			if getCell(x-1,y+1) then n = n + 1 end
			if getCell(x+1,y-1) then n = n + 1 end
			if getCell(x-1,y-1) then n = n + 1 end

			if grid[x][y] then
				newGrid[x][y] = n == 2 or n == 3
			else
				newGrid[x][y] = n == 3
			end
		end
	end

	grid = newGrid
end

function render()
	canvas.setfill(0, 0, 0)
	canvas.fillrect(0, 0, canvas.width(), canvas.height())

	canvas.setfill(255, 255, 255)

	for x=1, gridWidth do
		for y=1, gridHeight do
			if grid[x][y] then
				canvas.fillrect((x - 1) * cellWidth, (y - 1) * cellHeight, cellWidth, cellHeight)
			end
		end
	end
end

frame = 0

function onupdate()
	if frame % 3 == 0 then
		step()
	end

	render()

	frame = frame + 1
end