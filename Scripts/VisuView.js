const DEVMODE = false; //no Lock/AutoLock
const DEBUG = false;
const FORCE_ANALOGMISCHER = false;


const ICON_SIZE_PX = 40;

const DEPLOYED_VISU_FILE = `./Visu/Visu.txt`;
const LIVE_DATA_URL = `./DATA/visdat.txt`;
const COUNTER_URL = `./DATA/zaehl.txt`;
const FACEPLATE_DATA_URL = `http://172.16.0.102/JSONADD/GET?p=5&Var=all`;
// Diverse globale Variablen
// Vorgehensweise analog zu der in VCO_Edit.aspx

//Einstellungen Visualisierungen
const MAX_TIME_DELTA_MPC_MS = 900000; //15min
const AUTOLOCK_TIMEOUT = 1200000; //20min
var locked = !DEVMODE;

function getOnlinegesamtZaehler(url) {
	const res = readFromTextFile(url);
    const resWithoutDate = res.substring(41);
	const index = resWithoutDate.lastIndexOf('\x1b\x1b\x44\x34');
	return resWithoutDate.substr(0, index - 1);
}

function getVisuData(deployedVisuFile) {
	const visudata = JSON.parse(readFromTextFile(deployedVisuFile));
	visudata.DropList.forEach(el => {
		el.msrItem = {};
		el.msrItem.identifyer = el.VCOItem.Bez.trim();
		el.msrItem.idx = parseInt(el.VCOItem.Kanal);
		el.msrItem.msr = `${el.msrItem.identifyer}${el.msrItem.idx}`;
		el.msrItem.decPlace = parseInt(el.VCOItem.NKStellen);
		el.msrItem.unit = unitFromInt(parseInt(el.VCOItem.iEinheit));
		el.msrItem.title = el.ToolTip.replace(`<<<`, ``).replace(`(grau)`, ``).trim();
		el.msrItem.faceplate = el.VCOItem.iD.trim();
		el.msrItem.tabIdx = el.bmpIndex;
		el.msrItem.xPx = parseInt(el.x);
		el.msrItem.yPx = parseInt(el.y);
		el.msrItem.font = el.font;
		el.msrItem.color = (el.Symbol.match(/(Absenkung)/i)) ? CYAN_HSL : el.Color;
		el.msrItem.bgColor = (!el.BgColor.match(/(#BEBEBE)|(#E0E0E0)/)) ? el.BgColor : ``;
		el.msrItem.icon = el.Symbol;
		el.msrItem.iconFeature = el.SymbolFeature.replace(`gruen`, `green`).replace(`rot`, `red`).replace(`unsichtbar`, ``).replace(`blinkend`, ``).trim();		
		
		if (el.Symbol.match(/(Rechts)|(Oben)|(Unten)/i)) {
			el.msrItem.rotation = (el.SymbolFeature.match(/(Rechts)/i)) ? 180 :
								  (el.SymbolFeature.match(/(Oben)/i)) ? 90 :
								  (el.SymbolFeature.match(/(Unten)/i)) ? 270 :
								  0;
		}		
		if (el.SymbolFeature.includes(`blinkend`) || el.Symbol.match(/(Pumpe)|(BHKW)|(Feuer)|(Lueftungsklappe)|(Abluftklappe)/i)) {
			el.msrItem.animation = (el.SymbolFeature.includes(`blinkend`)) ? `blink` :
								   (el.Symbol.match(/(Feuer)/i)) ? `flicker` :
								   (el.Symbol.match(/(Lueftungsklappe)|(Abluftklappe)/i)) ? `rotate` :
								   `spin`;
		}
		if (el.Symbol.match(/(Absenkung)|(Freitext)/i)) {
			el.msrItem.trueTxt = (el.Symbol.match(/(Absenkung)/i)) ? `Nacht` :
								 (el.SymbolFeature.startsWith(`!`)) ? `` : el.SymbolFeature;
			el.msrItem.falseTxt = (el.Symbol.match(/(Absenkung)/i)) ? `Tag` :
								  (el.SymbolFeature.startsWith(`!`)) ? el.SymbolFeature : ``;
		}
	});

	return visudata
}

function startVisu() {
	const liveDataRaw = readFromTextFile(LIVE_DATA_URL);
	const liveData = parseLiveData(liveDataRaw);
	
	const visudata = getVisuData(DEPLOYED_VISU_FILE);
	//console.log(visudata);
	
	DrawVisu(visudata);
	switchVisuTab(visudata);
	updateLiveDataElements(liveData.items);
}

function parseProjectId(liveDataRaw) {
	const result = liveDataRaw.match(/(?<projectId>P\s*\d+)/);
	return result.groups.projectId;
}

function parseDate(liveDataRaw) {
	const result = liveDataRaw.match(/(?<day>\d+)\.\s*(?<month>\d+)\.(?<year>\d+)\s+(?<hours>\d+):\s*(?<minutes>\d+):(?<seconds>\d+)/).groups;
	const date = new Date(result.year, parseInt(result.month) - 1, result.day, result.hours, result.minutes, result.seconds);
	return date;
}

function parseAlarms(liveDataRaw, alarmTxtLength = 20) {
	const alarms = liveDataRaw.match(/(STOE\s*\d+.{20})/g);
	const result = [];
	alarms.forEach(alarm => {
		const object = alarm.match(/(?<id>\d+)(?<txt>.+)/).groups;
		object.txt = object.txt.trim();
		result.push(object);
	});
	return result;
}

function parseHKnames(liveDataRaw) {
	const names = liveDataRaw.match(/(HKNA\s*\d+.{20})/g);
	const result = [];
	names.forEach(name => {
		const object = name.match(/(?<Kanal>\d+)(?<sWert>.+)/).groups;
		object.Bezeichnung = `HKNA`;
		object.Kanal = parseInt(object.Kanal);
		object.msr = `${object.Bezeichnung.trim()}${object.Kanal}`;
		object.isBool = false;
		object.BoolVal = false;
		result.push(object);
	});
	return result;
}				

function parseFaceplateBtns(liveDataRaw) {
	const data = liveDataRaw.match(/[A-UW-Z][A-Z]+\s*\d+,\s*(CLICK)\d*/g);
	const result = [];
	data.forEach(dataset => {
		const object = dataset.match(/(?<Bezeichnung>[A-Z]+)\s*(?<Kanal>\d+),\s*(CLICK)(?<Wert>\d*)/).groups;
		object.Kanal = parseInt(object.Kanal);
		object.Wert = parseInt(object.Wert);
		object.msr = `${object.Bezeichnung.trim()}${object.Kanal}`;
		object.sWert = `CLICK`;
		object.isBool = false;
		object.BoolVal = false;
		if (object.Wert === undefined) { //erscheint unlogisch!!! prüfen...
			object.Wert = 2;
		}
		result.push(object);
	});
	return result;
}

function parseMSRdata(liveDataRaw) {
	const msrData = liveDataRaw.match(/[A-Z]+\s*\d+,\d,[\s\d]{2}\s*-*\d+\.*\d*/g);
	const result = [];
	msrData.forEach(msrDataset => {
		const msrObject = msrDataset.match(/(?<Bezeichnung>[A-Z]+)\s*(?<Kanal>\d+),(?<Nachkommastellen>\d),(?<iEinheit>[\s\d]{2})\s*(?<Wert>-*\d+\.*\d*)/).groups;
		msrObject.Kanal = parseInt(msrObject.Kanal);
		msrObject.Wert = parseInt(msrObject.Wert);
		msrObject.msr = `${msrObject.Bezeichnung.trim()}${msrObject.Kanal}`;
		//ToDo:
		msrObject.isBool = (msrObject.Bezeichnung.match(/(PH)|(KPU)|(KL)|(BPU)|(BL)|(WPP)|(WPL)|(LP)|(SP)|(ZP)|(SG)|(BI)/)) ? true : false;
		msrObject.BoolVal = (msrObject.isBool) ? !!msrObject.Wert : false;
		msrObject.EinheitText = unitFromInt(msrObject.iEinheit);
		result.push(msrObject);
	});
	return result;
}

/*This function was written in C# as WebService and called per ajax
Source can be found at Visutool.cs VisuObject class
Rawdata was read from RD02 folder and will be processed to return Visudownload, no more changed need to be made.

There is no List data structure in Javascript so nested array will be use instead. 
Datastructure of Visudownload will be nested array + array of object
*/
//ehemals createVisudata(sText)
function parseLiveData(liveDataRaw) {	
	const liveData = {};
	liveData.projectId = parseProjectId(liveDataRaw);
	liveData.date = parseDate(liveDataRaw);
	liveData.alarms = parseAlarms(liveDataRaw);
	liveData.HKnames = parseHKnames(liveDataRaw);
	liveData.faceplateBtns = parseFaceplateBtns(liveDataRaw);
	liveData.msrData = parseMSRdata(liveDataRaw);
	liveData.items = liveData.HKnames.concat(liveData.faceplateBtns).concat(liveData.msrData);
	window.liveData = liveData;
	return liveData;
}

//ehemals getVisuItemEinheit(i)
function unitFromInt(int) {
	const unit = [``, `°C`, `bar`, `V`, `kW`, `m³/h`, `mWS`, `%`, `kWh`, `Bh`, `m³`, `°Cø`, `mV`, `UPM`, `s`, `mbar`, `A`, `Hz`, `l/h`, `l`].at(parseInt(int));
  	return (unit) ? unit : ``;
}

// Diverse Zeichenfunktionen wie im Editor
function feuer(ctx, x, y, scale) {
	// 30x48
	var rd1 = (Math.random() - 0.5) * 3;
	var rd2 = (Math.random() - 0.5) * 3;
	var rd3 = (Math.random() - 0.5) * 3;
	var rd4 = (Math.random() - 0.5) * 3;
	var rd5 = (Math.random() - 0.5) * 3;
	var rd6 = (Math.random() - 0.5) * 3;
	ctx.save();

	ctx.lineWidth = 1;
	ctx.translate(x, y);
	ctx.scale(scale, scale);
	ctx.strokeStyle = "red";
	ctx.fillStyle = "yellow";
	ctx.beginPath();
	ctx.moveTo(0 + rd1, -20);
	ctx.lineTo(-5 + rd2, -10);
	ctx.lineTo(-8 + rd3, -5);
	ctx.lineTo(-7 + rd4, 5);
	ctx.lineTo(-2 + rd5, 10);

	ctx.lineTo(2 + rd5, 10);
	ctx.lineTo(4 + rd4, 5);
	ctx.lineTo(6 + rd6, -5);
	ctx.lineTo(5 + rd2, -10);
	ctx.lineTo(0 + rd1, -20);
	ctx.fill();
	ctx.stroke();

	//ctx.closePath();
	ctx.restore();
}

function createIcon(msrItem) {
	const htmlElType = (msrItem.icon.match(/(led)|(feuer)|(schalter)/i)) ? `div` :
					   (msrItem.icon.match(/(fpButton)|(Heizkreis)/)) ? `input` :
					   `canvas`;
	const htmlEl = document.createElement(htmlElType);
	htmlEl.classList.add(`visuElement`);
	htmlEl.setAttribute(`msr`, msrItem.msr);
	if (msrItem.animation) {
		htmlEl.setAttribute(`animation`, msrItem.animation);
	}
	htmlEl.setAttribute(`faceplate`, msrItem.faceplate);
	htmlEl.setAttribute(`tab-idx`, msrItem.tabIdx);
	htmlEl.title = msrItem.title;

	const ctx = (htmlElType === `canvas`) ? htmlEl.getContext(`2d`) : undefined;
	if (msrItem.icon === `Pumpe`) {
		const outerRadius = 11;
		const innerRadius = 6;
		ctx.lineWidth = 1;

		htmlEl.width = 2 * (outerRadius + ctx.lineWidth);
		htmlEl.height = htmlEl.width;

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = `black`;
		ctx.beginPath();
		ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
		ctx.closePath();
		ctx.stroke();

		ctx.fillStyle = `white`;
		ctx.beginPath();
		ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = `black`;
		ctx.beginPath();
		ctx.arc(0, 0, innerRadius, 1.1 * Math.PI, 1.9 * Math.PI);
		ctx.lineTo(0, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
	else if (msrItem.icon === "Luefter") {
		const outerRadius = 24;
		ctx.lineWidth = 1;

		htmlEl.width = 2 * (outerRadius + ctx.lineWidth);
		htmlEl.height = htmlEl.width;

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = `black`;
		ctx.fillStyle = "grey";
		//LüfterIcon
		/*
		ctx.beginPath();
		ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
		ctx.moveTo(0, -outerRadius);
		ctx.lineTo(-outerRadius, -5);
		ctx.moveTo(0, outerRadius);
		ctx.lineTo(-outerRadius, 5);
		ctx.stroke();
		ctx.closePath();
		*/

		//rotor
		ctx.beginPath();
		ctx.rotate(Math.PI / 180 * 30);
		drawEllipse(ctx, 0, -5, 22, 10);
		drawEllipse(ctx, -22, -5, 22, 10);
		ctx.fill();

		function drawEllipse(ctx, x, y, w, h) {
			const kappa = .5522848,
					 ox = (w / 2) * kappa, // control point offset horizontal
					 oy = (h / 2) * kappa, // control point offset vertical
					 xe = x + w,           // x-end
					 ye = y + h,           // y-end
					 xm = x + w / 2,       // x-middle
					 ym = y + h / 2;       // y-middle
		
			ctx.moveTo(x, ym);
			ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
			ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
			ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
			ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
			ctx.stroke();
		}
	}
	else if (msrItem.icon === `BHKW`) {
		const outerRadius = 13;
		const innerRadius = 10;
		ctx.lineWidth = 1;

		htmlEl.width = 2 * (outerRadius + ctx.lineWidth);
		htmlEl.height = htmlEl.width;

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = CYAN_HSL;
		ctx.beginPath();
		ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
		ctx.moveTo(innerRadius, 0);
		ctx.arc(0, 0, innerRadius, 0, -Math.PI / 4, true);
		ctx.moveTo(innerRadius, 0);
		ctx.arc(0, 0, innerRadius, 0, Math.PI / 4, false);
		ctx.moveTo(-innerRadius, 0);
		ctx.arc(0, 0, innerRadius, Math.PI, -3 * Math.PI / 4, false);
		ctx.moveTo(-innerRadius, 0);
		ctx.arc(0, 0, innerRadius, Math.PI, 3 * Math.PI / 4, true);
		ctx.stroke();

		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(-innerRadius, 0);
		ctx.lineTo(innerRadius, 0);

		ctx.stroke();
	}
	else if (msrItem.icon.match(/(Lueftungsklappe)|(Abluftklappe)/)) {
		const outerRadius = 20;
		ctx.lineWidth = 1;

		htmlEl.width = 2 * (outerRadius + ctx.lineWidth);
		htmlEl.height = htmlEl.width;

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = "black";
		ctx.fillStyle = 'black';
		
		ctx.beginPath();
		ctx.arc(0, 0, 3, 0, 2 * Math.PI);
		ctx.fill();

		ctx.moveTo(-20, 0);
		ctx.lineTo(20, 0);

		ctx.stroke();
	}
	else if (msrItem.icon === `VentilFilled`) {
		ctx.lineWidth = 1;
		htmlEl.width = 2 * (8 + ctx.lineWidth);
		htmlEl.height = htmlEl.width;

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = "black";
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.moveTo(-8, -8);
		ctx.lineTo(-8, 8);
		ctx.lineTo(8, 0);
		ctx.lineTo(-8, -8);
		ctx.fill();
	}
	else if (msrItem.icon === `Ventil`) {
		ctx.lineWidth = 1;
		htmlEl.width = 1.5 + 11 + 2 + 2 * ctx.lineWidth;
		htmlEl.height = 2 * (2 + ctx.lineWidth);

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = "black";
		ctx.fillStyle = "black";
		
		ctx.beginPath();
		ctx.fillRect(-1.5, -1, 1.5, 2);
		ctx.moveTo(0, 2);
		ctx.lineTo(2, 0);
		ctx.lineTo(0, -2);
		ctx.fill();
		
		ctx.translate(11, 0);
		ctx.fillRect(-1.5, -1, 1.5, 2);
		ctx.moveTo(0, 2);
		ctx.lineTo(2, 0);
		ctx.lineTo(0, -2);
		ctx.fill();
	}
	else if (msrItem.icon === `Schalter`) {
		htmlEl.classList.add(`switch`);
		[-15, -3].forEach(y => {
			const canvas = document.createElement(`canvas`);
			htmlEl.appendChild(canvas);
			const ctx = canvas.getContext(`2d`);
			ctx.lineWidth = 2;
			htmlEl.width = 40 + 2 * ctx.lineWidth;
			htmlEl.height = htmlEl.width;

			ctx.translate(htmlEl.width/2, htmlEl.height/2);
			ctx.strokeStyle = "black";
			ctx.beginPath();
			ctx.moveTo(-20, 0);
			ctx.lineTo(-10, 0);
			ctx.lineTo(13, y);

			ctx.moveTo(10, -5);
			ctx.lineTo(10, 0);
			ctx.lineTo(20, 0);
			ctx.stroke();
		});		
	}
	else if (msrItem.icon === `Led`) {
		htmlEl.classList.add(`led`);
		const colors = msrItem.iconFeature.split(`/`);
		//console.log(colors);
		colors.forEach(color => {
			if (color) {
				const canvas = document.createElement(`canvas`);
				htmlEl.appendChild(canvas);
				const ctx = canvas.getContext(`2d`);

				const outerRadius = 6;
				const innerRadius = 4;
				ctx.lineWidth = 1;

				canvas.width = 2 * (outerRadius + ctx.lineWidth);
				canvas.height = canvas.width;

				ctx.translate(canvas.width/2, canvas.height/2);
				ctx.strokeStyle = "black";
				ctx.beginPath();
				ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
				ctx.stroke();
				ctx.closePath();			
				ctx.beginPath();
				ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}
		});
	}
	else if (msrItem.icon === `Feuer`) {
		[`red`, `orange`, `yellow`, `white`, `blue`].forEach(color => {        
			const flameLayer = document.createElement(`div`);
			flameLayer.classList.add(`flameLayer`);
			flameLayer.setAttribute(`color`, color);
			htmlEl.appendChild(flameLayer);
    	});
  	}
	else if (msrItem.icon.match(/(fpButton)|(Heizkreis)/)) {
		htmlEl.type = `button`;
		htmlEl.classList.add(`faceplateBtn`);		
		htmlEl.addEventListener(`click`, openFaceplate);
	}
	else {
		return null;
	}


	const offsetX = (htmlElType === `canvas`) ? htmlEl.width/2 : ICON_SIZE_PX/2;
	const offsetY = (htmlElType === `canvas`) ? htmlEl.height/2 : ICON_SIZE_PX/2;
	htmlEl.style.left = `${msrItem.xPx - offsetX}px`;
	htmlEl.style.top = `${msrItem.yPx - offsetY}px`;

	return htmlEl;
}

function switchVisuTab(visudata, targetTabIdx = 0) {
	const vimgArea = document.querySelector(`#vimgArea`);
	vimgArea.setAttribute(`tab-idx`, targetTabIdx)
	vimgArea.style.background = `no-repeat url(${visudata.VCOData.Bitmaps[targetTabIdx].URL})`;
	document.querySelectorAll(`[tab-idx]`).forEach(el => el.classList.toggle(`hidden`, parseInt(el.getAttribute(`tab-idx`)) != targetTabIdx));
}

function DrawVisu(visudata) {
	drawDropList(visudata);
	drawTextList(visudata);
}

function drawDropList(visudata) {
	visudata.DropList.forEach(el => drawVCOItem(el.msrItem));
}

function drawVCOItem(msrItem) {
	const vimgArea = document.querySelector(`#vimgArea`);

	const icon = createIcon(msrItem);
	if (icon) {
		vimgArea.appendChild(icon);
	}
	else {
		const msrLbl = document.createElement(`label`);
		vimgArea.appendChild(msrLbl);
		msrLbl.classList.add(`visuElement`);
		msrLbl.setAttribute(`msr`, msrItem.msr);
		msrLbl.setAttribute(`unit`, msrItem.unit);
		msrLbl.setAttribute(`dec-place`, msrItem.decPlace);
		msrLbl.setAttribute(`tab-idx`, msrItem.tabIdx);
		msrLbl.setAttribute(`faceplate`, msrItem.faceplate);
		if (msrItem.trueTxt !== undefined) {
			msrLbl.setAttribute(`true-txt`, msrItem.trueTxt);
		}
		if (msrItem.falseTxt !== undefined) {
			msrLbl.setAttribute(`false-txt`, msrItem.falseTxt);
		}
		msrLbl.style.font = msrItem.font;
		msrLbl.style.color = msrItem.color;
		msrLbl.style.backgroundColor = msrItem.bgColor;
		msrLbl.title = msrItem.title;
		msrLbl.style.left = `${msrItem.xPx}px`;
		msrLbl.style.top = `${msrItem.yPx - parseInt(msrItem.font)}px`;
	}
}

function updateLiveDataElements(liveDataItems) {
	liveDataItems.forEach(item => {
		//console.log(item);
		const htmlElements = document.querySelectorAll(`[msr = ${item.msr}]`);
		if (htmlElements) {
			htmlElements.forEach(el => {
				//console.log(el);

				/*
				if (foundItem.Bezeichnung.trim() === `GA`) {
					const warnGrenze = parseFloat(liveData.items.find(el => el.Bezeichnung.trim() === `GR` && parseInt(el.Kanal) === 2).Wert);
					const stoerGrenze = parseFloat(liveData.items.find(el => el.Bezeichnung.trim() === `GR` && parseInt(el.Kanal) === 3).Wert);
					if (warnGrenze || stoerGrenze) {
						item.bgColor = 	(item.Wert > stoerGrenze) ? `#fc1803` :
										(item.Wert < stoerGrenze && item.Wert > warnGrenze) ? `#fcdf03` :
										(item.Wert < warnGrenze) ? `#42f545` : item.bgColor;
					}
				}
					*/
				if (el.matches(`.led, .switch`)) {
					el.firstElementChild.classList.toggle(`displayNone`, !!item.Wert);
					el.lastElementChild.classList.toggle(`displayNone`, !item.Wert);
					el.classList.toggle(`animate`, el.matches(`[animation]`) && !!item.Wert);
				}
				else if (el.matches(`[animation]`)) {
					el.classList.toggle(`animate`, !!item.Wert);
				}
				else if (el.matches(`.faceplateBtn`)) {
					el.classList.toggle(`btnHand`, !!item.Wert);
					el.classList.toggle(`btnAuto`, !item.Wert);
				}
				else if (!!item.Wert && el.matches(`[true-txt]`)) {
					el.innerText = el.getAttribute(`true-txt`);
				}
				else if (!item.Wert && el.matches(`[false-txt]`)) {
					el.innerText = el.getAttribute(`false-txt`);
				}
				else {
					const unit = el.getAttribute(`unit`);
					const decPlace = parseInt(el.getAttribute(`dec-place`));
					const txt = (item.Bezeichnung.trim() === `HKNA`) ? item.sWert : parseFloat(item.Wert).toFixed(decPlace);
					el.innerText = `${txt} ${unit}`;
				}
			});
		}
	});
}

// Aufruf Funktion
function drawTextList(visudata) {
	const bmpIndex = parseInt(document.querySelector(`#vimgArea`).getAttribute(`tab-idx`));
	visudata.FreitextList.forEach(txtEl => {
		//htmlElements
		const vimgArea = document.querySelector(`#vimgArea`);
		const htmlEl = document.createElement(`${(txtEl.isVerweis) ? 'input' : 'label'}`);
		vimgArea.appendChild(htmlEl);
		htmlEl.classList.add(`visuElement`);
		htmlEl.classList.toggle(`hidden`, parseInt(txtEl.bmpIndex) != bmpIndex);
		htmlEl.setAttribute(`tab-idx`, txtEl.bmpIndex);
		htmlEl.style.font = txtEl.font;
		htmlEl.style.color = txtEl.Color;
		htmlEl.style.background = txtEl.BgColor;

		const paddingAsPx = (txtEl.isVerweis) ? 6 : 0;
		const rotation = (txtEl.VerweisAusrichtung == "up") ? -90 : (txtEl.VerweisAusrichtung == "dn") ? 90 : undefined;
		if (rotation) {
			//ToDo: translate Calc!
			const htmlElBox = htmlEl.getBoundingClientRect();
			htmlEl.style.transform = `rotate(${rotation}deg)`;
			const rotatedHtmlElBox = htmlEl.getBoundingClientRect();
			htmlEl.style.transform = `rotate(${rotation}deg) translate(${(rotatedHtmlElBox.left - htmlElBox.left)/2 - paddingAsPx}px, ${(rotatedHtmlElBox.top - htmlElBox.top + paddingAsPx)/2}px)`;
		}
		
		htmlEl.style.left = `${txtEl.x - paddingAsPx}px`;
		htmlEl.style.top = `${txtEl.y - parseInt(txtEl.font) - paddingAsPx}px`;
		
		if (txtEl.isVerweis) {
			htmlEl.type = `button`;
			htmlEl.value = txtEl.Freitext;

			const link = (txtEl.Freitext.includes(`anstehende Störungen`)) ? `alarms` :
						 (txtEl.Freitext.includes(`Zähler anzeigen`)) ? `counter` :
						 (txtEl.Freitext.includes(`Zähler Archiv`)) ? `counterArchive` :
						 (txtEl.Freitext.includes(`IP Kamera`)) ? `IPcamera` :
						 parseInt(txtEl.idxVerweisBitmap);
			htmlEl.setAttribute(`link`, link);
			htmlEl.addEventListener(`click`, visuBtnClickEventHandler);
		}
		else {
			htmlEl.innerText = txtEl.Freitext;
		}
	});
}

function visuBtnClickEventHandler(ev) {
	const link = ev.target.getAttribute(`link`);
	const linkBgIdx = parseInt(link);
	if (Number.isNaN(linkBgIdx)) {
		const modal = document.querySelector(`.modalBg`);
		modal.classList.remove(`hidden`);
		modal.querySelector(`.modalFooter`).classList.add(`hidden`);

		const content = modal.querySelector(`.modalContent`);
		content.classList.toggle(`alarms`, link === `alarms`);
		
		const liveDataRaw = readFromTextFile(LIVE_DATA_URL);
		
		const h5 = content.querySelector(`h5`);
		if (link === `alarms`) {
			h5.innerText = `Aktuelle Störungen:`;
			const alarms = parseAlarms(liveDataRaw);
			let alarmTxt = (alarms.length) ? `\n` : `keine anstehenden Störungen`;
			alarms.forEach(alarm => alarmTxt += `${alarm.id.padStart(3, `0`)} ${alarm.txt}\n`);
			content.querySelector(`.modalBody`).innerText = alarmTxt;
		}
		else if (link === `counter`) {
			const date = parseDate(liveDataRaw);
			h5.innerText = `Zähler: ${projektName}\n${date.toLocaleString(`de-DE`)}`;

			const gesamtZaehler = getOnlinegesamtZaehler(COUNTER_URL);
			content.querySelector(`.modalBody`).innerText = (gesamtZaehler) ? gesamtZaehler : `Keine Zählerdaten verfügbar`;
		}
		else if (link === `counterArchive`) {
		}
		else if (link === `IPcamera`) {
		}
	}
	else {		
		const bgIdx = parseInt(document.querySelector(`#vimgArea`).getAttribute(`tab-idx`));
		if (bgIdx !== parseInt(link)) {
			const visudata = getVisuData(DEPLOYED_VISU_FILE);
			switchVisuTab(visudata, parseInt(link));
		}	
	}
}

function modalBgClickEventHandler(ev) {
	if (ev.target.matches(`.modalBg, .close, .modalFooterBtn`)) {
		document.querySelector(`.modalBg`).classList.add(`hidden`);
	}
}

function ReloadData() {
	const rawvisuData = readFromTextFile(LIVE_DATA_URL);
	const liveData = parseLiveData(rawvisuData);

	//Read deployed visufile /visu/visu.txt 
	const visudata = getVisuData(DEPLOYED_VISU_FILE);

	const connectionStatusTxt = document.querySelector('.connectionStatusTxt');
	if (liveData.items) {
		updateLiveDataElements(liveData.items);
		connectionStatusTxt.textContent = `Letzte Datenaktualisierung: ${liveData.date.toLocaleString(`de-DE`)}`;
	}
	connectionStatusTxt.classList.toggle(`errorHighlighter`, (Math.abs(liveData.date - new Date()) > MAX_TIME_DELTA_MPC_MS));
}

function closeFaceplate() {
	destroyFaceplate();
	hideElemementById('fpBg');
	hideElemementById('osk');
	//AnchorHandler(1);	//Sprung ins Hauptmenü, wenn Kalender geschlossen wird
}

function destroyFaceplate() {
	var modalBody = document.getElementById('fpBody');
	while (modalBody.firstChild) {
		modalBody.removeChild(modalBody.firstChild);
	}	
}

function closePinModal() {
	hideElemementById('modalPinBg');
	hideElemementById('osk');
}

function toggleBtnsPinLock(id) {
  var btn = document.getElementById(id);
  var relatedBtns = Array.from(document.getElementsByClassName(btn.className));
  
  relatedBtns.forEach(el => el.style.display = "inline-block");
  btn.style.display = "none";
}

function pinLock(id) {
  toggleBtnsPinLock(id);

  locked = true;
  handleConfirmBtn(locked);
}

function btnLockVisuEventHandler(ev) {
	//ev.target 
}

function pinUnlock(id) {
  const OFFSET_MODAL_2_OSK = 40;
  showElemementById('modalPinBg');
  var modal = document.getElementById("Pin-content");
  
  var cb = document.getElementById("cbHidePin");
  cb.checked = true;
  handlePinVisibility(cb.checked);
  
  var txtPin = document.getElementById("txtPin");
  txtPin.value = "";  
  txtPin.focus();
  showElemementById('osk');
  osk.style.top = modal.offsetTop + modal.offsetHeight + OFFSET_MODAL_2_OSK + 'px';
  osk.style.left = modal.offsetLeft + modal.offsetWidth - osk.offsetWidth + 'px';  
}

function switchPinFocus(value) {
  if (value.length >= 4) document.getElementById("btnPinConfirm").focus();
}

function handlePinVisibility(checked) {
  var txtPin = document.getElementById("txtPin");
  checked ? txtPin.type = "password" : txtPin.type = "text";
}

function checkPin() {
  var txtPin = document.getElementById("txtPin");
  let hash = readFromTextFile(HASH_FILE);
  if (md5(txtPin.value) == hash) {
    locked = false;
    toggleBtnsPinLock("btnUnlock");
	if(!DEBUG && !DEVMODE) setTimeout(pinLock, AUTOLOCK_TIMEOUT, "btnLock");
  }
  else {
    locked = true;
    alert("Pin Inkorrekt!");
  }

  handleConfirmBtn(locked);
  closePinModal();
}

function handleConfirmBtn(disable) {
  document.getElementById("btnFaceplateConfirm").disabled = disable;
}

function sleep(miliseconds) {
   var currentTime = new Date().getTime();

   while (currentTime + miliseconds >= new Date().getTime()) {
   }
}

function sendDataToRtosEventHandler(ev) {
	sendDataToRtos(ev.target);
}

function sendDataToRtos(target) {	
	const {id, idx} = target;

	//Nur RtosVar für Wochenkalender ändern (Aufforderung an Rtos Kalenderdaten schicken)
	if (id === `calenderBtn` || id === `triggerBtnTagbetrieb`) {
		const foundEl = ClickableElement.find(el => idx === el.idx);
		const divRtosVar = target.closest(`.divRtosVar`);
		foundEl.wert = foundEl.wert.replace(parseInt(foundEl.wert).toString(), divRtosVar.wert);
	}
	else {
		const divRtosVar = Array.from(document.querySelectorAll(`.divRtosVar`));
		const changedRtosVars = divRtosVar.filter(el => el.wert != undefined);
		
		changedRtosVars.forEach(changedEl => {
			const foundEl = ClickableElement.find(el => changedEl.idx == el.idx);
			foundEl.wert = parseFloat(changedEl.wert).toFixed(4).padStart(10).padEnd(12);
		});
	}
	
	ClickableElement.forEach(el => {
		const rtosVar = `"${el.name}${el.wert}${el.oberGrenze}${el.unterGrenze}${el.nachKommaStellen}${el.einheit}${el.sectionIndicator}"`;
		const url = `${mpcJsonPutUrl}v${el.idx.toString().padStart(3, '0')}=${encodeURIComponent(rtosVar)}`;
		const ans = sendData(url);
		if (!ans.includes('OK'))
			console.error(ans);
	}); 
	
	if (id.toUpperCase().includes('CONFIRM') || id.toUpperCase().includes('SEND')) closeFaceplate();
}


//ehemals VisuView_Bedienung_gemeinsam.js
function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
async function asyncSleep(fn, delay, ...args) {
    await timeout(delay);
    return fn(...args);
}

async function openFaceplate(ev) {
	document.body.setAttribute(`cursorStyle`, `progress`);
	ev.target.setAttribute(`cursorStyle`, `progress`);
	try {
		const faceplateRequestUrl = `${mpcJsonPutUrl}V008=Qz${ev.target.getAttribute(`faceplate`)}`;
		const test = await fetchData(faceplateRequestUrl);
		console.log(test);
		const adjustmentOptions = await asyncSleep(fetchData, 800, FACEPLATE_DATA_URL);
		if (adjustmentOptions.v070.slice(0,5) === faceplateRequestUrl.slice(-5)) {
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
			buildFaceplate();
			//showFaceplate(matchItem);
			document.querySelector(`#fpBg`).classList.remove(`hidden`);
		}
		else {
			alert(`timeout`);
		}
	}
	catch(err) {
		console.error(err);
	}
	document.body.removeAttribute(`cursorStyle`);
	ev.target.removeAttribute(`cursorStyle`);
}

function convertHexToRGBArray(hex) {
	if (hex.startsWith('#')) hex = hex.slice(1);
	const rgb = (hex.length === 3) ? [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)] :
				(hex.length === 6) ? [parseInt(hex[0] + hex[1], 16), parseInt(hex[2] + hex[3], 16),	parseInt(hex[4] + hex[5], 16)] :
				undefined;
	return rgb;
}

function convertRGBArrayToHex(rgb) {
	let hex = '#';
	rgb.forEach(el => (Math.abs(el) < 256) ? hex += Math.round(el).toString(16).toUpperCase().padStart(2, '0') : hex += '00');
	return hex;
}

function calcColor(percentVal, minColorHex = `#1F94B9`, maxColorHex = `#C31D64`) {
	percentVal = constrain(percentVal, 0, 100);

	const minColorRGB = convertHexToRGBArray(minColorHex);
	const maxColorRGB = convertHexToRGBArray(maxColorHex);
	const retColorRGB = [	Math.round(percentVal/100 * (maxColorRGB[0] - minColorRGB[0]) + minColorRGB[0]),
						Math.round(percentVal/100 * (maxColorRGB[1] - minColorRGB[1]) + minColorRGB[1]),
						Math.round(percentVal/100 * (maxColorRGB[2] - minColorRGB[2]) + minColorRGB[2])
						];
	const retColorHex = convertRGBArrayToHex(retColorRGB);
	return retColorHex;
}


function sliderStyling(target) {
	const {value, min, max, disabled, minColor, maxColor, classList} = target;
	const percentVal = (value - min) / (max - min) * 100;
	const _minColor = (disabled) ? '#C0C0C0' : minColor;
	const currentColor = (disabled) ? '#C0C0C0' : calcColor(percentVal, minColor, maxColor);
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
	
	target.style.background = `linear-gradient(to right, ${_minColor} 0%, ${currentColor} ${percentVal}%, #E0E0E0 ${percentVal}%, #E0E0E0 100%)`;
}

function sliderHandler(target) {	//sliderHandler
	sliderStyling(target);
	const {min, max} = target;

	const divRtosVar = target.closest(`.divRtosVar`);
	const lblUnit = divRtosVar.querySelector(`.lblUnit`);
	
	if (max - min == 101 && target.value <= 0) {
		target.value = -1;
	}
	target.wert = target.value;
	divRtosVar.wert = target.wert;
	const btnHand = divRtosVar.querySelector(`.btnHand`);
	if (btnHand)
		btnHand.wert = target.wert;
	lblUnit.wert = target.wert;
	lblUnit.value = target.value;
	
	//min <= 0 
	lblUnit.innerText = (max - min == 101 && target.value <= 0) ? 'Zu' : `${lblUnit.value} ${lblUnit.unit}`;
	
	return lblUnit;
}
function sliderAdjustValueBtnEventHandler(ev) {
	const {type, target} = ev;
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
	
	slider.value = parseFloat(slider.value) + parseFloat(target.wert);
	//Sonderfall Analogmischer
	if (slider.unit == '%' && slider.value == 0)
		slider.value = parseFloat(slider.value) + parseFloat(slider.step);
	sliderHandler(slider);	
}

function radioBtnByName(target) {
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
	if (id === `triggerBtnTagbetrieb`) sendDataToRtos(target);
}

function toggleSliderAbilityByBtnHand(target) {	
	const enabled = target.className.toUpperCase().includes('HAND');
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
	lblUnit.innerText = (!targetIsBtnHand) ? target.title : (lblUnit.value <= 0) ? `Zu` : `${lblUnit.value} ${lblUnit.unit}`;
}

function controlGroupBtnHandler(target) {
	radioBtnByName(target);
	toggleSliderAbilityByBtnHand(target);
	updateLblUnit(target);
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
	lblName.innerText = name.trim().replace(`&deg`, `°`);
	
	//Inputelemente (btns, slider, number, etc.) erzeugen & anhängen
	const divInpWert = document.createElement('div');
	divRtosVar.appendChild(divInpWert);
	divInpWert.className = 'divInpWert';
	divInpWert.id = divInpWert.className + idx;
	divInpWert.idx = idx;
	
	//zu erzeugende Elemente auf Basis der Range ermitteln:
	const range = (parseFloat(oberGrenze.trim()) - parseFloat(unterGrenze.trim()) + 1) * Math.pow(10, nachKommaStellen);
	
	//Zeilenumbruch vor lblName anfügen, um Textausrichtung mittig zu Btns (außer Kalender) zu setzen
	if (range <= 4 && !name.match(/(kalender|tagbetrieb)/gi)) lblName.innerText = '\n' + lblName.innerText;
	
	const inpWert = document.createElement('input');				
	divInpWert.appendChild(inpWert);
	inpWert.className = `inpWert`;
	inpWert.id = `inpWert${idx}`;
	inpWert.idx = idx;
	inpWert.unit = einheit.trim().replace(`&deg`, `°`);
	inpWert.unterGrenze = parseFloat(unterGrenze.trim());
	inpWert.oberGrenze = parseFloat(oberGrenze.trim());
	inpWert.min = inpWert.unterGrenze;
	inpWert.minColor = '#1F94B9';
	inpWert.max = inpWert.oberGrenze;
	if (inpWert.unit === `°C` || lblName.innerText.match(/(Kessel)|(BHKW)/)) {
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
	
	//let checkedBtn;
	switch (range) {			
		//createTriggerBtn (Einmalig...); radioBtnByName
		case 2:
			inpWert.type = 'button';
			inpWert.classList.add(`btnBA`,`uncheckable`);
			inpWert.classList.toggle(`checked`, parseInt(wert));
			inpWert.name = 'triggerBtn';
			inpWert.wert = 1;
			inpWert.title = name.trim();
			inpWert.addEventListener(`click`, (ev) => radioBtnByName(ev.target));
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
					inpBtn.addEventListener(`click`, (ev) => radioBtnByName(ev.target));
					if (wert == inpBtn.wert)
						divRtosVar.initCheckedBtn = inpBtn;
				});
			}
			break;
			
		//createSliderBtnCombo (Auto, Hand/(HandOn, HandOff))
		case 101: //Kesselpumpe: (hat kein 'Aus' [-1]!; min = 1 statt 2)
			inpWert.min = 1;
		case 102:
			lblName.innerText = 'Handwert\n\n' + lblName.innerText;
							
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
				else if (i == 1) {
					id = 'Hand';
					inpBtn.wert = '';
				}
				else if (i == 2) {
					id = 'Ein';
					inpBtn.wert = 1;
				}
				else if (i == 3) {
					id = 'Aus';
					inpBtn.wert = -1;
					inpWert.min = 2;
				}
				
				inpBtn.type = 'button';
				inpBtn.title = (id == 'Ein') ? `${id} (Sollw. intern)` : id;
				inpBtn.id = `btn${id}${idx}`;	//idx nutzen um eindeutige IDs zu erzeugen
				inpBtn.classList.add(`btnBA`, `btn${id}`);
				inpBtn.name = `btnBA${idx}`;	//idx nutzen um eindeutige RadioGroups zu erzeugen
				inpBtn.addEventListener(`click`, (ev) => controlGroupBtnHandler(ev.target));
				
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
	lblUnit.unit = (range > 4) ? einheit.trim().replace(`&deg`, `°`) : ``;
	if (lblUnit.unit && lblUnit.unit != '3P')
		lblUnit.innerText = `${inpWert.value} ${inpWert.unit}`;
	if (lblUnit.innerText.includes('undefined')) {
		lblUnit.innerText = "";
	}
	return divRtosVar;
}

function initControlGroup(divRtosVar) {
	const {initCheckedBtn} = divRtosVar;
	const slider = divRtosVar.querySelector(`[type = "range"]`);
	
	//targetHandler ausführen um aktuellen Zustand zu Initiieren
	if (slider) {
		sliderHandler(slider);
		if (initCheckedBtn) {
			controlGroupBtnHandler(initCheckedBtn);
		}
	}
	else if (initCheckedBtn) {
		radioBtnByName(initCheckedBtn);
	}
}

function buildFaceplate() {
	const fpBody = document.querySelector('#fpBody');
	
	let fpSection;
	ClickableElement.forEach(el => {
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

	const sendError = sendDataToRtos(target);
	if (!sendError) {
		showWochenKalenderVisu();
		activeTabID = 'visuWochenkalender';
		wochenKalenderImVisuAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50, wochenKalenderImVisuCanvasContext, wochenKalenderImVisuCanvas);
	}
}

function closeModalWochenKalenderImVisu(){
	hideElemementById('visuWochenkalender');
}

function showWochenKalenderVisu() {
	const kalenderHeader = document.querySelector('#txtWochenKalenderImVisuHeader');
	const faceplateHeader = document.querySelector('#h4FpHeader');
	kalenderHeader.textContent = faceplateHeader.textContent.replace('Einstellungen', 'Wochenkalender');
	
	const visuWochenkalender = document.querySelector('#visuWochenkalender');
	visuWochenkalender.style.display = "block";
	
	const fpContentBox = document.querySelector('#fpContent').getBoundingClientRect();
	const visuWochenkalenderContent = document.querySelector('#visuWochenkalenderContent');
	const visuWochenkalenderContentBox = visuWochenkalenderContent.getBoundingClientRect();
	const kalenderLeft = Math.max(10, fpContentBox.x + fpContentBox.width - visuWochenkalenderContentBox.width);
	
	visuWochenkalenderContent.style.left = `${kalenderLeft}px`;
	visuWochenkalenderContent.style.top = `${fpContentBox.y}px`;
	hideElemementById('osk');	//osk ausblenden wenn Kalender geöffnet wird
}