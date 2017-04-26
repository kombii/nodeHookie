function gWebDoChunk(jsonData)
	local function lOutput(message,err)
		if not gWebSockConsole or not gWebSockConsole:send then
			return false
		end
		message = {['code']='200',['entry']='console/output',['message']=message}
		if err then
			message['error'] = true
		end
		s,message = pcall(cjson.encode, message)
		if not s then
			return false
		end
		if #message>125 then
			gWebSockConsole:send(string.char(129,126,(#message/256),#message%256)..message, function()end)
		else
			gWebSockConsole:send(string.char(129,#message)..message, function()end)
		end
		return true
	end
	if not jsonData['type'] then
		return {['code']='500'}
	elseif jsonData['type']=='redirect' then
		node.output(function(s)lOutput(s,false)end, 1)
		return {['code']='200'}
	elseif jsonData['type']=='input' then
		if not jsonData['command'] then
			return {['code']='500'}
		end
		local f = nil
		local e = ''
		if string.sub(jsonData['command'],1,1)=='=' then
			jsonData['command'] = 'print('..string.sub(jsonData['command'],2)..')'
		end
		f,e = loadstring(jsonData['command'])
		if not f then
			lOutput(string.gsub(e,'^%[.+%]:','stdin:'), true)
		else
			xpcall(f, function(e)lOutput(string.gsub(e,'^%[.+%]:','stdin:'),true)end)
		end
		return {['code']='200'}
	end
	return {['code']='500'}
end
