function gWebDoChunk(jsonData)
	if not jsonData['type'] then
		return {['code']='500'}
	elseif not jsonData['file'] then
		return {['code']='500'}
	elseif jsonData['type']=='rename' then
		if not file.exists(jsonData['file']) then
			return {['code']='404'}
		elseif not jsonData['rename'] or #jsonData['rename']<=0 then
			return {['code']='500'}
		elseif file.exists(jsonData['rename']) or not file.rename(jsonData['file'],jsonData['rename']) then
			return {['code']='500'}
		end
		return {['file']=jsonData['rename']}
	elseif jsonData['type']=='remove' then
		file.close(jsonData['file'])
		file.remove(jsonData['file'])
		if file.exists(jsonData['file']) then
			return {['code']='500'}
		end
		return {['file']=jsonData['file']}
	elseif jsonData['type']=='save' then
		local fileTmp = jsonData['file']..'.tmp'
		if jsonData['pos']==0 then
			file.open(fileTmp, 'w+')
		else
			file.open(fileTmp, 'a+')
		end
		local saved = 0
		if jsonData['data'] then
			jsonData['data'] = encoder.fromBase64(jsonData['data'])
			saved = #jsonData['data']
		else
			return {['code']='500'}
		end
		if jsonData['size']>0 then
			if not file.write(jsonData['data']) then
				saved = -1
			end
		end
		file.close()
		if saved+jsonData['pos']>=jsonData['size'] then
			file.remove(jsonData['file'])
			file.rename(fileTmp, jsonData['file'])
		end
		return {
			['file'] = jsonData['file'],
			['pos'] = jsonData['pos'],
			['tab'] = jsonData['tab'],
			['saved'] = saved,
		}
	end
	return {['code']='500'}
end
