async function openFaceplate() {
	/*SettingsFromVisualisierung*/
	//handle for button click and clickable item, same philosophy as bitmap change of non linked element above
	//console.log(ClickableElementList);
	
	matchItem = ClickableElementList.find(el => {
		const {x, y, radius, bitmapIndex} = el;
		dx = mx - x;
		dy = my - y;
		return (bitmapIndex === bmpIndex && dx * dx + dy * dy < radius * radius);
	});
	console.log(matchItem);
	
	if (matchItem) {
		showElemementById('fpBg');
		hideElemementById('fpContent');
		showElemementById('visLoader');
		clickableElementUrl = ClickableElementUrlList.find(el => el.includes(matchItem.id));
		const test = await fetchData(clickableElementUrl);
		const adjustmentOptions  = await asyncSleep(fetchData, 800, readParameterOfClickableElementUrl);
		//console.log(adjustmentOptions.v070.slice(0,5), clickableElementUrl.slice(-5))
		if (adjustmentOptions.v070.slice(0,5) === clickableElementUrl.slice(-5)) {
			Object.entries(adjustmentOptions).forEach(([key, value]) => {
				const originalKeyNo = parseInt(key.match(/\d+/g));
				let item = {};
				item.idx = key.replace(originalKeyNo, originalKeyNo + 20);
				item.sectionIndicator = value.substr(59, 1);
				
				switch (item.sectionIndicator) {
					case 'H':
						item.name = value.substr(0, 24);
						item.wert = value.substr(24,35)
						break;
					case 'S':
						item.name = value.substr(0, 59);
						break;
					default:
						item.name = value.substr(0, 24);
						item.wert = value.substr(24,12);
						item.oberGrenze = value.substr(36,6);
						item.unterGrenze = value.substr(42,6);
						item.nachKommaStellen = value.substr(48,2);
						item.einheit = value.substr(50,9);
				}

				ClickableElement.push(item);
			});
			buildFaceplateNEW();
			showFaceplate(matchItem);
		}
		else {
			alert(`timeout`);
			hideElemementById('fpBg');
			hideElemementById('visLoader');
		}
	}
}

function convertHexToRGBArray(hex) {
	if (hex == undefined) return hex;
	if (hex.startsWith('#')) hex = hex.slice(1);
	if (hex.length == 3) {
		var rgb = [	parseInt(hex[0] + hex[0], 16),
					parseInt(hex[1] + hex[1], 16),
					parseInt(hex[2] + hex[2], 16)
				  ];		
	}
	if (hex.length == 6) {
		var rgb = [	parseInt(hex[0] + hex[1], 16),
					parseInt(hex[2] + hex[3], 16),
					parseInt(hex[4] + hex[5], 16)
				  ];		
	}
	return rgb;
}

function convertRGBArrayToHex(rgb) {
	if (!Array.isArray(rgb)) return undefined;
	if (rgb.length != 3) return undefined;
	
	var hex = '#';
	rgb.forEach(function (el) {
		(Math.abs(el) < 256) ? hex += Math.round(el).toString(16).toUpperCase().padStart(2, '0') : hex += '00';
		//console.log(hex);	
	});
	return hex;
}

function calcColor(percentVal, minColorHex, maxColorHex) {
	//console.log(percentVal, minColorHex, maxColorHex);
	if (percentVal == undefined) return percentVal;
	if (percentVal < 0) percentVal = 0;
	if (percentVal > 100) percentVal = 100;
	if (minColorHex == undefined) minColorHex = '#1F94B9';
	if (maxColorHex == undefined) maxColorHex = '#C31D64';
	
	var minColorRGB = convertHexToRGBArray(minColorHex);
	var maxColorRGB = convertHexToRGBArray(maxColorHex);
	var retColorRGB = [	Math.round(percentVal/100 * (maxColorRGB[0] - minColorRGB[0]) + minColorRGB[0]),
						Math.round(percentVal/100 * (maxColorRGB[1] - minColorRGB[1]) + minColorRGB[1]),
						Math.round(percentVal/100 * (maxColorRGB[2] - minColorRGB[2]) + minColorRGB[2])
					  ];
	//console.log(retColorRGB);
	var retColorHex = convertRGBArrayToHex(retColorRGB);
	//console.log(retColorHex);
	return retColorHex;
}


