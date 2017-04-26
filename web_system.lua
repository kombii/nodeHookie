function gWebDoChunk(jsonData)
	local info = {}
	if not jsonData['type'] then
		return {['code']='500'}
	elseif jsonData['type']=='info' then
		info['majorVer'],info['minorVer'],info['devVer'],info['chipId'],info['flashId'],info['flashSize'],info['flashMode'],info['flashSpeed'] = node.info()
		info['heap'] = node.heap()
		info['remaining'],info['used'],info['total'] = file.fsinfo()
		info['apSsid'] = config['ap']['ssid']
		info['apPhysical'] = wifi.getphymode()
		info['apChannel'] = config['ap']['channel']
		info['apMode'] = wifi.getmode()
		info['apGateway'] = wifi.ap.getip()
		info['connection'] = gWebConnection
	elseif jsonData['type']=='file' then
		info['file'] = file.list()
	end
	return {['code']='500'}
end
