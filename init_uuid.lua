dofile('config_uuid.lua')
if not config['uuid'] then
	config['uuid'] = node.chipid()..'-'..node.random(10101010,90909090)
	file.open('config_uuid.lua', 'w+')
	file.writeline("config['uuid'] = '"..config['uuid'].."'")
	file.close()
end