function sliderStyling(event) {
	if (event == null || event == undefined) return event;
	//console.log(event);
	var slider = event.target;
	var percentVal = (slider.value-slider.min)/(slider.max-slider.min)*100;
	var minColor, currentColor;
	//console.log(slider);
	if (slider.disabled) {
		minColor = '#C0C0C0';
		currentColor = minColor;
	}
	else {
		minColor = slider.minColor;
		currentColor = calcColor(percentVal, slider.minColor, slider.maxColor);
		
		if (slider.maxColor == '#C31D64') {
			slider.classList.remove('quarter');
			slider.classList.remove('half');
			slider.classList.remove('threequarter');
			slider.classList.remove('full');
			if (percentVal > 80) {
				slider.classList.add('full');
			} else if (percentVal > 60) {
				slider.classList.add('threequarter');
			} else if (percentVal > 40) {
				slider.classList.add('half');
			} else if (percentVal > 20) {
				slider.classList.add('quarter');
			}
		}		
	}
	
	//console.log(currentColor);
	slider.style.background = 'linear-gradient(to right, ' + minColor + ' 0%, ' + currentColor + ' ' + percentVal + '%, #E0E0E0 ' + percentVal + '%, #E0E0E0 100%)';
	
	//convertHexToRGBArray('#1F94B9');
	//calcColor(100);
}



function sliderHandler(event) {	//sliderHandler
	if (event == null || event == undefined) return event;
	
	sliderStyling(event);
	var slider;
	(typeof event) == 'string' ? slider = document.getElementById(event) : slider = event.target;
	if (slider == null || slider == undefined) return slider;
	
	var divRtosVar = document.getElementById('v' + slider.idx.toString().padStart(3,'0'));
	var btnHand = document.getElementById('btnHand' + slider.idx);
	
	//Due to wrapping the slider in a container-div (.divInpWert), the aimed target (.lblUnit) is
	//actually the parentsNextSibling...
	var parentsNextSibling = slider.parentElement.nextElementSibling;
	//return parentsNextSibling if null || undefined
	if (parentsNextSibling == null || parentsNextSibling == undefined) return parentsNextSibling;
	
	if (slider.unit != parentsNextSibling.unit) console.log('updateNextSiblingOfSlider: Diskrepanz "unit"');
	if (slider.unit != parentsNextSibling.unit) return null;
	//console.log(slider, parentsNextSibling);
	
	if (slider.max - slider.min == 101 && slider.value <= 0) slider.value = -1;
	slider.wert = slider.value;
	divRtosVar.wert = slider.wert;
	if (btnHand != null) btnHand.wert = slider.wert;
	parentsNextSibling.wert = slider.wert;
	parentsNextSibling.value = slider.value;
	
	//slider.min <= 0 
	(slider.max - slider.min == 101 && slider.value <= 0) ?  parentsNextSibling.innerHTML = 'Zu' : parentsNextSibling.innerHTML = parentsNextSibling.value + ' ' + parentsNextSibling.unit;
	
	return parentsNextSibling;
}

function decrementSliderValue(event) {
	if (event == null || event == undefined) return event;
	
	var slider = event.target.nextElementSibling;
	//console.log(slider);
	slider.value -= slider.step;
	var pseudoEvent = {};
	pseudoEvent.target = slider;
	sliderHandler(pseudoEvent);	
}

function incrementSliderValue(event) {
	if (event == null || event == undefined) return event;
	
	//console.log(event.target);
	var slider = event.target.previousElementSibling;
	slider.value = parseFloat(slider.value) + parseFloat(slider.step);
	//Sonderfall Analogmischer
	if (slider.unit == '%' && slider.value == 0) slider.value = parseFloat(slider.value) + parseFloat(slider.step);
	//console.log(slider.value);
	var pseudoEvent = {};
	pseudoEvent.target = slider;
	sliderHandler(pseudoEvent);
}

