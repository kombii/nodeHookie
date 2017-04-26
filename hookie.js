
////////////////////////////////
var wsInstance = null;
var editor = null;
var fileCurrent = '';
var fileCache = {};
var fileChange = {};
var savingList = [];
var codeBarMove = false;
var commandList = [];
var commandIndex = -1;

////////////////////////////////
window.onload = function() {
	////////////////////////////
    editor = CodeMirror.fromTextArea('codeArea', {
        lineNumbers: true,
		textWrapping: false,
        reindentOnLoad: true,
        indentUnit: 4,
        height: '100%',
        parserfile: "hookie_codelua.js",
        stylesheet: "hookie_codecolor.css",
		onChange: function(){
			if (!fileCurrent) {
				return;
			}
			fileChange[fileCurrent] = true;
			$(".codeBar div[name='"+fileCurrent+"'] .change").remove();
			$(".codeBar div[name='"+fileCurrent+"']").append('<span class="change">*</span>');
		},
    });
	////////////////////////////
    $('.btnRefresh').click(function(e) {
        nodeFile();
    });
	////////////////////////////
    $('.btnCreate').click(function(e) {
        popupUpload();
    });
	////////////////////////////
    $('.icoSave').click(function(e) {
		if (!fileCurrent) {
			return;
		}
		fileCache[fileCurrent] = editor.getCode();
		savingList = [fileCurrent];
		fileSave(0, false);
    });
	////////////////////////////
    $('.icoNew').click(function(e) {
		var file = 'new_'+parseInt(Math.random()*1000000+10000000)+'.txt';
		fileCache[file] = '';
		fileApply(file);
    });
	////////////////////////////
    $('.icoSaveAll').click(function(e) {
		if (fileCurrent) {
			fileCache[fileCurrent] = editor.getCode();
		}
		savingList = [];
		for (file in fileChange) {
			if (!fileChange[file]) {
				continue;
			}
			savingList.push(file);
		}
		if (!savingList.length) {
			return;
		}
		fileSave(0, false);
    });
	////////////////////////////
    $('.icoLeft').mousedown(function(e) {
		codeBarMove = true;
		codeBarMoveRight();
    });
	////////////////////////////
    $('.icoLeft').mouseout(function(e) {
		codeBarMove = false;
    });
	////////////////////////////
    $('.icoLeft').mouseup(function(e) {
		codeBarMove = false;
    });
	////////////////////////////
    $('.icoRight').mousedown(function(e) {
		codeBarMove = true;
		codeBarMoveLeft();
    });
	////////////////////////////
    $('.icoRight').mouseout(function(e) {
		codeBarMove = false;
    });
	////////////////////////////
    $('.icoRight').mouseup(function(e) {
		codeBarMove = false;
    });
	////////////////////////////
    $('.openConsole').click(function(e) {
		$('.console').fadeIn(100);
    });
	////////////////////////////
    $('.closeConsole').click(function(e) {
		$('.console').fadeOut(100);
    });
	////////////////////////////
	$('.console .input input').keydown(function(e) {
		if (e.keyCode==13) {
			commandIndex = -1;
			var command = $(this).val();
			if (!command || !wsInstance || wsInstance.readyState!=1) {
				return;
			}
			$(this).val('');
			consoleOutput(command, 'c');
			command = JSON.stringify({
				'type': 'input',
				'command': command,
			});
			wsInstance.send('console/'+command.length+'/'+command);
		} else if (e.keyCode==38) {
			commandIndex ++;
			if (commandIndex>=commandList.length) {
				commandIndex = commandList.length - 1;
			}
			if (commandList[commandIndex]) {
				$(this).val(commandList[commandIndex]);
			} else {
				$(this).val('');
			}
		} else if (e.keyCode==40) {
			commandIndex --;
			if (commandIndex<=0) {
				commandIndex = -1;
			}
			if (commandIndex>=0 && commandList[commandIndex]) {
				$(this).val(commandList[commandIndex]);
			} else {
				$(this).val('');
			}
		}
    });
	////////////////////////////
    $('#popup .close').click(function(e) {
        popupClose();
    });
	////////////////////////////
    $(window).resize(function(e) {
        resizeContent();
    });
	////////////////////////////
    resizeContent();
	$('#body').fadeIn(200);
	loadingCheck();
	nodeFile();
};

