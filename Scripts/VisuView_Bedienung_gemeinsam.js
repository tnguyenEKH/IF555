function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
async function asyncSleep(fn, delay, ...args) {
    await timeout(delay);
    return fn(...args);
}

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
	//console.log(matchItem);
	
	if (matchItem) {
		const body = document.querySelector(`body`);
		body.setAttribute(`cursorStyle`, `progress`);
		showElemementById('fpBg');
		hideElemementById('fpContent');
		//showElemementById('visLoader');
		clickableElementUrl = ClickableElementUrlList.find(el => el.includes(matchItem.id));
		try {
			const test = await fetchData(clickableElementUrl);
			const adjustmentOptions  = await asyncSleep(fetchData, 800, readParameterOfClickableElementUrl);
			//console.log(adjustmentOptions.v070.slice(0,5), clickableElementUrl.slice(-5))
			if (adjustmentOptions.v070.slice(0,5) === clickableElementUrl.slice(-5)) {
				ClickableElement = [];
				Object.entries(adjustmentOptions).forEach(([key, value]) => {
					const originalKeyNo = parseInt(key.match(/\d+/g));
					let item = {};
					item.idx = originalKeyNo + 20;
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
			body.removeAttribute(`cursorStyle`);
		}
		catch(err) {
			console.error(err);
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


function sliderStyling(target) {
	const {value, min, max, disabled, minColor, maxColor, classList} = target;
	const percentVal = (value - min) / (max - min) * 100;
	const _minColor = (disabled) ? '#C0C0C0' : minColor;
	const currentColor = (disabled) ? '#C0C0C0' : calcColor(percentVal, minColor, maxColor);
	//console.log(target);
	if (!disabled) {
		if (maxColor == '#C31D64') {
			classList.remove('quarter', 'half', 'threequarter', 'full');
			if (percentVal > 80) {
				classList.add('full');
			} else if (percentVal > 60) {
				classList.add('threequarter');
			} else if (percentVal > 40) {
				classList.add('half');
			} else if (percentVal > 20) {
				classList.add('quarter');
			}
		}		
	}
	
	//console.log(currentColor);
	target.style.background = `linear-gradient(to right, ${_minColor} 0%, ${currentColor} ${percentVal}%, #E0E0E0 ${percentVal}%, #E0E0E0 100%)`;
	
	//convertHexToRGBArray('#1F94B9');
	//calcColor(100);
}



function sliderHandler(target) {	//sliderHandler
	//console.log(target.value);
	sliderStyling(target);
	const {min, max} = target;

	const divRtosVar = target.closest(`.divRtosVar`);
	const lblUnit = divRtosVar.querySelector(`.lblUnit`);
	
	if (max - min == 101 && target.value <= 0)
		target.value = -1;
	target.wert = target.value;
	divRtosVar.wert = target.wert;
	const btnHand = divRtosVar.querySelector(`.btnHand`);
	if (btnHand)
		btnHand.wert = target.wert;
	lblUnit.wert = target.wert;
	lblUnit.value = target.value;
	
	//min <= 0 
	lblUnit.innerHTML = (max - min == 101 && target.value <= 0) ? 'Zu' : `${lblUnit.value} ${lblUnit.unit}`;
	
	return lblUnit;
}
function sliderAdjustValueBtnEventHandler(ev) {
	const {type, target} = ev;
	console.log(ev.type);
	if (type.match(/(touchstart)/))
		ev.preventDefault();
	if (!target.timerMousePressed && type.match(/(mousedown|touchstart)/)) {
			target.timerMousePressed = setInterval(sliderAdjustValueBtnHandler, 100, target);
	}
	else if (target.timerMousePressed){
		clearInterval(target.timerMousePressed);
		target.timerMousePressed = undefined;
	}
}

function sliderAdjustValueBtnHandler(target) {
	const slider = Array.from(target.parentElement.childNodes).find(el => (el.type === `range`));
	
	//const slider = (target.classList.contains(`btnDec`)) ? target.nextElementSibling : target.previousElementSibling;
	//console.log(slider, target.wert);
	slider.value = parseFloat(slider.value) + parseFloat(target.wert);
	//Sonderfall Analogmischer
	if (slider.unit == '%' && slider.value == 0)
		slider.value = parseFloat(slider.value) + parseFloat(slider.step);
	sliderHandler(slider);	
}

function radioBtnByNameNEW(target) {
	//console.log(target);
	const {idx, name, id} = target;		
	
	//var changedBtns = [];
	const relatedBtns = document.getElementsByName(name);
	const btnToggleForceVal = (target.classList.contains(`uncheckable`)) ? undefined : true;
	relatedBtns.forEach(el => el.classList.toggle(`checked`, (el === target) ? btnToggleForceVal : false));
	
	if (target.wert.toString() == '') {
		const slider = document.querySelector(`#inpWert${idx}`);
		target.wert = slider.wert;
	}
	//const divRtosVar = document.querySelector(`#v${idx.toString().padStart(3,'0')}`);
	const divRtosVar = target.closest(`.divRtosVar`);
	if (id === `triggerBtnTagbetrieb`) {
		divRtosVar.wert = (target.classList.contains(`checked`)) ? 1 : 0;
	}
	else {
		divRtosVar.wert = target.wert;
	}
	if (id === `triggerBtnTagbetrieb`) sendDataToRtosNEW(target);
}

function toggleSliderAbilityByBtnHandNEW(target) {	
	const enabled = target.className.toUpperCase().includes('HAND');
	//console.log(target.parentElement.childNodes);
	const relevantSiblings = Array.from(target.parentElement.childNodes).filter(el => (el.type === `range` || el.classList.contains(`btnIncDec`)));
	relevantSiblings.forEach(el => {
		el.disabled = !enabled;
		if (el.type === `range`) {
			el.classList.toggle(`disabled`, !enabled);
			sliderStyling(el);
		}
	});
}



function updateLblUnit(target) {
	const divRtosVar = target.closest(`.divRtosVar`);
	const lblUnit = divRtosVar.querySelector(`.lblUnit`);
	
	const targetIsBtnHand = target.title.toUpperCase().includes('HAND');
	lblUnit.innerHTML = (!targetIsBtnHand) ? target.title : (lblUnit.value <= 0) ? `Zu` : `${lblUnit.value} ${lblUnit.unit}`;
}

function controlGroupBtnHandlerNEW(target) {
	radioBtnByNameNEW(target);
	toggleSliderAbilityByBtnHandNEW(target);
	updateLblUnit(target);
	//console.log(btn);
}

function createControlGroup(el) {
	const {idx, name, wert, oberGrenze, unterGrenze, nachKommaStellen, einheit} = el;
	//div mit ID=rtosVariable erzeugen & anhängen (return object)
	const divRtosVar = document.createElement('div');
	divRtosVar.id = `v${idx.toString().padStart(3,'0')}`;
	divRtosVar.className = 'divRtosVar';
	divRtosVar.idx = idx;
	
	//Namenslabel erzeugen & anhängen
	const lblName = document.createElement('label');				
	divRtosVar.appendChild(lblName);
	lblName.className = 'lblName';
	lblName.innerHTML = name.trim();
	
	//Inputelemente (btns, slider, number, etc.) erzeugen & anhängen
	const divInpWert = document.createElement('div');
	divRtosVar.appendChild(divInpWert);
	divInpWert.className = 'divInpWert';
	divInpWert.id = divInpWert.className + idx;
	divInpWert.idx = idx;
	
	//zu erzeugende Elemente auf Basis der Range ermitteln:
	const range = (parseFloat(oberGrenze.trim()) - parseFloat(unterGrenze.trim()) + 1) * Math.pow(10, nachKommaStellen);
	
	//Zeilenumbruch vor lblName anfügen, um Textausrichtung mittig zu Btns (außer Kalender) zu setzen
	if (range <= 4 && !name.match(/(kalender|tagbetrieb)/gi)) lblName.innerHTML = '\n' + lblName.innerHTML;
	
	const inpWert = document.createElement('input');				
	divInpWert.appendChild(inpWert);
	inpWert.className = `inpWert`;
	inpWert.id = `inpWert${idx}`;
	inpWert.idx = idx;
	inpWert.unit = einheit.trim();
	inpWert.unterGrenze = parseFloat(unterGrenze.trim());
	inpWert.oberGrenze = parseFloat(oberGrenze.trim());
	inpWert.min = inpWert.unterGrenze;
	inpWert.minColor = '#1F94B9';
	inpWert.max = inpWert.oberGrenze;
	if (inpWert.unit.includes('&deg') || lblName.innerHTML.includes('Kessel') || lblName.innerHTML.includes('BHKW')) {
		inpWert.maxColor = '#C31D64';
	}
	else {
		inpWert.maxColor = '#1F94B9';
	}
	inpWert.step = Math.pow(10, -nachKommaStellen);
	inpWert.wert = parseFloat(wert);
	
	//+-Buttons neben Slider erzeugen
	if (range > 4) {
		const adjustBtnArray = [`-`, `+`];
		adjustBtnArray.forEach(el => {
			const btnIncDec = document.createElement('input');
			btnIncDec.type = 'button';
			btnIncDec.className = `btnIncDec`;
			btnIncDec.value = el;
			btnIncDec.wert = Math.pow(10, -nachKommaStellen);
			btnIncDec.addEventListener(`mousedown`, sliderAdjustValueBtnEventHandler);
			btnIncDec.addEventListener(`mouseup`, sliderAdjustValueBtnEventHandler);
			btnIncDec.addEventListener(`mouseout`, sliderAdjustValueBtnEventHandler);
			btnIncDec.addEventListener(`touchstart`, sliderAdjustValueBtnEventHandler);
			btnIncDec.addEventListener(`touchend`, sliderAdjustValueBtnEventHandler);
			btnIncDec.addEventListener(`touchcancel`, sliderAdjustValueBtnEventHandler);
			if (el === `-`) {
				btnIncDec.wert *= -1;
				divInpWert.insertBefore(btnIncDec, inpWert);
				btnIncDec.classList.add(`btnDec`); 
			}
			else if (el === `+`) {
				divInpWert.appendChild(btnIncDec);
				btnIncDec.classList.add(`btnInc`);
			}
		});
	}
	
	//console.log(range);
	//let checkedBtn;
	switch (range) {			
		//createTriggerBtn (Einmalig...); radioBtnByNameNEW
		case 2:
			inpWert.type = 'button';
			inpWert.classList.add(`btnBA`,`uncheckable`);
			inpWert.classList.toggle(`checked`, parseInt(wert));
			inpWert.name = 'triggerBtn';
			inpWert.wert = 1;
			inpWert.title = name.trim();
			inpWert.addEventListener(`click`, (ev) => radioBtnByNameNEW(ev.target));
			if (name.toUpperCase().includes('AUS')) {
				inpWert.id = `triggerBtnAus`;
				inpWert.classList.add('btnAus');
			}
			else if (name.toUpperCase().includes('EIN')) {
				inpWert.id = `triggerBtnEin`;
				inpWert.classList.add('btnEin');
			}
			else if (name.toUpperCase().includes('TAGBETRIEB')) {
				inpWert.id = `triggerBtnTagbetrieb`;
				inpWert.value = `Partytaster`;
				inpWert.classList.add(`btnTagbetrieb`);
			}
			//if (wert == inpWert.wert) checkedBtn = inpWert;
			break;
		/*
		//createBtnCalender || createBtnGroup
		case 3:
			if (parseFloat(unterGrenze.trim()) == 0) {
				inpWert.type = 'button';
				inpWert.id = 'calenderBtn';
				inpWert.classList.add(`calenderBtn`);
				inpWert.wert = locked ? 2 : 1;
				inpWert.value = 'zum Kalender';
				inpWert.title = `Absenkungswochenkalender öffnen${locked ? ' (schreibgeschützt)' : ''}`;
				//inpWert.title = 'Absenkungswochenkalender öffnen';
				//if (inpWert.wert == 2) inpWert.title += ' (schreibgeschützt)';
				inpWert.addEventListener(`click`, jumpToWochenKalender);
			}
			
			if (parseFloat(unterGrenze.trim()) == -1) {
				const idArray = [`Auto`, `Ein`, `Aus`];
				for (let i=0; i<3; i++) {
					if (i > 0) {
						const inpWert = document.createElement('input');				
						divInpWert.appendChild(inpWert);
						inpWert.className = 'inpWert';
						inpWert.idx = idx;
					}
					
					let id;
					if (i == 0) id = 'Auto';
					if (i == 1) id = 'Ein';
					if (i == 2) id = 'Aus';
					
					inpWert.type = 'button';
					inpWert.title = id;
					inpWert.id = 'btn' + id + idx;	//idx nutzen um eindeutige IDs zu erzeugen
					inpWert.className += ' btnBA';
					inpWert.className += (' btn' + id);
					inpWert.name = 'btnBA' + idx;	//idx nutzen um eindeutige RadioGroups zu erzeugen
					(i == 2) ? inpWert.wert = -1 : inpWert.wert = i;
					inpWert.onclick = radioBtnByNameNEW;
					if (wert == inpWert.wert) checkedBtn = inpWert;
				}					
			}
			break;
		*/

		//createBtnCalender || createBtnGroup
		case 3:
		//createBtnGroup3PMischer (Auto, HandOpen, HandClose, Stop)
		case 4:
			if (parseFloat(unterGrenze.trim()) == 0) {
				inpWert.type = 'button';
				inpWert.id = 'calenderBtn';
				inpWert.classList.add(`calenderBtn`);
				inpWert.wert = locked ? 2 : 1;
				inpWert.value = 'zum Kalender';
				inpWert.title = `Absenkungswochenkalender öffnen${locked ? ' (schreibgeschützt)' : ''}`;
				//inpWert.title = 'Absenkungswochenkalender öffnen';
				//if (inpWert.wert == 2) inpWert.title += ' (schreibgeschützt)';
				inpWert.addEventListener(`click`, (ev) => jumpToWochenKalender(ev.target));
			}
			
			if (parseFloat(unterGrenze.trim()) == -1) {
				const idArray = (range === 3) ? [`Auto`, `Ein`, `Aus`] : [`Auto`, `Auf`, `Zu`, `Stopp`];
				idArray.forEach((el, elIdx) => {
					const inpBtn = (elIdx === 0) ? inpWert : document.createElement('input');
					if (i > 0) {			
						divInpWert.appendChild(inpBtn);
						inpBtn.className = 'inpWert';
						inpBtn.idx = idx;
					}
					inpBtn.type = 'button';
					inpBtn.title = el;
					inpBtn.id = `btn${el}${idx}`;	//idx nutzen um eindeutige IDs zu erzeugen
					inpBtn.classList.add(`btnBA`, `btn${el}`);
					inpBtn.name = `btnValve${idx}`;	//idx nutzen um eindeutige RadioGroups zu erzeugen
					inpBtn.wert = (elIdx === idArray.length - 1) ? -1 : elIdx;
					inpBtn.addEventListener(`click`, (ev) => radioBtnByNameNEW(ev.target));
					if (wert == inpBtn.wert)
						divRtosVar.initCheckedBtn = inpBtn;
				});
			}
			break;
			
		//createSliderBtnCombo (Auto, Hand/(HandOn, HandOff))
		case 101: //Kesselpumpe: (hat kein 'Aus' [-1]!; min = 1 statt 2)
			inpWert.min = 1;
		case 102:
			lblName.innerHTML = 'Handwert\n\n' + lblName.innerHTML;
							
			const iterations = (name.match(/(mischer)|(ventil)/i)) ? 1 : range - 100 + 1;
			
			for (let i=0; i<=iterations; i++) {
				const inpBtn = document.createElement('input');				
				divInpWert.appendChild(inpBtn);
				inpBtn.className = 'inpWert';
				inpBtn.idx = idx;
				
				let id;
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
				inpBtn.title = (id == 'Ein') ? `${id} (Sollw. intern)` : id;
				inpBtn.id = `btn${id}${idx}`;	//idx nutzen um eindeutige IDs zu erzeugen
				inpBtn.classList.add(`btnBA`, `btn${id}`);
				inpBtn.name = `btnBA${idx}`;	//idx nutzen um eindeutige RadioGroups zu erzeugen
				inpBtn.addEventListener(`click`, (ev) => controlGroupBtnHandlerNEW(ev.target));
				
				if (wert == inpBtn.wert || (!divRtosVar.initCheckedBtn && id === `Hand`))
					divRtosVar.initCheckedBtn = inpBtn;	
			}
			//hier KEIN break um zusätzlichen slider zu erzeugen!
			//break;
		//createSlider/Number?
		default:
			inpWert.type = 'range';
			inpWert.value = constrain(inpWert.wert, inpWert.min, inpWert.max);
			inpWert.wert = inpWert.value;
			
			if (inpWert.type == 'number' || inpWert.type == 'text')
				inpWert.addEventListener(`click`, showOSK); //OSK für 'text' & 'number' bei Eingabe einblenden
			if (inpWert.type == 'range')
				inpWert.addEventListener(`input`, (ev) => sliderHandler(ev.target));
	}	
	
	//Unit-Label erzeugen & anhängen
	const lblUnit = document.createElement('label');				
	divRtosVar.appendChild(lblUnit);
	lblUnit.className = 'lblUnit';
	lblUnit.idx = idx;
	lblUnit.value = inpWert.value;//parseFloat(wert);
	lblUnit.unit = (range > 4) ? einheit.trim() : ``;
	if (lblUnit.unit && lblUnit.unit != '3P')
		lblUnit.innerHTML = `${inpWert.value} ${inpWert.unit}`;
	if (lblUnit.innerHTML.includes('undefined'))
		lblUnit.innerHTML = "";
	
	return divRtosVar;
}

function initControlGroup(divRtosVar) {
	//console.log(divRtosVar);
	const {initCheckedBtn} = divRtosVar;
	const slider = divRtosVar.querySelector(`[type = "range"]`);
	
	//targetHandler ausführen um aktuellen Zustand zu Initiieren
	if (slider) {
		sliderHandler(slider);
		if (initCheckedBtn)
			controlGroupBtnHandlerNEW(initCheckedBtn);
	}
	else if (initCheckedBtn) {
		radioBtnByNameNEW(initCheckedBtn);
	}

	/*if (inpWert.type === 'range') {
		sliderHandler(inpWert);
	}
	
	if (initCheckedBtn) {
		(range > 4) ? controlGroupBtnHandlerNEW(initCheckedBtn) : radioBtnByNameNEW(initCheckedBtn);
	}
	*/
}

function buildFaceplateNEW() {
	const fpBody = document.querySelector('#fpBody');
	
	let fpSection;
	ClickableElement.forEach(el => {
		//console.log(el);
		const wert = (el.wert) ? el.wert.trim() : undefined;
		const name = (el.name) ? el.name.trim() : undefined;
		
		if (el.sectionIndicator.match(/H/i)) {
			document.querySelector('#h4FpHeader').innerText = `Einstellungen für ${wert}`;
		}
		
		const zwischenüberschrift = el.sectionIndicator.match(/S/i) || name.match(/(Betriebsart)|(Wochenkalender)|(Tagbetrieb)/) ? name :
									name.includes(`NennVL`) ? `HK-Temperaturparameter` :
									name.includes(`20 &degC`) ? `Pumpenkennlinie\n(nach Außentemperatur)` :
									name.includes(`Tagbetrieb`) ? `Partytaster` :
									undefined;
		
		if (zwischenüberschrift || !fpSection) {
			//Beginn neue Section
			//neue Section erzeugen & anhängen
			fpSection = document.createElement('div');
			(zwischenüberschrift === `Partytaster`) ? fpBody.insertBefore(fpSection, fpBody.firstElementChild) : fpBody.appendChild(fpSection);
			fpSection.classList.add(`fpSection`);
			
			//Zwischenüberschrift erzeugen & anhängen
			const h5fpSection = document.createElement('h5');
			fpSection.appendChild(h5fpSection)
			if (zwischenüberschrift) {
				h5fpSection.innerText = zwischenüberschrift;
			}
		}
		
		//FP-Zeile erzeugen
		if (el.sectionIndicator.toUpperCase() != 'H' && wert) {
			const divRtosVar = createControlGroup(el);
			fpSection.appendChild(divRtosVar);
			initControlGroup(divRtosVar);
		}
	});	
}

function jumpToWochenKalender(target){
	//1.Deaktivieren Autoreload Funktion beim Fernbedienung ? (überlegung)
	clearInterval(fernbedienungAutoReload);
	//2.Der Wert 'HK Wochenkalender' wird auf 1 geändert und zurückübertragen (gesamte 20 Zeile)
	//Pearl-seitig wird das HK-Wochenkalender aufm Canvas gerendert.
	//var sendError = sendValueFromVisuToRtos('openHKWochenKalender');
	const divRtosVar = target.closest(`.divRtosVar`);
	divRtosVar.wert = target.wert;

	const sendError = sendDataToRtosNEW(target);
	if (!sendError) {
		showWochenKalenderVisu();
		activeTabID = 'wochenKalenderImVisu';
		wochenKalenderImVisuAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50, wochenKalenderImVisuCanvasContext, wochenKalenderImVisuCanvas);
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