function radioBtnByNameNEW(event) {
	if (event == null || event == undefined) return event;
	
	var btn;
	(typeof event) == 'string' ? btn = document.getElementById(event) : btn = event.target;
	if (btn == null || btn == undefined) return btn;
		
	var divRtosVar = document.getElementById('v' + btn.idx.toString().padStart(3,'0'));
	if (btn.wert.toString() == '') {
		var slider = document.getElementById('inpWert' + btn.idx);
		btn.wert = slider.wert;
	}
	divRtosVar.wert = btn.wert;
		
	//var changedBtns = [];
	var relatedBtns = document.getElementsByName(btn.name);
	relatedBtns.forEach(function(el) {
		//console.log(el);
		if (el.id == btn.id) {
			if (!el.className.includes('checked')) {
				//changedBtns.push(el);
				el.className += " checked";
			}
			else {
				if (el.className.includes('uncheckable')) el.className = el.className.replace("checked", "").trim();				
			}
		}
		else {
			//if (el.className.includes('checked')) changedBtns.push(el);
			el.className = el.className.replace("checked", "").trim();
		}
	});
	
	return btn; //return event;? return changedBtns;???
}

function toggleSliderAbilityByBtnHandNEW(event) {
	var btn = event.target;
	if (btn == null || btn == undefined) return event;
	
	var enabled = btn.className.toUpperCase().includes('HAND');

	btn.parentElement.childNodes.forEach(function(el) {
		if (el.type == 'range') {
			el.disabled = !enabled;
			//console.log(el.className);
			(enabled) ? el.classList.remove('disabled') : el.classList.add('disabled');
			//console.log(el.className);
			var pseudoEvent = {};
			pseudoEvent.target = el;
			sliderStyling(pseudoEvent);
		}
		if (el.className.includes('btnIncDec')) el.disabled = !enabled;
	});	
	
}



function updateLblUnit(event) {
	var btn = event.target;
	if (btn == null || btn == undefined) return event;
	
	var lbl = btn.parentElement.nextElementSibling;
	if (lbl == null || lbl == undefined) return event;
	
	if (btn.title.toUpperCase().includes('HAND')) {
		(lbl.value <= 0) ?  lbl.innerHTML = 'Zu' : lbl.innerHTML = lbl.value + ' ' + lbl.unit;
	}
	else {
		lbl.innerHTML = btn.title;
	}
}

function controlGroupBtnHandlerNEW(event) {
	if (event == null || event == undefined) return event;
	//console.log(event);
	var btn;
	(typeof event) == 'string' ? btn = document.getElementById(event) : btn = event.target;
	
	var returnedBtn = radioBtnByNameNEW(event); //returned event??!
	if (btn != returnedBtn) console.log('fpBtnHandler: btn != returnedBtn');
	if (btn != returnedBtn) return btn; //return event;???	
	//if (btn.className.includes('Hand')) disableSliderNEW();
	toggleSliderAbilityByBtnHandNEW(event);
	updateLblUnit(event);
	//console.log(btn);
}

