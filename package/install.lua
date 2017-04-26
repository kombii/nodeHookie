n = 0
fpDESC = nil
fileName = nil
fp = file.open('package.b64', 'r+')
while true do
	local data = fp:readline();
	if not data then
		break
	end
	data = string.gsub(data, '\n', '')
	if data~='' then
		if string.sub(data,1,1)=='#' then
			fileName = string.sub(data,2)
			print(fileName)
			fpDESC = file.open(fileName, 'w+')
			n = 0
		elseif string.sub(data,1,1)=='~' then
			fpDESC:close()
			print(n)
		else
			data = encoder.fromBase64(data)
			fpDESC:write(data)
			n = n + #data
		end
	end
end
fp:close()
--file.remove('package.b64')
--file.remove('install.lua')