////////////////////////////////
function wsInit() {
    this.wsInstance = new WebSocket('ws://'+document.domain+':80');
    this.wsInstance.onopen = function(e) {
		nodeInfo();
		wsInstance.send('console/19/{"type":"redirect"}');
		// ...
    };
    this.wsInstance.onclose = function(e) {
		if (savingList.length) {
			savingList = [];
			popupNotice('🚫', 'OPERATION FAILED');
		}
		setTimeout('wsInit();', 3000);
    };
    this.wsInstance.onmessage = function(e) {
		var data = JSON.parse(e.data);
		if (!data['entry']) {
			return;
		} else if (data['entry']=='file/save') {
			if (data['code']!='200' || data['saved']<0) {
				savingList = [];
				popupNotice('🚫', 'OPERATION FAILED');
				return;
			}
			var pos = data['pos'] + data['saved'];
			fileSave(pos, data['tab']);
		} else if (data['entry']=='console/output') {
			if (data['message']=='\n' || data['message']=='> ' || data['message']=='>> ') {
				return;
			}
			var style = 'i';
			if (data['error']) {
				style = 'e';
			}
			consoleOutput(data['message'], style);
		} else if (data['entry']=='system/info') {
			if (data.chipId) {
				if (data.apMode==1) {
					data.apMode = 'STATION';
				} else if (data.apMode==2) {
					data.apMode = 'SOFTAP';
				} else if (data.apMode==3) {
					data.apMode = 'STATIONAP';
				} else {
					data.apMode = 'NULLMODE';
				}
				if (data.apPhysical==1) {
					data.apPhysical = '11b';
				} else if (data.apPhysical==2) {
					data.apPhysical = '11g';
				} else if (data.apPhysical==3) {
					data.apPhysical = '11n';
				}
				$('#info_chipId').html(data.chipId);
				$('#info_flashId').html(data.flashId);
				$('#info_version').html(data.majorVer+'.'+data.minorVer+'.'+data.devVer);
				$('#info_spiffs').html(parseInt(data.flashSize/1024)+'M/'+parseInt(data.flashSpeed/1000000)+'MHz');
				$('#info_rom').html(parseFloat(data.remaining/1048576).toFixed(1)+'/'+parseFloat(data.total/1048576).toFixed(1)+'M');
				$('#info_ram').html(data.heap.toLocaleString());
				$('#info_ap').html(data.apPhysical+'#'+data.apChannel+'/'+data.apMode);
				$('#info_ssid').html(data.apSsid);
				$('#info_gateway').html(data.apGateway);
				$('#info_connection').html(data.connection);
			}
		}
		// ...
    };
    this.wsInstance.onerror = function(e) {
        // ...
    };
}

////////////////////////////////
function loadingCheck() {
	if ($('.CodeMirror-line-numbers div').length>1) {
		wsInit();
		popupClose();
		popupInit();
		setInterval('checkConsoleState();', 1000);
		return true;
	}
	setTimeout('loadingCheck();', 100);
	return false;
}

////////////////////////////////
function resizeContent() {
    var height = $(window).height();
    $('.list').height(height-144);
    $('.code').height(height-128);
    $('.console .output').height(height-144);
}

////////////////////////////////
function checkConsoleState() {
	if (!wsInstance || wsInstance.readyState!=1) {
		$('.console .input input').val('WAITING FOR CONNECTION');
		$('.console .input input').attr('disabled',true);
		$('.footer .openConsole').css('background-color', '#963');
		$('.footer .closeConsole').css('background-color', '#963');
	} else if ($('.console .input input').attr('disabled')) {
		$('.console .input input').val('');
		$('.console .input input').attr('disabled',false);
		$('.footer .openConsole').css('background-color', '#396');
		$('.footer .closeConsole').css('background-color', '#396');
	}
}

////////////////////////////////
function codeBarCheckPos() {
	var r = false;
    var marginLeft = parseInt($('.codeBar').css('margin-left'));
	var widthTab = 0;
	$(".codeBar div").each(function(){
		widthTab += $(this).width()+17;
	});
	widthTab = $('.code').width() - $('.codeButton').width() - 64 - widthTab;
	if (widthTab>0) {
		widthTab = 0;
	}
	if (marginLeft>=0) {
		r = true;
		marginLeft = 0;
	}
	if (marginLeft<widthTab) {
		r = true;
		marginLeft = widthTab;
	}
	if (r) {
		$('.codeBar').css('margin-left', marginLeft+'px');
	}
	return r;
}