function createControlGroup(fpSection, el) {
	//div mit ID=rtosVariable erzeugen & anhängen (return object)
	var divRtosVar = document.createElement('div');
	fpSection.appendChild(divRtosVar);
	divRtosVar.id = 'v' + el.idx.toString().padStart(3,'0');
	divRtosVar.className = 'divRtosVar';
	divRtosVar.idx = el.idx;
	
	//Namenslabel erzeugen & anhängen
	var lblName = document.createElement('label');				
	divRtosVar.appendChild(lblName);
	lblName.className = 'lblName';
	lblName.innerHTML = el.name.trim();
	
	//Inputelemente (btns, slider, number, etc.) erzeugen & anhängen
	var divInpWert = document.createElement('div');
	divRtosVar.appendChild(divInpWert);
	divInpWert.className = 'divInpWert';
	divInpWert.id = divInpWert.className + el.idx;
	divInpWert.idx = el.idx;
	
	//zu erzeugende Elemente auf Basis der Range ermitteln:
	var range = (parseFloat(el.oberGrenze.trim()) - parseFloat(el.unterGrenze.trim()) + 1) * Math.pow(10, el.nachKommaStellen);
	
	//Zeilenumbruch vor lblName anfügen, um Textausrichtung mittig zu Btns (außer Kalender) zu setzen
	if (range <= 4 && !lblName.innerHTML.includes('kalender')) lblName.innerHTML = '\n' + lblName.innerHTML;
	
	//-Button vor Slider erzeugen
	if (range > 4) {
		var btnIncDec = document.createElement('input');
		divInpWert.appendChild(btnIncDec);
		btnIncDec.type = 'button';
		btnIncDec.className = 'btnIncDec btnDec';
		var btnVal = Math.pow(10, -el.nachKommaStellen);
		if (btnVal < 1) btnVal = btnVal.toString().slice(1);
		btnIncDec.value = '-';// + btnVal;
		btnIncDec.onclick = decrementSliderValue;
	}
	
	var inpWert = document.createElement('input');				
	divInpWert.appendChild(inpWert);
	inpWert.className = 'inpWert';
	inpWert.id = inpWert.className + el.idx;
	inpWert.idx = el.idx;
	inpWert.unit = el.einheit.trim();
	//if (inpWert.unit.includes('&deg') || el.name.includes('Betriebsart')) inpWert.className += ' gradientSlider';
	inpWert.unterGrenze = parseFloat(el.unterGrenze.trim());
	inpWert.oberGrenze = parseFloat(el.oberGrenze.trim());
	inpWert.min = inpWert.unterGrenze;
	inpWert.minColor = '#1F94B9';
	inpWert.max = inpWert.oberGrenze;
	if (inpWert.unit.includes('&deg') || lblName.innerHTML.includes('Kessel') || lblName.innerHTML.includes('BHKW')) {
		inpWert.maxColor = '#C31D64';
	}
	else {
		inpWert.maxColor = '#1F94B9';
	}
	inpWert.step = Math.pow(10, -el.nachKommaStellen);
	inpWert.wert = parseFloat(el.wert);
	
	//+Button hinter Slider erzeugen
	if (range > 4) {
		var btnIncDec = document.createElement('input');
		divInpWert.appendChild(btnIncDec);
		btnIncDec.type = 'button';
		btnIncDec.className = 'btnIncDec btnInc';
		var btnVal = Math.pow(10, -el.nachKommaStellen);
		if (btnVal < 1) btnVal = btnVal.toString().slice(1);
		btnIncDec.value = '+';// + btnVal;
		btnIncDec.onclick = incrementSliderValue;
	}
	
	/*if (range > 4) {
		for (var i=0; i<2; i++) {
			var btnIncDec = document.createElement('input');
			divInpWert.appendChild(btnIncDec);
			btnIncDec.type = 'button';
			btnIncDec.className = 'btnIncDec';
			(i == 0) ? btnIncDec.value = '-' : btnIncDec.value = '+';
			btnIncDec.value += Math.pow(10, -el.nachKommaStellen);
		}
	}*/
	
	//console.log(range);
	var checkedBtn;
	switch (range) {
			
			//createTriggerBtn (Einmalig...); radioBtnByNameNEW
			case 2:
				inpWert.type = 'button';
				inpWert.id = 'triggerBtn';
				inpWert.className += ' btnBA';
				inpWert.className += ' uncheckable';
				inpWert.name = 'triggerBtn';
				inpWert.wert = 1;
				inpWert.title = el.name.trim();
				inpWert.onclick = radioBtnByNameNEW;
				if (el.name.toUpperCase().includes('AUS')) {
					inpWert.id += 'Aus';
					inpWert.className += ' btnAus';
				}
				else if (el.name.toUpperCase().includes('EIN')) {
					inpWert.id += 'Ein';
					inpWert.className += ' btnEin';
				}
				if (el.wert == inpWert.wert) checkedBtn = inpWert;
				break;
			
			//createBtnCalender || createBtnGroup
			case 3:
				if (parseFloat(el.unterGrenze.trim()) == 0) {
					inpWert.type = 'button';
					inpWert.id = 'calenderBtn';
					inpWert.className += ' calenderBtn';
					locked ? inpWert.wert = 2 : inpWert.wert = 1;
					inpWert.value = 'zum Kalender';
					inpWert.title = 'Absenkungswochenkalender öffnen';
					if (inpWert.wert == 2) inpWert.title += ' (schreibgeschützt)';
					inpWert.onclick = jumpToWochenKalender;
				}
				
				if (parseFloat(el.unterGrenze.trim()) == -1) {
					for (var i=0; i<3; i++) {
						if (i > 0) {
							var inpWert = document.createElement('input');				
							divInpWert.appendChild(inpWert);
							inpWert.className = 'inpWert';
							inpWert.idx = el.idx;
						}
						
						var id;
						if (i == 0) id = 'Auto';
						if (i == 1) id = 'Ein';
						if (i == 2) id = 'Aus';
						
						inpWert.type = 'button';
						inpWert.title = id;
						inpWert.id = 'btn' + id + el.idx;	//el.idx nutzen um eindeutige IDs zu erzeugen
						inpWert.className += ' btnBA';
						inpWert.className += (' btn' + id);
						inpWert.name = 'btnBA' + el.idx;	//el.idx nutzen um eindeutige RadioGroups zu erzeugen
						(i == 2) ? inpWert.wert = -1 : inpWert.wert = i;
						inpWert.onclick = radioBtnByNameNEW;
						if (el.wert == inpWert.wert) checkedBtn = inpWert;
					}					
				}
				break;
			
			//createBtnGroup3PMischer (Auto, HandOpen, HandClose, Stop)
			case 4:
				for (var i=0; i<4; i++) {
					if (i > 0) {
						var inpWert = document.createElement('input');				
						divInpWert.appendChild(inpWert);
						inpWert.className = 'inpWert';
						inpWert.idx = el.idx;
					}
					
					var id;
					if (i == 0) id = 'Auto';
					if (i == 1) id = 'Auf';
					if (i == 2) id = 'Zu';
					if (i == 3) id = 'Stopp';
					
					inpWert.type = 'button';
					inpWert.title = id;
					inpWert.id = 'btn' + id + el.idx;	//el.idx nutzen um eindeutige IDs zu erzeugen
					inpWert.className += ' btnBA';
					inpWert.className += (' btn' + id);
					inpWert.name = 'btnValve' + el.idx;	//el.idx nutzen um eindeutige RadioGroups zu erzeugen
					(i == 3) ? inpWert.wert = -1 : inpWert.wert = i;
					inpWert.onclick = radioBtnByNameNEW;
					if (el.wert == inpWert.wert) checkedBtn = inpWert;
				}
				break;
				
			//createSliderBtnCombo (Auto, Hand/(HandOn, HandOff))
			case 101: //Kesselpumpe: (hat kein 'Aus' [-1]!; min = 1 statt 2)
				inpWert.min = 1;
			case 102:
				lblName.innerHTML = 'Handwert\n\n' + lblName.innerHTML;
								
				var iterations = range - 100 + 1;
				/*console.log(el.name.toUpperCase().includes('MISCHER'));*/
				if (el.name.toUpperCase().includes('MISCHER') || el.name.toUpperCase().includes('VENTIL'))
					iterations = 1;//*/			//SONDERFALL MISCHER!
				
				for (var i=0; i<=iterations; i++) {
					var inpBtn = document.createElement('input');				
					divInpWert.appendChild(inpBtn);
					inpBtn.className = 'inpWert';
					inpBtn.idx = el.idx;
					
					var id;
					if (i == 0) {
						id = 'Auto';
						inpBtn.wert = 0;
					}
					if (i == 1) {
						id = 'Hand';
						inpBtn.wert = '';
					}
					if (i == 2) {
						id = 'Ein';
						inpBtn.wert = 1;
					}
					if (i == 3) {
						id = 'Aus';
						inpBtn.wert = -1;
						inpWert.min = 2;
					}
					
					inpBtn.type = 'button';
					(id == 'Ein') ? inpBtn.title = id + ' (Sollw. intern)' : inpBtn.title = id;
					inpBtn.id = 'btn' + id + el.idx;//el.idx nutzen um eindeutige IDs zu erzeugen
					inpBtn.className += ' btnBA';
					inpBtn.className += (' btn' + id);
					inpBtn.name = 'btnBA' + el.idx;	//el.idx nutzen um eindeutige RadioGroups zu erzeugen
					//console.log(el.idx);
					//(i == 3) ? inpBtn.value = -1 : inpBtn.value = i/2;
					inpBtn.onclick = controlGroupBtnHandlerNEW;
					if (el.wert == inpBtn.wert) checkedBtn = inpBtn;
					//console.log(checkedBtn);
				}
				if (checkedBtn == undefined || checkedBtn == null) checkedBtn = document.getElementById('btnHand' + el.idx);
				//hier KEIN break um zusätzlichen slider zu erzeugen!
				//break;
			//createSlider/Number?
			default:
				inpWert.type = 'range';

				inpWert.value = inpWert.wert;
				if (parseFloat(inpWert.value) < parseFloat(inpWert.min)) inpWert.value = inpWert.min;
				if (parseFloat(inpWert.value) > parseFloat(inpWert.max)) inpWert.value = inpWert.max;
				inpWert.wert = inpWert.value;
				
				if (inpWert.type == 'number' || inpWert.type == 'text') inpWert.onclick = showOSK; //OSK für 'text' & 'number' bei Eingabe einblenden
				if (inpWert.type == 'range') inpWert.oninput = sliderHandler;
	}	
	
	//Unit-Label erzeugen & anhängen
	var lblUnit = document.createElement('label');				
	divRtosVar.appendChild(lblUnit);
	lblUnit.className = 'lblUnit';
	lblUnit.idx = el.idx;
	lblUnit.value = inpWert.value;//parseFloat(el.wert);
	lblUnit.unit = el.einheit.trim();
	if (lblUnit.unit != '' && lblUnit.unit != '3P') lblUnit.innerHTML = inpWert.value + ' ' + inpWert.unit;
	if (lblUnit.innerHTML.includes('undefined')) lblUnit.innerHTML = "";
	
	//pseudoEvents ausführen um aktuellen Zustand zu Initiieren
	var pseudoEvent = {};
	if (inpWert.type == 'range') {
		pseudoEvent.target = inpWert;
		sliderHandler(pseudoEvent);
	}
	
	if (checkedBtn != null && checkedBtn != undefined) {
		pseudoEvent.target = checkedBtn;
		(range > 4) ? controlGroupBtnHandlerNEW(pseudoEvent) : radioBtnByNameNEW(pseudoEvent);
	}
	//return divRtosVar;
}

