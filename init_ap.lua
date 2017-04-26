dofile('config_ap.lua')
config['ap']['ssid'] = config['ap']['ssid']..'-'..node.chipid()
config['ap']['channel'] = node.random(1,13)
wifi.setmode(wifi.NULLMODE)
wifi.setphymode(wifi.PHYMODE_G)
wifi.setmode(wifi.SOFTAP)
wifi.ap.setip({
	['ip']='1.1.1.1',
	['netmask']='255.255.255.0',
	['gateway']='1.1.1.1',
})
wifi.ap.config(config['ap'])
wifi.ap.dhcp.config({['start']='1.1.1.10'})
wifi.ap.dhcp.start()