////////////////////////////////
function codeBarMoveLeft() {
	if (!codeBarMove) {
		return;
	}
    var marginLeft = parseInt($('.codeBar').css('margin-left'));
	marginLeft -= 10;
	$('.codeBar').css('margin-left', marginLeft+'px');
	if (!codeBarCheckPos()) {
		setTimeout('codeBarMoveLeft();', 50);
	}
}

////////////////////////////////
function codeBarMoveRight() {
	if (!codeBarMove) {
		return;
	}
    var marginLeft = parseInt($('.codeBar').css('margin-left'));
	marginLeft += 10;
	$('.codeBar').css('margin-left', marginLeft+'px');
	if (!codeBarCheckPos()) {
		setTimeout('codeBarMoveRight();', 50);
	}
}

////////////////////////////////
function popupInit() {
	$('#popup').css('min-width', '280px');
	$('#popup').css('text-align', 'left');
	$('#popup').css('line-height', '32px');
	$('#popup .close').show();
	$('#popup .title').css('padding', '0 8px');
	$('#popup .message').css('padding', '8px 16px');
	$('#popup .message').css('line-height', '24px');
	$('#popup .button').css('padding', '4px 16px 16px 16px');
}
////////////////////////////////
function popupShow() {
	$('#mask').show();
	$('#popup').css('margin-left', '-'+parseInt($('#popup').width()/2)+'px');
	$('#popup').css('margin-top', '-'+parseInt($('#popup').height()/2)+'px');
	$('#popup').fadeIn(200);
}

////////////////////////////////
function popupClose() {
	$('#popup').hide();
	$('#mask').hide();
	$('#popup .close').show();
	$('#popup .title').html('');
	$('#popup .message').html('');
	$('#popup .button').html('');
}

////////////////////////////////
function popupNotice(ico, text) {
	popupClose();
	$('#popup .title').html('<span>'+ico+'</span>NOTICE');
	$('#popup .message').html('<div style="text-align:center;margin-top:20px;">'+text+'</div>');
	$('#popup .button').html('');
	popupShow();
}

////////////////////////////////
function popupSaving(file) {
	popupClose();
	$('#popup .title').html('<span>💾</span>OPERATION');
	$('#popup .close').hide();
	$('#popup .message').html('FILE: '+file+'<br />'+'SIZE: '+fileCache[file].length.toLocaleString());
	$('#popup .button').html('<button class="btnSave">SAVING</button>');
	$('.btnSave').attr("disabled", "disabled");
	$('.btnSave').css("color", "#999");
	popupShow();
}

////////////////////////////////
function popupUpload() {
	popupClose();
	$('#popup .title').html('<span>🆙</span>OPERATION');
	$('#popup .message').html('FILE TO UPLOAD:<br /><input type="file" name="fileUpload" id="fileUpload" value="asfasfasd" />');
	$('#popup .button').html('<button class="btnUpload">UPLOAD</button>');
	$('.btnUpload').click(function(e) {
		var objFile = $('#fileUpload').prop('files')[0];
		if (!objFile || !window.FileReader) {
			return;
		}
		var fr = new FileReader();
		fr.onload = function() {
			fileCache[objFile.name] = this.result;
			savingList = [objFile.name];
			fileSave(0);
		};
		fr.readAsBinaryString(objFile);
	});	
	popupShow();
}

////////////////////////////////
function popupConfirm(file) {
	popupClose();
	$('#popup .title').html('<span>📝</span>CONFIRM');
	$('#popup .message').html('FILE: '+file+'<br />THE FILE HAS BEEN CHANGED');
	$('#popup .button').html('<button class="red btnDiscard">DISCARD</button> <button class="btnSave">SAVE</button>');
	$('.btnDiscard').click(function(e) {
		if ($(this).siblings('.btnSave').length>0) {
			$(this).siblings('.btnSave').remove();
			$(this).html('CONFIRM TO DISCARD');
			return;
		}
		tabClose(file);
		popupClose();
	});
	$('.btnSave').click(function(e) {
		fileCache[file] = editor.getCode();
		savingList = [file];
		fileSave(0, true);
	});
	popupShow();
}