function buildFaceplateNEW() {
	//Allgemeines
	//var fpBg = document.getElementById('fpBg');
	//var fpBezeichnung;
	//var fpID;
	//var fpTyp;
	
	const h4fpHeader = document.getElementById('h4FpHeader');
	
	const fpBody = document.getElementById('fpBody');
	let fpSection;
	
	ClickableElement.forEach(function(el) {
		//console.log(el);
/**/	//if (el.name.trim() == 'Betriebsart') el.name = ('Kessel ' + el.name.trim()).padEnd(24);
		
		if (el.sectionIndicator.toUpperCase() == 'H') h4fpHeader.innerHTML = 'Einstellungen für ' + el.wert.trim();
		
		let zwischenüberschrift;
		if (el.name.includes('Betriebsart') || el.name.includes('Wochenkalender')) zwischenüberschrift = el.name.trim();
		if (el.name.includes('NennVL')) zwischenüberschrift = 'HK-Temperaturparameter';
		if (el.name.includes('20 &degC')) zwischenüberschrift = 'Pumpenkennlinie\n(nach Außentemperatur)';
		if (el.sectionIndicator.toUpperCase() == 'S') zwischenüberschrift = el.name;
		
		if (zwischenüberschrift != undefined || fpSection == undefined) {
			//Beginn neue Section
			//neue Section erzeugen & anhängen
			fpSection = document.createElement('div');
			fpBody.appendChild(fpSection);
			fpSection.className = 'fpSection';
			
			//Zwischenüberschrift erzeugen & anhängen
			let h5fpSection = document.createElement('h5');
			fpSection.appendChild(h5fpSection)
			if (zwischenüberschrift != undefined) h5fpSection.innerHTML = zwischenüberschrift;
		}
		
		//FP-Zeile erzeugen
		if (el.sectionIndicator.toUpperCase() != 'H' && el.wert.trim() != '') createControlGroup(fpSection, el);
		
		/*
		switch (el.sectionIndicator.toUpperCase()) {
			//FP-Header (1.Zeile)
			case 'H':
				fpBezeichnung = el.wert.trim();
				h4fpHeader.innerHTML = 'Einstellungen für ' + fpBezeichnung;
				break;
				
			//FP-Body
			case 'S':
				//Beginn neue Section
				//neue Section erzeugen & anhängen
				fpSection = document.createElement('div');
				fpBody.appendChild(fpSection);
				fpSection.className = 'fpSection';
				
				//Zwischenüberschrift erzeugen & anhängen
				var h5fpSection = document.createElement('h5');
				fpSection.appendChild(h5fpSection)
				h5fpSection.innerHTML = el.name;
				
				break;
			//Letzte Zeile
			case 'X':
			case ' ':
				if (fpSection == undefined) {
					//neue Section erzeugen & anhängen
					fpSection = document.createElement('div');
					fpBody.appendChild(fpSection);
					fpSection.className = 'fpSection';
				}
				//normale FP-Erzeugung
				if (el.wert.trim() != '') createControlGroup(fpSection, el);
				break;
			default:
				//keine besondere Behandlung
				alert('Fehler FP-Datenübertragung');
		}*/
	});	
}

