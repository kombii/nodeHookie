dofile('config_init.lua')
for i,v in pairs(config['fileInit']) do
	dofile('init_'..v..'.lua')
end