////////////////////////////////
function popupFile(file) {
	popupClose();
	file = file.split('#');
	$('#popup .title').html('<span>📝</span>OPERATION');
	$('#popup .message').html('FILE: '+file[0]+'<br />'+'SIZE: '+parseInt(file[1]).toLocaleString());
	$('#popup .button').html('<button class="red btnRemove">REMOVE</button> <button class="btnRename">RENAME</button> <button class="btnEdit">EDIT</button>');
	$('.btnRemove').click(function(e) {
		if ($(this).siblings('.btnEdit').length>0) {
			$(this).siblings('.btnEdit').remove();
			$(this).siblings('.btnRename').remove();
			$(this).html('CONFIRM TO REMOVE');
			return;
		}
		$('#popup .close').hide();
		$(this).html('REMOVING');
		$(this).attr("disabled", "disabled");
		$(this).css("color", "#999");
		$.ajax({
			url: 'file/{"type":"remove","file":"'+file[0]+'"}',
			dataType: 'json',
			error: function(x,e){
				popupNotice('🚫', 'OPERATION FAILED');
				nodeFile();
			},
			success: function(r,s){
				if (!r.file) {
					popupNotice('🚫', 'OPERATION FAILED');
				} else {
					tabClose(file[0]);
					popupNotice('✅', 'OPERATION SUCCESSFUL');
					setTimeout('popupClose();', 1000);
				}
				nodeFile();
			}
		});
	});
	$('.btnEdit').click(function(e) {
		if (fileCache[file[0]]) {
			fileApply(file[0]);
			popupClose();
			return;
		}
		$('#popup .close').hide();
		$(this).siblings('.btnRemove').remove();
		$(this).siblings('.btnRename').remove();
		$(this).html('READING');
		$(this).attr("disabled", "disabled");
		$(this).css("color", "#999");
		$.ajax({
			url: file[0],
			dataType: 'text',
			cache: false,
			xhrFields: {
				onprogress: function(e){
					if (e.loaded) {
						$('.btnEdit').html('READING '+parseFloat(e.loaded/file[1]*100).toFixed(1)+'%');
					}
				},
			},
			error: function(x,e){
				popupNotice('🚫', 'OPERATION FAILED');
				nodeFile();
			},
			success: function(r,s){
				fileCache[file[0]] = r;
				fileApply(file[0]);
				popupClose();
			}
		});
	});
	$('.btnRename').click(function(e) {
		if ($(this).siblings('.btnEdit').length>0) {
			$(this).siblings('.btnEdit').remove();
			$(this).siblings('.btnRemove').remove();
			$('#popup .title').html('<span>📑</span>OPERATION');
			$('#popup .message').html('FILE NAME: '+file[0]+'<br />'+'NEW NAME: <input type="text" class="txtRename" value="" />');
			return;
		}
		var rename = $('.txtRename').val().replace(/\"/g,'');
		if (!rename) {
			return;
		}
		$('#popup .close').hide();
		$(this).html('RENAMING');
		$(this).attr("disabled", "disabled");
		$(this).css("color", "#999");
		$.ajax({
			url: 'file/{"type":"rename","file":"'+file[0]+'","rename":"'+rename+'"}',
			dataType: 'json',
			error: function(x,e){
				popupNotice('🚫', 'OPERATION FAILED');
				nodeFile();
			},
			success: function(r,s){
				if (!r.file) {
					popupNotice('🚫', 'OPERATION FAILED');
				} else {
					tabClose(file[0]);
					popupNotice('✅', 'OPERATION SUCCESSFUL');
					setTimeout('popupClose();', 1000);
				}
				nodeFile();
			}
		});
	});
	popupShow();
}

////////////////////////////////
function fileApply(file) {
	if (!file) {
		fileCurrent = '';
		$('#codeArea').text('');
		editor.setCode('');
	}
	if (file==fileCurrent) {
		return;
	}
	if (typeof(fileCache[file])!='string') {
		popupNotice('🚫', 'OPERATION FAILED');
		return;
	}
	if (fileCurrent) {
		fileCache[fileCurrent] = editor.getCode();
	}
	fileCurrent = '';
	tabApply(file);
	$('#codeArea').text(fileCache[file]);
	editor.setCode(fileCache[file]);
	fileCurrent = file;
}

////////////////////////////////
function fileSave(pos, tab) {
	if (!savingList.length) {
		nodeFile();
		setTimeout('popupClose();', 500);
		return;
	}
	var file = savingList[0];
	var size = fileCache[file].length;
	var sizeSend = 960;
	if (pos==0) {
		popupSaving(file);
	} else {
		$('.btnSave').html('SAVING '+parseFloat(pos/size*100).toFixed(1)+'%');
	}
	if (!wsInstance || wsInstance.readyState!=1) {
		savingList = [];
		popupNotice('🚫', 'OPERATION FAILED');
		return;
	}
	if (size-pos<sizeSend) {
		sizeSend = size - pos;
	}
	if (sizeSend<=0) {
		if (tab) {
			tabClose(file);
			tab = false;
		}
		fileChange[file] = false;
		$(".codeBar div[name='"+file+"'] .change").remove();
		savingList.shift();
		fileSave(0, tab);
		return;
	}
	var dataSend = fileCache[file].substring(pos,pos+sizeSend);
	var json = JSON.stringify({
		'type': 'save',
		'file': file,
		'size': size,
		'pos': pos,
		'tab': tab,
	});
	dataSend = 'file/'+json.length+'/'+json+btoa(dataSend);
	wsInstance.send(dataSend);
}

////////////////////////////////
function tabClose(file) {
	if (file==fileCurrent) {
		if ($(".codeBar div[name='"+file+"']").next().length) {
			fileApply($(".codeBar div[name='"+file+"']").next().attr('name'));
		} else if ($(".codeBar div[name='"+file+"']").prev().length) {
			fileApply($(".codeBar div[name='"+file+"']").prev().attr('name'));
		} else {
			fileApply('');
		}
	}
	$(".codeBar div[name='"+file+"']").remove();
	codeBarCheckPos();
	fileChange[file] = false;
	delete(fileCache[file]);
}

////////////////////////////////
function consoleOutput(message, style) {
	if (style=='c') {
		commandList.unshift(message);
		message = '&gt; ' + message;
	}
	$('.console .output').append('<span class="'+style+'">'+message.replace('\n','<br />')+'<br /></span>');
	$('.console .output').scrollTop($('.console .output')[0].scrollHeight);
}

////////////////////////////////
function tabApply(file) {
	if (!$(".codeBar div[name='"+file+"']").length) {
		$('.codeBar').append('<div class="nowrap" name="'+file+'"><span class="close" title="CLOSE FILE">✖</span><span class="ico">📄</span><span class="file">'+file+'</span></div>');
		$(".codeBar div[name='"+file+"']").click(function(e) {
			fileApply($(this).attr('name'));
		});
		$(".codeBar div[name='"+file+"'] .close").click(function(e) {
			if (fileChange[file]) {
				fileApply(file);
				popupConfirm(file);
				return;
			}
			tabClose(file);
		});
		$('.codeBar').css('margin-left', '-10000px');
		codeBarCheckPos();
	}
	$('.codeBar div').removeClass('current');
	$(".codeBar div[name='"+file+"']").addClass('current');
}

////////////////////////////////
function nodeInfo() {
	setTimeout('nodeInfo();', 5000);
	if (!wsInstance || wsInstance.readyState!=1) {
		return false;
	}
	wsInstance.send('system/15/{"type":"info"}');
	return true;
}

////////////////////////////////
function nodeFile() {
	$('.list').html('');
	$.ajax({
		url: 'system/{"type":"file"}',
		dataType: 'json',
		error: function(x,e){
			setTimeout('nodeFile();', 5000);
		},
		success: function(r,s){
			if (r.file) {
				var prefixList = [];
				var fileList = {};
				for (file in r.file) {
					prefix = file.split('_');
					if (prefix.length==1) {
						prefix = file.split('.');
					}
					prefix = prefix[0];
					if (-1==$.inArray(prefix,prefixList)) {
						prefixList.push(prefix);
						fileList[prefix] = [];
					}
					fileList[prefix].push(file);
				}
				prefixList.sort();
				var fileHTML = '';
				for (i in prefixList) {
					prefix = prefixList[i];
					fileHTML += '<div class="prefix nowrap">'+prefix+'</div><div class="file nowrap">';
					fileList[prefix].sort();
					for (j in fileList[prefix]) {
						file = fileList[prefix][j];
						size = r.file[file];
						if (-1!=file.indexOf('_')) {
							file = file.substr(prefix.length);
						}
						var fileName = prefix + file;
						if (file.charAt(0)!='_') {
							fileName = file;
						}
						fileHTML += '<p name="'+fileName+'#'+size+'">'+file+' <span>'+size.toLocaleString()+'</span></p>';
					}
					fileHTML += '</div>';
				}
				$('.list').html(fileHTML);
				$('.file p').click(function(e) {
					popupFile($(this).attr('name'));
				});
			}
		}
	});
}