function jumpToWochenKalender(event){
	//1.Deaktivieren Autoreload Funktion beim Fernbedienung ? (überlegung)
	clearInterval(fernbedienungAutoReload);
	//2.Der Wert 'HK Wochenkalender' wird auf 1 geändert und zurückübertragen (gesamte 20 Zeile)
	//Pearl-seitig wird das HK-Wochenkalender aufm Canvas gerendert.
	//var sendError = sendValueFromVisuToRtos('openHKWochenKalender');
	var sendError = sendDataToRtosNEW(event);
	if (!sendError) {
		showWochenKalenderVisu();
		activeTabID = 'wochenKalenderImVisu';
		wochenKalenderImVisuAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50,wochenKalenderImVisuCanvasContext, wochenKalenderImVisuCanvas);
	}
}


function closeModalWochenKalenderImVisu(){
	hideElemementById('wochenKalenderImVisu');
	sendData(clickableElementUrl);
}



function showWochenKalenderVisu() {
	var faceplate = document.getElementById('fpContent');
	var wochenKalenderImVisu = document.getElementById('wochenKalenderImVisu');
	var wochenKalenderImVisuContent = $('#wochenKalenderImVisuContent');
	
	var kalenderHeader = document.getElementById('txtWochenKalenderImVisuHeader');
	var faceplateHeader = document.getElementById('h4FpHeader');
	kalenderHeader.textContent = faceplateHeader.textContent.replace('Einstellungen', 'Wochenkalender');
	//console.log(wochenKalenderImVisu);
	wochenKalenderImVisu.style.display = "block";
	//console.log(wochenKalenderImVisuContent.width());
	
	var kalenderLeft = faceplate.offsetLeft + faceplate.clientWidth - wochenKalenderImVisuContent.width();
	if (kalenderLeft < 10) kalenderLeft = 10;
	
	wochenKalenderImVisuContent.css('left', kalenderLeft);
	wochenKalenderImVisuContent.css('top', faceplate.offsetTop);
	hideElemementById('osk');	//osk ausblenden wenn Kalender geöffnet wird
}

