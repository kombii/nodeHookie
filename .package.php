<?php

$list = ['hookie.js'];
$list = ['hookie.html','hookie.css','hookie.js'];
$fp = fopen('./package/package.b64', 'w+');
$dh = opendir('.');
while (false!==($file=readdir($dh))){
	if (is_dir($file) || $file==basename(__FILE__) || (!empty($list) && !in_array($file,$list))) {
		continue;
	}
	$data = file_get_contents($file);
	$len = strlen($data);
	if ($file=='install.lua') {
		copy($file, './package/'.$file);
		continue;
	}
	echo $file."\r\n";
	fwrite($fp, "#".$file."\n");
	$n = 160;
	for ($i=0; $i<$len; $i+=$n) {
		if ($i+$n>$len) {
			$n = $len - $i;
		}
		$b64 = base64_encode(substr($data,$i,$n));
		fwrite($fp, $b64."\n");
	}
	fwrite($fp, "~\n");
}
closedir($dh);
fclose($fp);
