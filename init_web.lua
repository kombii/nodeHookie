dofile('config_web.lua')
if gWeb then
	pcall(function()
		gWeb:close()
	end)
end
gWebSockConsole = nil
gWebConnection = 0
gWeb = net.createServer(net.TCP, config['web']['keepAlive'])
gWeb:listen(config['web']['port'], function(sock)
	local buffer = ''
	local ws = false
	sock:on('connection', function(sock)
		gWebConnection = gWebConnection + 1
		buffer = ''
		ws = false
	end)
	sock:on('disconnection', function(sock,code)
		gWebConnection = gWebConnection - 1
		buffer = ''
		ws = false
		if gWebSockConsole and gWebSockConsole==sock then
			node.output(nil)
		end
	end)
    sock:on('receive', function(sock,data)
		local function lWebSend101(key)
			key = crypto.toBase64(crypto.hash("sha1",key..'258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))
			sock:send('HTTP/1.1 101 Switching Protocols\r\nConnection:Upgrade\r\nUpgrade:WebSocket\r\nSec-WebSocket-Accept:'..key..'\r\nSec-WebSocket-Version:13\r\n\r\n', function()end)
		end
		local function lWebSend404()
			if not ws then
				sock:send('HTTP/1.1 404 Not Found\r\nConnection:keep-alive\r\nContent-Length:0\r\n\r\n', function()end)
			else
				sock:send(string.char(129,14)..'{"code":"404"}', function()end)
			end
		end
		local function lWebSend501()
			if not ws then
				sock:send('HTTP/1.1 501 Not Implemented\r\nConnection:keep-alive\r\nContent-Length:0\r\n\r\n', function()end)
			else
				sock:send(string.char(129,14)..'{"code":"501"}', function()end)
			end
		end
		local function lWebSend503()
			if not ws then
				sock:send('HTTP/1.1 503 Service Unavailable\r\nConnection:keep-alive\r\nContent-Length:0\r\n\r\n', function()end)
			else
				sock:send(string.char(129,14)..'{"code":"503"}', function()end)
			end
		end
		local function lWebSendRaw(raw)
			if not ws then
				local s = 'HTTP/1.1 200 OK\r\nConnection:keep-alive\r\nCache-Control:no-cache,must-revalidate,no-store,max-age=0\r\n'
				sock:send(s..'Pragma:no-cache\r\nContent-Type:application/json;charset=utf-8\r\nContent-Length:'..#raw..'\r\n\r\n'..raw, function()end)
			else
				if #raw>125 then
					sock:send(string.char(129,126,(#raw/256),#raw%256)..raw, function()end)
				else
					sock:send(string.char(129,#raw)..raw, function()end)
				end
			end
		end
		local function lWebContentType(fileName)
			local contentType = 'Content-Type:'
			if string.sub(fileName,-3)=='.js' then
				return contentType..'application/javascript\r\n'
			elseif string.sub(fileName,-4)=='.css' then
				return contentType..'text/css\r\n'
			elseif string.sub(fileName,-4)=='.gif' then
				return contentType..'image/gif\r\n'
			elseif string.sub(fileName,-5)=='.html' then
				return contentType..'text/html\r\n'
			elseif string.sub(fileName,-4)=='.ico' then
				return contentType..'image/x-icon\r\n'
			elseif string.sub(fileName,-5)=='.jpeg' or string.sub(fileName,-4)=='.jpg' then
				return contentType..'image/jpeg\r\n'
			elseif string.sub(fileName,-5)=='.json' then
				return contentType..'application/json\r\n'
			elseif string.sub(fileName,-4)=='.png' then
				return contentType..'image/png\r\n'
			elseif string.sub(fileName,-4)=='.xml' then
				return contentType..'text/xml\r\n'
			else
				return ''
			end
		end
		local s = nil
		local fd = nil
		local fileName = nil
		local jsonData = nil
		_,_,s = string.find(data, 'ec%-WebSocket%-Key: (.-)\r\n')
		if ws then
			if #buffer>4096 then
				buffer = ''
				return sock:send(string.char(136,0), function()end)
			end
			local b = string.byte(string.sub(data,1,1))
			local fin = bit.band(b, 128)
			local op = bit.band(b, 15)
			b = string.byte(string.sub(data,2,2))
			local mask = bit.band(b, 128)
			local length = bit.band(b, 127)
			if not mask then
				buffer = ''
				return sock:send(string.char(136,0), function()end)
			end
			if op==8 then
				buffer = ''
				return sock:send(string.char(136,0), function()end)
			elseif op==9 then
				return sock:send(string.char(138,0), function()end)
			end
			op = 3
			if length==126 then
				length = string.byte(string.sub(data,3,3))*256 + string.byte(string.sub(data,4,4))
				op = 5
			elseif length==127 then
				buffer = ''
				return sock:send(string.char(136,0), function()end)
			end
			s = string.sub(data, op, op+3)
			mask = string.sub(data, op+4)
			mask = crypto.mask(mask, s)
			data = nil
			if not fin then
				buffer = buffer..mask
				return
			elseif #buffer>0 then
				mask = buffer..mask
			end
			buffer = ''
			_,_,fileName,s,jsonData = string.find(mask, '^(.-)/(%d-)/(.+)$')
			if not s then
				return
			end
			data = string.sub(jsonData, s+1)
			jsonData = string.sub(jsonData,1,s)
			s,jsonData = pcall(cjson.decode, jsonData)
			if not s then
				return
			end
			if data then
				jsonData['data'] = data
			else
				jsonData['data'] = ''
			end
			gWebSockConsole = sock
		elseif s then
			buffer = ''
			ws = true
			return lWebSend101(s)
		else
			if #buffer>2048 then
				buffer = ''
				return lWebSend501()
			end
			if string.sub(data,-4)~='\r\n\r\n' then
				buffer = buffer..data
				return
			elseif #buffer>0 then
				data = buffer..data
			end
			buffer = ''
			s,_,fileName = string.find(data, '^GET /(.-) HTTP/1.1\r\n')
			if not s then
				return lWebSend501()
			end
			if not fileName then
				fileName = config['web']['default']
			end
			_,_,s,jsonData = string.find(fileName, '^(.-)/(.+)$')
			if jsonData then
				fileName = s
				jsonData = string.gsub(jsonData,'%%(%x%x)',function(h)
					return string.char(tonumber(h,16))
				end)
				s,jsonData = pcall(cjson.decode, jsonData)
				if not s then
					jsonData = {}
				end
			end
			fileName = string.gsub(fileName, '%?.+$', '')
		end
		if jsonData then
			s = 'web_'..fileName..'.lua'
			if not file.exists(s) then
				return lWebSend404()
			end
			if not pcall(dofile,s) then
				return lWebSend503()
			elseif not gWebDoChunk then
				return lWebSend501()
			end
			data = gWebDoChunk(jsonData)
			if not data['code'] then
				data['code'] = '200'
			end
			data['entry'] = fileName..'/'..jsonData['type']
			s,data = pcall(cjson.encode, data)
			if not s then
				return lWebSend503()
			else
				return lWebSendRaw(data)
			end
		else
			local contentType = lWebContentType(fileName)
			fd = file.open(fileName)
			if not fd then
				return lWebSend404()
			end
			local function lWebSendFile(sock, fd)
				local data = fd:read()
				if not data then
					fd:close()
					sock:send('0\r\n\r\n', function()end)
					return
				end
				sock:send(string.format('%x',#data)..'\r\n'..data..'\r\n', function()
					lWebSendFile(sock, fd)
				end)
			end
			sock:send('HTTP/1.1 200 OK\r\n'..contentType..'Connection:close\r\nCache-Control:max-age='..config['web']['cacheAge']..',public\r\ntransfer-encoding:chunked\r\n\r\n', function()
				lWebSendFile(sock, fd)
			end)
		end
	end)
end)
