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

async function initVisu() {
	if (!LOCALE) {
		document.querySelector(`.lockStatus`).style.display = `none`;
	}
	const visudata = await getVisuData(DEPLOYED_VISU_FILE);
	DrawVisu(visudata);
	switchVisuTab(visudata);
	reAlignRotatedLinkBtns();

	const liveDataRaw = await fetchTxt(LIVE_DATA_URL);
	if (updateConnectionStatus(!!liveDataRaw)) {
		const liveData = parseLiveData(liveDataRaw);
		updateLiveDataElements(liveData.items);
	}
}

async function reloadVisuLiveData() {
	const rawvisuData = await fetchTxt(LIVE_DATA_URL);
	if (updateConnectionStatus(!!rawvisuData)) {
		const liveData = parseLiveData(rawvisuData);

		const mpcTimeStamp = document.querySelector(`.mpcTimeStamp`);
		if (!!liveData) {
			updateLiveDataElements(liveData.items);
			mpcTimeStamp.innerText = `MPC Zeit: ${liveData.date.toLocaleString(`de-DE`)}`;
		}
		mpcTimeStamp.classList.toggle(`errorHighlighter`, (Math.abs(liveData.date - new Date()) > MAX_TIME_DELTA_MPC_MS));
	}
}

async function getVisuData(deployedVisuFile) {
	const visudata = await fetchJSON(deployedVisuFile);
	if (updateConnectionStatus(!!visudata)) {
		visudata.FreitextList.forEach(el => {
			el.BgColor = (el.BgColor.match(/(#BEBEBE)|(#E0E0E0)|(transparent)/)) ? undefined : el.BgColor;
		});		
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
			el.msrItem.bgColor = (el.BgColor.match(/(#BEBEBE)|(#E0E0E0)|(transparent)/)) ? undefined : el.BgColor;
			el.msrItem.icon = el.Symbol;
			el.msrItem.iconFeature = el.SymbolFeature.replace(`gruen`, `green`).replace(`rot`, `red`).replace(`unsichtbar`, ``).replace(`blinkend`, ``).trim();		
			el.msrItem.animation = (el.Symbol.match(/(Feuer)/)) ? `flicker` :
								(el.Symbol.match(/(Lueftungsklappe)|(Abluftklappe)/)) ? `rotate` :
								(el.Symbol.match(/(Led)|(Schalter)/)) ? `toggleIcon` :
								(el.Symbol.match(/(Pumpe)|(BHKW)|(Luefter)/)) ? `spin` :
								(!el.Symbol.match(/(fpButton)|(Heizkreis)/)) ? `show` :
								undefined;
			el.msrItem.animation = (el.SymbolFeature.includes(`blinkend`)) ? `${el.msrItem.animation} blink` : el.msrItem.animation;
			
			el.msrItem.rotation = (el.SymbolFeature.match(/(Rechts)/i)) ? 180 :
								(el.SymbolFeature.match(/(Oben)/i)) ? 90 :
								(el.SymbolFeature.match(/(Unten)/i)) ? 270 :
								0;
			
			el.msrItem.trueTxt = (el.Symbol.match(/(Absenkung)/i)) ? `Nacht` :
								(el.Symbol.match(/(Freitext)/i)) ? (el.SymbolFeature.startsWith(`!`)) ? `` : el.SymbolFeature :
								undefined;
			el.msrItem.falseTxt = (el.Symbol.match(/(Absenkung)/i)) ? `Tag` :
								(el.Symbol.match(/(Freitext)/i)) ? (el.SymbolFeature.startsWith(`!`)) ? el.SymbolFeature : `` :
								undefined;
			
			el.msrItem.alarms = {};
			el.msrItem.alarms.H = {};
			el.msrItem.alarms.HH = {};
			el.msrItem.alarms.L = {};
			el.msrItem.alarms.LL = {};
			el.msrItem.alarms.H.msr = (el.msrItem.identifyer === `GA`) ? `GR2` : undefined;
			el.msrItem.alarms.HH.msr = (el.msrItem.identifyer === `GA`) ? `GR3` : undefined;
			el.msrItem.alarms.L.msr = (el.msrItem.msr === `AI32`) ? `GR1` : undefined;
		});
	}

	//console.log(visudata);
	return visudata
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
	if (alarms) {
		const result = [];
		alarms.forEach(alarm => {
			const object = alarm.match(/(?<id>\d+)(?<txt>.+)/).groups;
			object.txt = object.txt.trim();
			result.push(object);
		});
		return result;
	}
}

function parseHKnames(liveDataRaw) {
	const names = liveDataRaw.match(/(HKNA\s*\d+.{20})/g);
	if (names) {
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
}				

function parseFaceplateBtns(liveDataRaw) {
	const data = liveDataRaw.match(/[A-UW-Z][A-Z]+\s*\d+,\s*(CLICK)\d*/g);
	if (data) {
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
}

function parseMSRdata(liveDataRaw) {
	const msrData = liveDataRaw.match(/[A-Z]+\s*\d+,\d,[\s\d]{2}\s*-*\d+\.*\d*/g);
	if (msrData) {
		const result = [];
		msrData.forEach(msrDataset => {
			const msrObject = msrDataset.match(/(?<Bezeichnung>[A-Z]+)\s*(?<Kanal>\d+),(?<decPlace>\d),(?<iEinheit>[\s\d]{2})\s*(?<Wert>-*\d+\.*\d*)/).groups;
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
}

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

function createIcon(msrItem) {
	const htmlElType = (msrItem.icon.match(/(Led)|(Feuer)|(Schalter)/)) ? `div` :
					   (msrItem.icon.match(/(fpButton)|(Heizkreis)/)) ? `input` :
					   `canvas`;
	const htmlEl = document.createElement(htmlElType);
	htmlEl.classList.add(`visuElement`);
	htmlEl.setAttribute(`msr`, msrItem.msr);
	if (msrItem.animation) {
		htmlEl.setAttribute(`animation`, msrItem.animation);
	}
	if (msrItem.rotation) {
		htmlEl.setAttribute(`rotation`, msrItem.rotation);
	}
	htmlEl.setAttribute(`faceplate`, msrItem.faceplate);
	htmlEl.setAttribute(`tab-idx`, msrItem.tabIdx);
	htmlEl.title = msrItem.title;

	//console.log(msrItem.icon, {htmlElType});
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
		ctx.lineWidth = 2;
		htmlEl.width = 3 + 4 + 2 * ctx.lineWidth;
		htmlEl.height = 2 * (4 + ctx.lineWidth);

		ctx.translate(htmlEl.width/2, htmlEl.height/2);
		ctx.strokeStyle = "black";
		ctx.fillStyle = "black";
		
		ctx.beginPath();
		ctx.fillRect(0, -2, 3, 4);
		ctx.moveTo(0, 4);
		ctx.lineTo(-4, 0);
		ctx.lineTo(0, -4);
		ctx.fill();
		/*
		ctx.translate(-22, 0);
		ctx.fillRect(0, -2, 3, 4);
		ctx.moveTo(0, 4);
		ctx.lineTo(-4, 0);
		ctx.lineTo(0, -4);
		ctx.fill();
		*/
	}
	else if (msrItem.icon === `Schalter`) {
		htmlEl.classList.add(`switch`);
		[`falseIcon`, `trueIcon`].forEach(className => {
			const canvas = document.createElement(`canvas`);
			htmlEl.appendChild(canvas);
			canvas.classList.add(className);
			const ctx = canvas.getContext(`2d`);
			ctx.lineWidth = 2;
			htmlEl.width = 40 + 2 * ctx.lineWidth;
			htmlEl.height = htmlEl.width;

			ctx.translate(htmlEl.width/2, htmlEl.height/2);
			ctx.strokeStyle = "black";
			ctx.beginPath();
			ctx.moveTo(-20, 0);
			ctx.lineTo(-10, 0);
			const y = (className === `trueIcon`) ? -3 : -15;
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
		colors.forEach((color, idx) => {
			if (color) {
				const canvas = document.createElement(`canvas`);
				htmlEl.appendChild(canvas);
				canvas.classList.add(`${(idx) ? `trueIcon` : `falseIcon`}`);
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
		if (ctx) {
			const outerRadius = 20;
			const innerRadius = 7;
			const deltaRadius = outerRadius - innerRadius;
			const lineWidth = 5;
			const {PI} = Math;

			htmlEl.width = 2 * (outerRadius + lineWidth);
			htmlEl.height = htmlEl.width;
			ctx.lineWidth = lineWidth;

			ctx.translate(htmlEl.width/2, htmlEl.height/2);
			ctx.scale(.6, .6);
			ctx.strokeStyle = "black";
			ctx.fillStyle = 'black';

			/*AUTO
			ctx.beginPath();
			ctx.arc(0, 0, innerRadius, 0, 2 * PI);
			ctx.stroke();
			//ctx.lineTo(0,0)
			ctx.beginPath();
			ctx.arc(-(deltaRadius)/2, -(deltaRadius)/3, deltaRadius, 0, PI, true);
			ctx.stroke();
			ctx.beginPath();
			ctx.rotate(2/3*PI);
			ctx.arc(-(deltaRadius)/2, -(deltaRadius)/3, deltaRadius, 0, PI, true);
			ctx.stroke();
			ctx.beginPath();
			ctx.rotate(2/3*PI);
			ctx.arc(-(deltaRadius)/2, -(deltaRadius)/3, deltaRadius, 0, PI, true);
			ctx.stroke();
			*/

		}
		else {
			htmlEl.type = `button`;
			htmlEl.classList.add(`faceplateBtn`);		
			htmlEl.addEventListener(`click`, openFaceplate);
		}
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
	vimgArea.setAttribute(`tab-idx`, targetTabIdx);
	//console.log(visudata);
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
		if (msrItem.alarms) {
			Object.entries(msrItem.alarms).forEach(([alarmType, val]) => {
				if (val.msr) {
					msrLbl.setAttribute(val.msr.toLowerCase(), alarmType);
				}
			});
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
		const htmlElements = document.querySelectorAll(`[msr = ${item.msr}]`);
		if (htmlElements) {
			htmlElements.forEach(el => {
				//console.log(el);
				if (el.matches(`[animation]`)) {
					el.classList.toggle(`animate`, !!item.Wert);
				}
				else if (el.matches(`.faceplateBtn`)) {
					el.style.background = `center / contain no-repeat url(/Images/FaceplateBtns/${(!!item.Wert) ? 'Hand_inet.png' : 'Auto.png'}) ${(!!item.Wert) ? YELLOW_HSL : BG_COLOR}`;
					//el.classList.toggle(`btnHand`, !!item.Wert);
					//el.classList.toggle(`btnAuto`, !item.Wert);
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
					const txt = (item.Bezeichnung.trim() === `HKNA`) ? item.sWert : item.Wert.toFixed(decPlace);
					el.innerText = `${txt} ${unit}`;
				}
			});
		}
	});

	//Check for Alarms and highlight
	const grenzwerte = liveDataItems.filter(el => el.Bezeichnung.trim() === `GR`);
	grenzwerte.forEach(grenzwert => {
		const grenzwertMSR = grenzwert.msr.toLowerCase();
		document.querySelectorAll(`[${grenzwertMSR}]`).forEach(htmlEl => {
			htmlEl.classList.toggle(`HHalarmHighlighter`, (htmlEl.matches(`[${grenzwertMSR} = HH]`) && parseFloat(htmlEl.innerText) > grenzwert.Wert));
			htmlEl.classList.toggle(`HalarmHighlighter`, (htmlEl.matches(`[${grenzwertMSR} = H]`) && parseFloat(htmlEl.innerText) > grenzwert.Wert));
			htmlEl.classList.toggle(`LalarmHighlighter`, (htmlEl.matches(`[${grenzwertMSR} = L]`) && parseFloat(htmlEl.innerText) < grenzwert.Wert));
			htmlEl.classList.toggle(`LLalarmHighlighter`, (htmlEl.matches(`[${grenzwertMSR} = LL]`) && parseFloat(htmlEl.innerText) < grenzwert.Wert));
		});
	});
}

function reAlignRotatedLinkBtns() {
	//rotation- & reposition-Handling due to different rotationPoints of htmlEl & canvas(old)
	document.querySelectorAll(`[verweis-ausrichtung]`).forEach(rotatedBtn => {
		const rotatedBtnBox = rotatedBtn.getBoundingClientRect();
		const x = parseInt(rotatedBtn.style.left);
		const y = parseInt(rotatedBtn.style.top);
		//console.log(rotatedBtnBox, x, y);
		rotatedBtn.style.left = `${x - rotatedBtnBox.width/2}px`;
		rotatedBtn.style.top = `${y - rotatedBtnBox.height}px`;
		const verweisAusrichtung = rotatedBtn.getAttribute(`verweis-ausrichtung`);
		const rotation = (verweisAusrichtung === `up`) ? 270 :
						 (verweisAusrichtung === `dn`) ? 90 :
						 undefined;
		rotatedBtn.removeAttribute(`verweis-ausrichtung`);
		rotatedBtn.setAttribute(`rotation`, rotation);
	});
}

// Aufruf Funktion
function drawTextList(visudata) {
	visudata.FreitextList.forEach(txtEl => {
		const vimgArea = document.querySelector(`#vimgArea`);
		const htmlEl = document.createElement(`${(txtEl.isVerweis) ? 'input' : 'label'}`);
		vimgArea.appendChild(htmlEl);
		htmlEl.classList.add(`visuElement`);
		htmlEl.setAttribute(`tab-idx`, txtEl.bmpIndex);
		htmlEl.style.font = txtEl.font;
		htmlEl.style.color = txtEl.Color;
		htmlEl.style.background = txtEl.BgColor;

		const paddingAsPx = (txtEl.isVerweis) ? 6 : 0;
		htmlEl.style.left = `${txtEl.x - paddingAsPx}px`;
		htmlEl.style.top = `${txtEl.y - parseInt(txtEl.font) - paddingAsPx}px`;
		if (txtEl.VerweisAusrichtung && txtEl.VerweisAusrichtung.match(/(up)|(dn)/)) {
			//rotationHandling is outsourced to reAlignRotatedLinkBtns() bc rendering seems not completed here, so repositioning would fail
			htmlEl.setAttribute(`verweis-ausrichtung`, txtEl.VerweisAusrichtung);
		}
		
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

async function visuBtnClickEventHandler(ev) {
	document.body.setAttribute(`cursorStyle`, `progress`);
	const link = ev.target.getAttribute(`link`);
	const linkBgIdx = parseInt(link);
	if (Number.isNaN(linkBgIdx)) {
		const modal = document.querySelector(`.modalBg`);
		modal.querySelector(`.modalFooter`).classList.add(`hidden`);
		
		const content = modal.querySelector(`.modalContent`);
		content.classList.toggle(`alarms`, link === `alarms`);
		
		const textarea = modal.querySelector(`textarea`);
		textarea.classList.remove(`displayNone`);
		const h3 = content.querySelector(`h3`);

		
		if (link === `alarms`) {
			const liveDataRaw = await fetchTxt(LIVE_DATA_URL);
			updateConnectionStatus(!!liveDataRaw);
			h3.innerText = `Aktuelle Störungen:`;
			const alarms = parseAlarms(liveDataRaw).map(alarm => `${alarm.id.padStart(3, ` `)}   ${alarm.txt}`);
			//console.log(alarms);
			const alarmTxt = (alarms.length) ? alarms.toString().replaceAll(`,`, `\r`) : `keine anstehenden Störungen`;
			textarea.setAttribute(`rows`, alarms.length);
			const columnCount = Math.max(...alarmTxt.split(`\r`).map(el => el.length));
			textarea.setAttribute(`cols`, columnCount);
			textarea.value = alarmTxt;
		}
		else if (link === `counter`) {
			const projectName = await updateProjectName(getSteuerungNameUrl);
			h3.innerText = `Zähler: ${projectName}`;//\n${date.toLocaleString(`de-DE`)}`;

			const counterRawData = await fetchTxt(COUNTER_URL);
			if (updateConnectionStatus(!!counterRawData)) {
				const rows = counterRawData.split(`\r`);
				const rowCount = rows.length;
				const columnCount = Math.max(...rows.map(el => el.length));
				const headerRow = rows.shift();
				const date = parseDate(headerRow);
				textarea.setAttribute(`rows`, rowCount);
				textarea.setAttribute(`cols`, columnCount);
				textarea.value = `${counterRawData.replace(`${ESC}${ESC}D4`,``).replace(`${headerRow}\r`,``)}\r(Stand: ${date.toLocaleString(`de-DE`)})`;
			}
			else {
				textarea.value = `Keine Zählerdaten verfügbar`;
			}
		}
		else if (link === `counterArchive`) {
		}
		else if (link === `IPcamera`) {
		}
		modal.classList.remove(`hidden`);
	}
	else {		
		const bgIdx = parseInt(document.querySelector(`#vimgArea`).getAttribute(`tab-idx`));
		if (bgIdx !== parseInt(link)) {
			const visudata = await getVisuData(DEPLOYED_VISU_FILE);
			switchVisuTab(visudata, parseInt(link));
		}	
	}
	document.body.removeAttribute(`cursorStyle`);
}

async function modalBgClickEventHandler(ev) {
	//console.log(ev.target);
	//confirm
	if (ev.target.matches(`.modalFooterConfirmBtn`)) {
		if (document.querySelector(`.pinInputContainer:not(.displayNone)`)) {
			//pinModal
			const validityState = await validateVisuPin();
			if (validityState.valid) {
				closeModal();
			}	
		}
		else if (document.querySelector(`.modalBody .controlGroup`)) {
			//faceplate
			faceplateConfirmHandler();
			closeModal();
		}
	}

	//cancel
	if (ev.target.matches(`.close, .modalFooterCancelBtn`)) {
		closeModal();
	}	
}
function closeModal() {
	document.querySelector(`#inputPin`).value = ``;
	const modalBg = document.querySelector(`.modalBg`);
	modalBg.classList.add(`hidden`);
	modalBg.querySelector(`.modalContent`).classList.remove(`alarms`);
	modalBg.querySelectorAll(`.modalBody > *`).forEach(modalBodyChild => modalBodyChild.classList.add(`displayNone`));
	modalBg.querySelector(`.modalFooter`).classList.remove(`hidden`);
	destroyFaceplateElements(`fieldset`, `.calenderContainer`);
	hideOsk();
}
async function validateVisuPin() {
	const hash = await fetchTxt(HASH_FILE_URL);
	updateConnectionStatus(!!hash);
	const inputPin = document.querySelector(`#inputPin`);
	const isUnlocked = updateLockStatus((md5(inputPin.value) === hash));
	inputPin.setCustomValidity((isUnlocked) ? `` : `Pin Inkorrekt!`);
	inputPin.reportValidity();
	return inputPin.validity;
}
function updateLockStatus(unlock) {
	const lockStatus = document.querySelector(`.lockStatus`);
	lockStatus.unlocked = !!unlock;
	lockStatus.innerText = (unlock) ? `unlocked` : `locked`;
	lockStatus.classList.toggle(`errorHighlighter`, !unlock);
	lockStatus.timerVisuLock = (unlock) ? setTimeout(updateLockStatus, AUTOLOCK_TIMEOUT) : clearTimeout(lockStatus.timerVisuLock);
	return unlock;
}
function visuLockClickEventHandler(ev) {
	const lockStatus = document.querySelector(`.lockStatus`);
	if (lockStatus.unlocked) {
		updateLockStatus(!lockStatus.unlocked);
	}
	else {	
		const h3 = document.querySelector(`.modalHeader h3`);
		h3.innerText = `Unlock Visu`;
		document.querySelector(`.modalFooterConfirmBtn`).removeAttribute(`disabled`);
		const modalBg = document.querySelector(`.modalBg`);
		modalBg.querySelector(`.pinInputContainer`).classList.remove(`displayNone`);
		hidePinHandler();	
		modalBg.classList.remove(`hidden`);
		document.querySelector(`#inputPin`).focus();
	}
}
function hidePinHandler() {
	const hidePin = document.querySelector(`#cbHidePin`).checked;
	const inputPin = document.querySelector(`#inputPin`);
	inputPin.type = (hidePin) ? `password` : `text`;
}
function pinInputEventHandler(ev) {
	//console.log(`pinInputEventHandler`);
	if (ev.target.value.length === parseInt(ev.target.getAttribute(`maxlength`))) {
		document.querySelector(`.modalFooterConfirmBtn`).focus();
	}
}
function destroyFaceplateElements(...elTypes) {
	const modalBody = document.querySelector(`.modalBody`);
	modalBody.querySelectorAll(elTypes.toString()).forEach(faceplateEl => faceplateEl.remove());
}

function faceplateConfirmHandler() {
	const faceplateReturnDataMap = new Map();
	const rtosKeyOffset = 20;
	const modalBg = document.querySelector(`.modalBg`);
	for (let i = 70; i <= 89; i++) {
		const rtosKey = `v${i.toString().padStart(3, `0`)}`;
		const rtosOffsetKey = `v${(i+rtosKeyOffset).toString().padStart(3, `0`)}`;
		faceplateReturnDataMap.set(rtosOffsetKey, modalBg.verifyedFaceplateDataRaw[rtosKey]);
	}
	modalBg.filteredFaceplateDataRawMap.forEach((dataString, rtosKey) => {
		const formatIndicator = dataString.slice(-1);
		if (formatIndicator.match(/(H)|(S)/) || rtosKey === `v070`) {
			//ignore TextLines!
		}
		else {
			const enabledSlider = modalBg.querySelector(`.controlGroup[rtos-key=${rtosKey}] [type=range]:not(input:disabled)`);
			const activeBA = (enabledSlider) ? undefined : modalBg.querySelector(`.controlGroup[rtos-key*=${rtosKey}] input:checked`);
			const value = (enabledSlider) ? enabledSlider.valueAsNumber :
						  (activeBA) ? BAtoInt(activeBA.value) :
						  0;

			const nameAreaEndIdx = 24;
			const wertAreaEndIdx = nameAreaEndIdx + 12;
			const name = dataString.slice(0, nameAreaEndIdx);
			const wert = parseFloat(value).toFixed(4).padStart(10).padEnd(12);
			const rest = dataString.slice(wertAreaEndIdx);

			const rtosOffsetIdx = parseInt(rtosKey.match(/\d+/)) + rtosKeyOffset;
			faceplateReturnDataMap.set(`v${rtosOffsetIdx.toString().padStart(3, `0`)}`, `${name}${wert}${rest}`);
			
			//console.log(modalBg.verifyedFaceplateDataRaw[rtosKey]);
			//console.log(faceplateReturnDataMap.get(`v${rtosOffsetIdx.toString().padStart(3, `0`)}`));
		}
	});
	
	const responsePromises = [];
	faceplateReturnDataMap.forEach((dataString, rtosKey) => {
		const url = `${mpcJsonPutUrl}${rtosKey}=${encodeURIComponent(dataString)}`;
		responsePromises.push(fetchJSON(url));
	});
	Promise.all(responsePromises).then(responses => {
		Object.entries(responses).forEach(([idx, responseObject]) => {
			if (responseObject.result !== `OK`) {
				console.warn(`v${(parseInt(idx) + 70).toString().padStart(3, `0`)}: ${responseObject.result}`);
			}
		})
	});
}


//ehemals VisuView_Bedienung_gemeinsam.js
function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}
async function asyncTimeout(fn, delay, ...args) {
    await timeout(delay);
    return fn(...args);
}

async function openFaceplate(ev) {
	document.body.setAttribute(`cursorStyle`, `progress`);

	const faceplateId = ev.target.getAttribute(`faceplate`);
	const faceplateRequestUrl = `${mpcJsonPutUrl}V008=Qz${faceplateId}`;
	//request corresponding FaceplateData from MPC
	const response = await fetchJSON(faceplateRequestUrl);
	updateConnectionStatus(!!response);
	//console.log(response);

	//get Data from MPC after Timeout (500ms)
	const faceplateDataRaw = await asyncTimeout(fetchJSON, 500, FACEPLATE_DATA_URL);
	//console.log(faceplateDataRaw);
	//if DataHeader incorrect get Data again from MPC after Timeout (500ms)
	const verifyedFaceplateDataRaw = (faceplateDataRaw.v070.startsWith(faceplateId)) ? faceplateDataRaw : await asyncTimeout(fetchJSON, 500, FACEPLATE_DATA_URL)

	//refine Data anyways
	const faceplateData = Object.entries(verifyedFaceplateDataRaw).filter(([key, value]) => value.trim() && value.trim() !== `X`);
	//console.log(faceplateData);
	if (faceplateData && faceplateData.at(0).at(1).startsWith(faceplateId)) {
		const nameAreaEndIdx = 24;
		const fpVarObjects = [];
		faceplateData.forEach(([key, value]) => {
			const fpVarObj = {};
			fpVarObj.rtosKey = key;
			fpVarObj.formatIndicator = value.slice(-1);
			if (key === `v070` && Number.isNaN(parseFloat(value.slice(nameAreaEndIdx, -1))) && !fpVarObj.formatIndicator.trim()) {
				//Kompatibilität zu alten Projekten ohne formatIndicator
				fpVarObj.formatIndicator = `H`;
			}

			if (fpVarObj.formatIndicator === `H`) {
				fpVarObj.name = value.slice(0, nameAreaEndIdx).trim();
				fpVarObj.wert = value.slice(nameAreaEndIdx, -1).trim();
			}
			else if (fpVarObj.formatIndicator === `S`) {
				fpVarObj.name = value.slice(0, -1).trim();
			}
			else {
				const wertAreaEndIdx = nameAreaEndIdx + 12;
				const maxAreaEndIdx = wertAreaEndIdx + 6;
				const minAreaEndIdx = maxAreaEndIdx + 6;
				const decPlaceEndIdx = minAreaEndIdx + 2;
				fpVarObj.name = value.slice(0, nameAreaEndIdx).replace(`&deg`, `°`).trim();
				fpVarObj.wert = parseFloat(value.slice(nameAreaEndIdx, wertAreaEndIdx));
				fpVarObj.maximum = parseFloat(value.slice(wertAreaEndIdx, maxAreaEndIdx));
				fpVarObj.minimum = parseFloat(value.slice(maxAreaEndIdx, minAreaEndIdx));
				fpVarObj.decPlace = parseFloat(value.slice(minAreaEndIdx, decPlaceEndIdx));
				fpVarObj.unit = value.slice(decPlaceEndIdx, -1).replace(`&deg`, `°`).trim();
				fpVarObj.range = (fpVarObj.maximum - fpVarObj.minimum + 1) * Math.pow(10, fpVarObj.decPlace);
			}
			
			//verschachtelte BA in Handwert -> Eintrag verdoppeln und auseinanderklamüsern!
			const fpBAvarObj = (fpVarObj.range === 101 || fpVarObj.range === 102) ? JSON.parse(JSON.stringify(fpVarObj)) : undefined;
			if (fpBAvarObj) {
				fpBAvarObj.rtosKey = `${key}BA`;
				fpBAvarObj.unit = ``;
				fpBAvarObj.rangeMap = new Map([[0, `Auto`], [`>=2`, `Hand`], [1, `Ein`]]);
				if (fpBAvarObj.minimum === -1) {
					fpBAvarObj.rangeMap.set(-1, `Aus`);
				}
				fpBAvarObj.wert = fpBAvarObj.rangeMap.get((fpBAvarObj.wert >= 2) ? `>=2` : fpBAvarObj.wert);//constrain(fpBAvarObj.wert, fpBAvarObj.minimum, fpBAvarObj.maximum);
				fpBAvarObj.minimum = undefined;
				fpBAvarObj.maximum = undefined;//2;
				fpBAvarObj.range = fpBAvarObj.rangeMap.size;//(fpBAvarObj.maximum - fpBAvarObj.minimum + 1) * Math.pow(10, fpBAvarObj.decPlace);
				
				fpVarObj.lblName = `Handwert`;
				fpVarObj.minimum = 2;
				fpVarObj.range = (fpVarObj.maximum - fpVarObj.minimum + 1) * Math.pow(10, fpVarObj.decPlace);
				fpVarObj.wert = constrain(fpVarObj.wert, fpVarObj.minimum, fpVarObj.maximum);
				fpVarObj.BA = fpBAvarObj.wert;
				//console.log(fpBAvarObj, fpVarObj);
			}		
			fpVarObjects.push(fpVarObj);
			if (fpBAvarObj) {
				fpVarObjects.push(fpBAvarObj);
			}
		});
		//console.log(fpVarObjects);
		buildFaceplate(fpVarObjects);
		const modalBg = document.querySelector(`.modalBg`)
		modalBg.classList.remove(`hidden`);
		modalBg.verifyedFaceplateDataRaw = verifyedFaceplateDataRaw;
		modalBg.filteredFaceplateDataRawMap = new Map(faceplateData);
		//console.log(modalBg.filteredFaceplateDataRawMap);
	}
	else {
		alert(`timeout`);
	}
	document.body.removeAttribute(`cursorStyle`);
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
	const {value, min, max, disabled, maxColor, classList} = target;
	const percentVal = (value - min) / (max - min) * 100;
	const minColor = (disabled) ? BG_COLOR : target.minColor;
	const currentColor = (disabled) ? BG_COLOR : calcColor(percentVal, minColor, maxColor);
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
	
	target.style.background = `linear-gradient(to right, ${minColor} 0%, ${currentColor} ${percentVal}%, #E0E0E0 ${percentVal}%, #E0E0E0 100%)`;
}

function BAbtnEventHandler(ev) {
	const rtosKey = ev.target.closest(`[rtos-key]`).getAttribute(`rtos-key`).replace(`BA`,``);
	const sliderControlGroup = document.querySelector(`.controlGroup[rtos-key = ${rtosKey}]`);
	sliderControlGroup.querySelectorAll(`input`).forEach(inputEl => inputEl.toggleAttribute(`disabled`, (ev.target.value !== `Hand`)));
	document.querySelector(`.lblUnit[rtos-key = ${rtosKey}]`).classList.toggle(`hidden`, (ev.target.value !== `Hand`));
}
function sliderHandler(target) {
	//sliderStyling(target);
	const rtosKey = target.closest(`[rtos-key]`).getAttribute(`rtos-key`);
	const lblUnit = document.querySelector(`.lblUnit[rtos-key=${rtosKey}]`);
	lblUnit.innerText = `${target.valueAsNumber.toFixed(-Math.log10(target.step))} ${lblUnit.getAttribute(`unit`)}`;
}
function sliderAdjustValueBtnEventHandler(ev) {
	const {type, target} = ev;
	if (type.match(/(touchstart)/))
		ev.preventDefault();
	if (!target.timerBtnPressed && type.match(/(mousedown|touchstart)/)) {
		target.timerBtnPressed = setInterval(sliderAdjustValueBtnHandler, 100, target);
	}
	else if (target.timerBtnPressed){
		clearInterval(target.timerBtnPressed);
		target.timerBtnPressed = undefined;
	}
}
function sliderAdjustValueBtnHandler(target) {
	const slider = target.closest(`.controlGroup`).querySelector(`[type=range]`);
	slider.valueAsNumber += target.wert;
	sliderHandler(slider);
}

function createControlGroup(el) {
	//console.log(el);
	const {rtosKey, name, wert, maximum, minimum, decPlace, range, rangeMap, unit, BA} = el;
	//zu erzeugende Elemente auf Basis der Range ermitteln:
	
	//div mit ID=rtosVariable erzeugen & anhängen (return object)
	//Inputelemente (btns, slider, number, etc.) erzeugen & anhängen
	const controlGroup = document.createElement(`div`);
	controlGroup.classList.add(`controlGroup`);
	controlGroup.setAttribute(`rtos-key`, rtosKey);
	controlGroup.setAttribute(`range`, range); //setAttribute `range` for layout
	
	if (rangeMap) {
		//BAbtns for sliderBtnCombo
		rangeMap.forEach(name => {
			const radioBtn = document.createElement('input');		
			controlGroup.appendChild(radioBtn);
			radioBtn.type = `radio`;
			radioBtn.name = `BAradioGroup${rtosKey}`;
			radioBtn.classList.add(`radioBtn${name}`);
			radioBtn.title = `${name}${(name === `Ein`) ? ' (Sollw. intern)' : ''}`;
			radioBtn.value = name;
			radioBtn.checked = (wert === name);
			radioBtn.addEventListener(`change`, BAbtnEventHandler);
		});
	}
	else if (range === 2) {			
		//createTriggerBtn (Einmalig...)
		if (name.match(/(einmalig)\s*(ein|aus)(schalten)/i)) {
			const radioBtn = document.createElement('input');
			controlGroup.appendChild(radioBtn);
			radioBtn.type = `radio`;
			radioBtn.classList.add(`radioBtn${(name.match(/(ausschalten)/i)) ? `Aus` : `Ein`}`);
			radioBtn.name = `triggerBtnOnOff`;
			radioBtn.checked = !!wert;
		}
		else {
			const checkbox = document.createElement('input');
			controlGroup.appendChild(checkbox);
			checkbox.type = `checkbox`;
			checkbox.checked = !!wert;
		}
	}
	else if (range === 3 && minimum === 0) {
		//KalenderBtn
		const btn = document.createElement('input');
		controlGroup.appendChild(btn);
		btn.type = `button`;
		btn.classList.add(`calenderBtn`);
		btn.wert = (document.querySelector(`.lockStatus`).unlocked) ? 1 : 2;
		btn.value = 'zum Kalender';
		btn.title = `Absenkungswochenkalender öffnen${(document.querySelector(`.lockStatus`).unlocked) ? '' : ' (schreibgeschützt)'}`;
		btn.addEventListener(`click`, switchToCalender);
	}
	else if ((range === 3 || range === 4) && minimum === -1) {
		//Betriebsart(BA)-Btns (Mischer/Ventile)
		const nameArray = (range === 3) ? [`Auto`, `Ein`, `Aus`] : [`Auto`, `Auf`, `Zu`, `Stopp`];
		nameArray.forEach(name => {
			const radioBtn = document.createElement('input');		
			controlGroup.appendChild(radioBtn);
			radioBtn.type = `radio`;
			radioBtn.name = `BAradioGroup${rtosKey}`;
			radioBtn.classList.add(`radioBtn${name}`);
			radioBtn.title = name;
			radioBtn.value = name;
			radioBtn.checked = (wert === BAtoInt(name));
		});
	}	
	else if (range > 4) {
		const slider = document.createElement('input');
		controlGroup.appendChild(slider);
		slider.type = `range`;
		slider.step = Math.pow(10, -decPlace);
		slider.value = wert;
		slider.min = minimum;
		slider.minColor = CYAN_HEX;
		slider.max = maximum;
		slider.maxColor = (unit === `°C`) ? MAGENTA_HEX : CYAN_HEX;
		slider.toggleAttribute(`disabled`, (!!BA && (BA !== `Hand`)));
		slider.addEventListener(`input`, (ev) => sliderHandler(ev.target));
		
		//+&-Buttons neben Slider erzeugen
		[`-`, `+`].forEach(btnTxt => {
			const sliderBtn = document.createElement('input');
			sliderBtn.type = 'button';
			controlGroup.insertBefore(sliderBtn, (btnTxt === `-`) ? slider : null);
			sliderBtn.classList.add(`sliderBtn`);
			sliderBtn.classList.add((btnTxt === `+`) ? `btnInc` : `btnDec`);
			sliderBtn.toggleAttribute(`disabled`, slider.hasAttribute(`disabled`));
			sliderBtn.value = btnTxt;
			sliderBtn.wert = (btnTxt === `+`) ? parseFloat(slider.step) : parseFloat(-slider.step);
			sliderBtn.addEventListener(`mousedown`, sliderAdjustValueBtnEventHandler);
			sliderBtn.addEventListener(`mouseup`, sliderAdjustValueBtnEventHandler);
			sliderBtn.addEventListener(`mouseout`, sliderAdjustValueBtnEventHandler);
			sliderBtn.addEventListener(`touchstart`, sliderAdjustValueBtnEventHandler);
			sliderBtn.addEventListener(`touchend`, sliderAdjustValueBtnEventHandler);
			sliderBtn.addEventListener(`touchcancel`, sliderAdjustValueBtnEventHandler);
		});
	}
	
	return controlGroup;
}

function buildFaceplate(fpVarObjects) {
	document.querySelector(`.modalFooterConfirmBtn`).toggleAttribute(`disabled`, !document.querySelector(`.lockStatus`).unlocked);

	fpVarObjects.forEach(fpVarObj => {
		const {name, lblName, wert, unit, decPlace, rtosKey, formatIndicator} = fpVarObj;
		const legendTxt = (formatIndicator === `S`) ? name :
						  (rtosKey.includes(`BA`)) ? undefined :
						  (name.match(/(Betriebsart)|([kK]alender)|(Tagbetrieb)/)) ? name :
						  (name.includes(`NennVL`)) ? `Parameter Heizkurve` :
						  (name.includes(`20 &degC`)) ? `Pumpenkennlinie\n(nach Außentemperatur)` :
						  (name.includes(`Tagbetrieb`)) ? `Partytaster` :
						  undefined;
		
		if (fpVarObj.formatIndicator === `H`) {
			document.querySelector(`.modalHeader h3`).innerText = `Einstellungen für ${wert}`;
		}
		else {
			if ((!document.querySelector(`.modalBody fieldset:last-child > div`)) || legendTxt) {
				//create 'n' init fieldset
				const newFieldset = document.createElement('fieldset');
				document.querySelector('.modalBody').appendChild(newFieldset);
				const fieldsetGridContainer = document.createElement(`div`);	//fieldsetContainer needed bc gridLayout fails for fieldsetEl´s
				newFieldset.appendChild(fieldsetGridContainer);
				fieldsetGridContainer.classList.add(`faceplateFieldsetGridContainer`);
				if (legendTxt) {
					newFieldset.setAttribute(`legend`, legendTxt);
					const legend = document.createElement(`legend`);
					newFieldset.insertBefore(legend, fieldsetGridContainer);
					legend.innerText = legendTxt;
				}
			}
		
			const fieldsetContainer = document.querySelector(`.modalBody fieldset:last-child > div`);
			const controlGroup = createControlGroup(fpVarObj);
			fieldsetContainer.appendChild(controlGroup);
			//create & append faceplate Lbls
			[`lblName`, `lblUnit`].forEach(classname => {
				const lbl = document.createElement('label');
				fieldsetContainer.insertBefore(lbl, (classname === `lblName`) ? controlGroup : null);
				lbl.classList.add(classname);
				lbl.setAttribute(`rtos-key`, rtosKey);
				const slider = controlGroup.querySelector(`[type=range]`);
				lbl.innerText = (classname === `lblName`) ? ((lblName) ? lblName : name) :
								(unit && unit !== `3P`) ? `${(slider) ? slider.valueAsNumber.toFixed(decPlace) : wert.toFixed(decPlace)} ${unit}` :
								``;
				if (classname === `lblUnit`) {
					lbl.setAttribute(`unit`, unit);
					lbl.classList.toggle(`hidden`, (slider && slider.hasAttribute(`disabled`)));
				}
			});
		}
	});
}

function switchToCalender(ev) {
	document.body.setAttribute(`cursorStyle`, `progress`);
	const responsePromises = [];
	const rtosKeyOffset = 20;
	const calenderBtnRtosKey = ev.target.closest(`[rtos-key]`).getAttribute(`rtos-key`);
	const modalBg = document.querySelector(`.modalBg`);
	Object.entries(modalBg.verifyedFaceplateDataRaw).forEach(([requestRtosKey, requestDataString]) => {
		let dataString = requestDataString;
		if (requestRtosKey === calenderBtnRtosKey) {
			const calenderModeVal = (document.querySelector(`.lockStatus`).unlocked) ? 1 : 2;
			dataString = requestDataString.replace(`0`, calenderModeVal);
			console.log(dataString);
		}

		const rtosIdx = parseInt(requestRtosKey.match(/\d+/)) + rtosKeyOffset;
		const rtosKey = `v${rtosIdx.toString().padStart(3, `0`)}`;
		
		const url = `${mpcJsonPutUrl}${rtosKey}=${encodeURIComponent(dataString)}`;
		responsePromises.push(fetchJSON(url));
	});
	Promise.all(responsePromises).then(async responses => {
		Object.entries(responses).forEach(([idx, responseObject]) => {
			if (responseObject.result !== `OK`) {
				console.warn(`v${(parseInt(idx) + 70).toString().padStart(3, `0`)}: ${responseObject.result}`);
			}
		})
		await asyncTimeout(destroyFaceplateElements, 5000, `fieldset`, `.calenderContainer`);

		/*
		const calenderCanvas = document.querySelector(`.calenderCanvas`);
		calenderCanvas.classList.remove(`displayNone`);
		document.body.removeAttribute(`cursorStyle`);
		drawWeekCalender(calenderCanvas);
		*/
		document.body.removeAttribute(`cursorStyle`);
		const modalBody = document.querySelector(`.modalBody`);
		modalBody.appendChild(await createCalender());
	});
}




/*
async function createCalender(type = `week`) {
	const calenderDataRaw = await fetchJSON(kalenderUrl);
	console.log(calenderDataRaw);
	if (updateConnectionStatus(!!calenderDataRaw)) {
		//daten Aufbereiten: binaryString 10min Raster = 144Bits, separated in 2 rows => 72Bits/row
		let calenderData = [];
		Object.values(calenderDataRaw).toString().match(/\d{72}/g).forEach((row, idx, arr) => {
			if (idx % 2 !== 0) {
				//merge 2rows to 1 dayRow
				const binaryDayRow = `${arr.at(idx - 1)}${row}`;
				

				calenderData.push(binaryDayRow);
				
				const nightStartIdxs = [...binaryDayRow.matchAll(/(10)/g)].map(el => ({nightStartIdx: el.index + 1}));
				const dayStartIdxs = [...binaryDayRow.matchAll(/(01)/g)].map(el => ({dayStartIdx: el.index + 1}));
				const switchingPointIdxs = nightStartIdxs.concat(dayStartIdxs).sort((a, b) => Object.values(a) - Object.values(b));
				if (binaryDayRow.startsWith(`1`)) {
					switchingPointIdxs.splice(0, 0, {dayStartIdx: 0});
				}
				//(binaryDayRow.startsWith(`0`)) ? switchingPointIdxs.splice(0, 0, {nightStartIdx: 0}) : switchingPointIdxs.splice(0, 0, {dayStartIdx: 0}) ;
				
				console.log(binaryDayRow, nightStartIdxs, dayStartIdxs, switchingPointIdxs);

				
				switchingPointIdxs.forEach((switchingPointIdx, idx) => {
					const slider = document.createElement(`input`);
					document.body.appendChild(slider);
					slider.type = `range`;
					slider.classList.add(`calenderSlider`);
					slider.setAttribute(`idx`, idx);
					slider.min = 0;
					slider.max = 143;
					slider.step = 1;
					slider.value = Object.values(switchingPointIdx);
					//slider.addEventListener(`input`, calenderSliderEventHandler);
					//https://mikejolley.com/2019/08/02/building-a-cross-browser-compatible-multi-handle-range-slider/
					//https://projects.verou.me/multirange/
				});
			}
		});
		console.log(calenderData);
	}
}
*/

function BAtoInt(BAstring) {
	//Handwert & BA Kombi: [-1] = Aus, [0] = Auto, [1] = Ein + interner Sollwert
	//`on` is defaultValue for radio&checkboxEl...
	const BAmap = new Map([[`Auto`, 0], [`Hand`, `>=2`], [`Ein`, 1], [`Aus`, -1], [`Auf`, 1], [`Zu`, 2], [`Stopp`, -1], [`on`, 1]]);
	return BAmap.get(BAstring);
}