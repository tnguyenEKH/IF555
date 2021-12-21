var DEVMODE = false; //no Lock/AutoLock
var DEBUG = false;
var FORCE_ANALOGMISCHER = false;

var deployedVisuFile = "./Visu/Visu.txt";
var visuDataFile = "./DATA/visdat.txt";
var zahlerDataFile = "./DATA/zaehl.txt";
// Diverse globale Variablen
// Vorgehensweise analog zu der in VCO_Edit.aspx
var prj;
var IdVisu;
var vDynCanvas;
var vStatCanvas;
var vDynCtx;
var vStatCtx;
var visudata;
var bmpIndex = 0;
var VisuDownload = {};
var LinkButtonList = [];
var canvasOffset;
var canvasOffsetX;
var canvasOffsetY;
var requestDrawingFlag = false;
var bgColors = [];
var hasSymbolsFlag = false;
var vtipCanvas;
var tipvctx;
var tt_dots = []; // Liste der tooltips: Koordinate und Text and BitmapIndex
var waitReloadMS = 5000;
var nReloadCycles = 0;
var maxReloadCycles = 100;
var bAutoReload;
var ReloadTimerVar;
var showLog;
var hInit;
var wInit;
var startAngle = 1.1 * Math.PI;
var endAngle = 1.9 * Math.PI;
var stoerungen;
var stoerungText = "";
var xStoerButtonMin;
var yStoerButtonMin;
var xStoerButtonMax;
var yStoerButtonMax;
var xZaehlerButtonNeuMin;
var xZaehlerButtonNeuMax;
var yZaehlerButtonNeuMin;
var yZaehlerButtonNeuMax;
var match;



//Einstellungen Visualisierungen
const AUTOLOCK_TIMEOUT = 1200000; //20min
var locked = !DEVMODE;
var readParameterOfClickableElementUrl = 'http://172.16.0.102/JSONADD/GET?p=5&Var=all';   /*SettingsFromVisualisierung*/
var ClickableElement = [];		   /*SettingsFromVisualisierung*/
var ClickableElementList = [];	  /*SettingsFromVisualisierung*/
var ClickableElementUrlList = []; /*SettingsFromVisualisierung*/
var clickableElementUrl;
var currentID;
function copyToClip() {
	// Create new element
	var el = document.createElement('textarea');

	// Set value (string to be copied)
	el.value = document.getElementById("modalZaehler").innerText;

	// Set non-editable to avoid focus and move outside of view
	el.setAttribute('readonly', '');
	el.style = { position: 'absolute', left: '-9999px' };
	document.body.appendChild(el);
	// Select text inside element
	el.select();
	// Copy text to clipboard
	document.execCommand("copy");
	// Remove temporary element
	document.body.removeChild(el);
}


function getOnlinegesamtZaehler()
{
	res = readFromTextFile(zahlerDataFile);
    var resWithoutDate = res.substring(41);//27
	var index = resWithoutDate.lastIndexOf('\x1b\x1b\x44\x34');
	return resWithoutDate.substr(0, index -1);
}


function closeModalStoerung()
{
	var modal = document.getElementById('modalStoerung');
	var span = document.getElementById("closeModalStoerung");
	span.onclick = function () {
		modal.style.display = "none";
	}
}

function closeModalZaehler() {
	var modal = document.getElementById('modalZaehler');
	var span = document.getElementById("closeModalZaehler");
	span.onclick = function () {
		modalZaehler.style.display = "none";
	}
}

function initVisu()
{
	wInit = window.outerWidth;
	hInit = window.outerHeight;
	bAutoReload = false;
	
	vStatCanvas = document.getElementById('vStatCanvas');
	vStatCanvas.width = 1400;
	vStatCanvas.height = 630;
	vStatCtx = vStatCanvas.getContext('2d');
	
	vDynCanvas = document.getElementById('vDynCanvas');
	vDynCanvas.width = 1400;
	vDynCanvas.height = 630;
	vDynCtx = vDynCanvas.getContext('2d');

	// test listener for stoerung
	vStatCanvas.addEventListener("mousedown", getPosition, false);
	
	vtipCanvas = document.getElementById("vtipCanvas");
	vtipCanvas.width = 170;
	vtipCanvas.height = 25;
	vtipCanvas.style.left = "-2000px";
	tipvctx = vtipCanvas.getContext("2d");

	canvasOffset = $("body").offset(); //$("vinsideWrapper").offset();
	canvasOffsetX = canvasOffset.left;
	canvasOffsetY = canvasOffset.top + $(".tab").height() + 2 * parseInt($(".tab").css('border-bottom-width')) + parseInt($(".tab").css('margin-bottom'));	// + $(".tab").marginBottom;
	
	
	// Laden
	//Read deployed visufile /visu/visu.txt 
	visudata = $.parseJSON(readFromTextFile(deployedVisuFile));
	if (visudata != ''){
		prj = visudata.VCOData.Projektnumer;
	}
	else{
		prj = '';
	} 
		
	/*SettingsFromVisualisierung*/
	addClickableElementToList(visudata);			

	// Tooltips einlesen
	initTooltips();
	
	// Mouse-hover-handler für ToolTip dynamischer Elemente
	$("#vimgArea").mousemove(function (e) {
		handleMouseMove(e);
	});
	
	// Mouse-down-handler für bmp wechsel (statische Elemente)
	$("#vStatCanvas").mousedown(function (e) {
		handleMouseDown(e);
	});	
	setBitmap(bmpIndex);
}


function startVisu() {
	try {
		//read visudata from visdat.txt
		var rawvisuData = readFromTextFile(visuDataFile);
		//create visuitem from rawdata
		//remove all json parser coz lokale data tranfer
		createVisudata(rawvisuData);
		var Stoerungen = VisuDownload.Stoerungen;
		var stoerungencount = Stoerungen.length;
		stoerungText ="";
		for (var i = 0; i < stoerungencount; i++) {
			stoerungText += Stoerungen[i].BezNr + ". " + Stoerungen[i].StoerungText.trim() + "<br/>";
		}
	}
	catch (e) {
		log(e.message);
		log("Es konnten keine Visualisierungsdaten heruntergeladen werden von Steuerung " + prj);
	}	
	DrawVisu(true);
}


function createLinkForClickableElement(id) {
	try{
		var link = 'http://172.16.0.102/JSONADD/PUT?V008=Qz' +id ;
		ClickableElementUrlList.push(link);
	}
	catch(e){
		var link = '' ;
		ClickableElementUrlList.push(link);
	}
}

function addLinkButtonToList(visudata) {
	try{
		var FreitextList = visudata.FreitextList;
		var n = FreitextList.length;
		for (var i = 0; i < n; i++) {
			var item = new Object();
			var freiTextListItem = FreitextList[i];
			var x = freiTextListItem.x;
			var y = freiTextListItem.y;
			var txt = freiTextListItem.Freitext;
			var w = ctx.measureText(txt).width;
			var h = freiTextListItem.BgHeight;
			var orientation = freiTextListItem.VerweisAusrichtung;
			var targetBmp = freiTextListItem.idxVerweisBitmap;
			
			item["x"] = freiTextListItem.x;
			item["y"] = freiTextListItem.y;

			if (orientation == "hor") {
				item["x_min"] = x - 6;
				item["y_min"] = y - h - 6;
				item["x_max"] = x + w + 16;
				item["y_max"] = y + 6;
				item["bmp"] = targetBmp;
				item["text"] = txt;
			}
			if (orientation == "up") {
				item["x_min"] = x - h - 16;
				item["y_min"] = y - w - 16;
				item["x_max"] = x + 6;
				item["y_max"] = y + 6;
				item["bmp"] = targetBmp;
				item["text"] = txt;
			}

			if (orientation == "dn") {
				item["x_min"] = x - 6;
				item["y_min"] = y - 6;
				item["x_max"] = x + h + 16;
				item["y_max"] = y + w + 6;
				item["bmp"] = targetBmp;
				item["text"] = txt;
			}
			LinkButtonList.push(item);
		}
	}
	catch(e){
		log(e.message);
	}
}

// Linkbutton in Liste eintragen
function addClickableElementToList(visudata) {
	try{
		for (var i = 0; i < visudata.DropList.length; i++) {
			if (visudata.DropList[i].VCOItem.clickable == true) {
				var item = new Object();
				item["x"] = visudata.DropList[i].x;
				item["y"] = visudata.DropList[i].y;
				item["clickable"] = true;
				item["Bezeichnung"] = visudata.DropList[i].VCOItem.Bez.trim();
				item["id"] = visudata.DropList[i].VCOItem.iD.trim();
				item["h"] = visudata.DropList[i].BgHeight;
				item["bitmapIndex"] = visudata.DropList[i].bmpIndex;
				if (item["Bezeichnung"] == "HK") {
					item["radius"] = 18;

				}
				if (item["Bezeichnung"] == "KES") {
					item["radius"] = 18;
				}

				if (item["Bezeichnung"] == "BHK") {
					item["radius"] = 18;
				}
				if (item["Bezeichnung"] == "WWL") {
					item["radius"] = 18;
				}
				createLinkForClickableElement(visudata.DropList[i].VCOItem.iD.trim());
				ClickableElementList.push(item);
			}
		}
	}
	catch(e){
		log(e.message);
	}    
}


/*This function was written in C# as WebService and called per ajax
Source can be found at Visutool.cs VisuObject class
Rawdata was read from RD02 folder and will be processed to return Visudownload, no more changed need to be made.

There is no List data structure in Javascript so nested array will be use instead. 
Datastructure of Visudownload will be nested array + array of object
*/

function createVisudata(sText){
	if (sText != undefined){
		//console.log(sText);
		var Stoerungen = [];
		var Items = [];
		var Projektnummer = sText.substring(0,5);
		var index = 0;
		
		//HK-Namen
		do
		{
			var item = {};
			idx = sText.indexOf("HKNA");
			if(idx >=0)
			{
				item.Bezeichnung = "HKNA";
				item.Kanal = sText.substr((idx + 4), 2);
				item.Nachkommastellen = 0;
				item.iEinheit = 0;
				item.Wert = sText.substr((idx + 6), 20).trim();
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = '';
				Items.push(item);
				sText= sText.slice((idx+26), sText.length);
				//console.log(sText);
			}
		}
		while (idx >= 0);
		
		//Nennleistung Erzeuger
		do
		{
			var item = {};
			idx = sText.indexOf("PMK");
			if (idx >= 0)
			{
				item.Bezeichnung = "PMK";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PMB");
			if (idx >= 0)
			{
				item.Bezeichnung = "PMB";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		
		do
		{
			var stoerung = {};
			idx = sText.indexOf("STOE");
			if(idx >=0)
			{
			   // Für Picoli, nach STOE gibt nur 2 stellige Störungsnummer. Annahme: Picolinamen sind immer mit P1 anfangen
				if (Projektnummer.indexOf("P1") >-1)
				{
					stoerung.BezNr = sText.substr((idx + 4), 2);
					stoerung.StoerungText = sText.substr((idx + 6), 16);
					Stoerungen.push(stoerung);
					sText = sText.slice((idx+16), sText.length);                        
				}

				// Für MPC, nach STOE gibt 3 stellige Störungsnummer
				else
				{
					stoerung.BezNr = sText.substr((idx + 4), 3);
					stoerung.StoerungText = sText.substr((idx + 7), 20);
					Stoerungen.push(stoerung);
					sText = sText.slice((idx+20), sText.length);   
				}
			}
			
		}
		while (idx >= 0);
		
		
		do
		{
			var item = {};
			idx = sText.indexOf("AI");
			if(idx >=0)
			{
				item.Bezeichnung = "AI";
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
			
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("TH");
			if (idx >= 0)
			{
				item.Bezeichnung = "TH";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("GA");
			if (idx >= 0)
			{
				item.Bezeichnung = "GA";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);	
		
		do
		{
			var item = {};
			idx = sText.indexOf("PKT");
			if (idx >= 0)
			{
				item.Bezeichnung = "PKT";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PT");
			if (idx >= 0)
			{
				item.Bezeichnung = "PT";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("DF");
			if (idx >= 0)
			{
				item.Bezeichnung = "DF";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);	
		
		do
		{
			var item = {};
			idx = sText.indexOf("UDR");
			if (idx >= 0)
			{
				item.Bezeichnung = "UDR";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PDI");
			if (idx >= 0)
			{
				item.Bezeichnung = "PDI";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PGG");
			if (idx >= 0)
			{
				item.Bezeichnung = "PGG";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PGK");
			if (idx >= 0)
			{
				item.Bezeichnung = "PGK";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PGB");
			if (idx >= 0)
			{
				item.Bezeichnung = "PGB";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PBE");
			if (idx >= 0)
			{
				item.Bezeichnung = "PBE";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PBH");
			if (idx >= 0)
			{
				item.Bezeichnung = "PBH";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PBZ");
			if (idx >= 0)
			{
				item.Bezeichnung = "PBZ";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);	

		do
		{
			var item = {};
			idx = sText.indexOf("PEI");
			if (idx >= 0)
			{
				item.Bezeichnung = "PEI";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);	

		do
		{
			var item = {};
			idx = sText.indexOf("AA");
			if (idx >= 0)
			{
				item.Bezeichnung = "AA";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("MS");
			if (idx >= 0)
			{
				item.Bezeichnung = "MS";
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("PH");
			if (idx >= 0)
			{
				item.Bezeichnung = "PH";
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert >0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("KPU");
			if (idx >= 0)
			{
				item.Bezeichnung = "KPU";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert >0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);	
		
		do
		{
			var item = {};
			idx = sText.indexOf("KL");
			if (idx >= 0)
			{
				item.Bezeichnung = "KL";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert >0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);	
		
		do
		{
			var item = {};
			idx = sText.indexOf("BPU");
			if (idx >= 0)
			{
				item.Bezeichnung = "BPU";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert > 0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("BL");
			if (idx >= 0)
			{
				item.Bezeichnung = "BL";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("LP");
			if (idx >= 0)
			{
				item.Bezeichnung = "LP";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("ZP");
			if (idx >= 0)
			{
				item.Bezeichnung = "ZP";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);
		do
		{
			var item = {};
			idx = sText.indexOf("SG");
			if (idx >= 0)
			{
				item.Bezeichnung = "SG";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("BI");
			if (idx >= 0)
			{
				item.Bezeichnung = "BI";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 8), 3);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);	

		do
		{
			var item = {};
			idx = sText.indexOf("ZZ");
			if (idx >= 0)
			{
				item.Bezeichnung = "ZZ";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);	
		do
		{
			var item = {};
			idx = sText.indexOf("HKT");
			if (idx >= 0)
			{
				item.Bezeichnung = "HKT";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("BWT");
			if (idx >= 0)
			{
				item.Bezeichnung = "BWT";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("GR");
			if (idx >= 0)
			{
				item.Bezeichnung = "GR";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				sText= sText.slice((idx+17), sText.length);
			}
		}
		while (idx >= 0);
		
		VisuDownload.Items = Items;
		VisuDownload.Projektnummer = Projektnummer;	
		VisuDownload.Stoerungen = Stoerungen;
	}
}

function getVisuItemEinheit(i)
{
	i = i.trim();
	switch (i)
	{
		case "1":
			return "°C";
			break;
		case "2":
			return "bar";
			break;
		case "3":
			return "V";
			break;	
		case "4":
			return "kW";
			break;
		case "5":
			return "m³/h";
			break;
		case "6":
			return "mWS";
			break;	
		case "7":
			return "%";
			break;
		case "8":
			return "kWh";
			break;
		case "9":
			return "Bh";
			break;	
		case "10":
			return "m³";
			break;
		case "11":
			return "°C\u00F8";
			break;
		case "12":
			return "mV";
			break;	
		case "13":
			return "UPM";
			break;
		case "14":
			return "s";
			break;
		case "15":
			return "mbar";
			break;	
		case "16":
			return "A";
			break;
		case "17":
			return "Hz";
			break;
		case "18":
			return "1/h";
			break;	
		case "40":
			return "";
			break;
	}
}

// click event on (Stat)canvas: Zaehler- und Störungsbutton
function getPosition(event) {
	var x = event.x - canvasOffsetX;
	var y = event.y - canvasOffsetY;

	//click event für das anstehende Störungen button
	if (bmpIndex == 0 && ((x > xStoerButtonMin) && (x < xStoerButtonMax)) && ((y > yStoerButtonMin) && (y < yStoerButtonMax))) {


		var vStatCanvas = document.getElementById("vStatCanvas");
		var modal = document.getElementById('modalStoerung');
		window.onclick = function (event) {
			if (event.target == modal) {
				modal.style.display = "none";
			}
		}

		//alert(stoerungText);
		if (stoerungText != "") {
			document.getElementById("modalHeader").innerHTML = '<h5> Aktuelle Störungen' + '<span id="closeModalStoerung" class="close">&times;</span>';
			document.getElementById("modalContent").style.width = '30%';
			document.getElementById("modalBody").innerHTML =  "</br> <pre>" + stoerungText + "</pre>";//stoerungText ;
			var span = document.getElementById("closeModalStoerung");
			span.onclick = function () {
				modal.style.display = "none";
			}
		}
		else {
			document.getElementById("modalHeader").innerHTML = '<h5> Aktuelle Störungen' + '<span id="closeModalStoerung" class="close">&times;</span>';
			document.getElementById("modalContent").style.width = '30%';
			document.getElementById("modalBody").innerHTML = "keine weiteren Störungen";
			var span = document.getElementById("closeModalStoerung");
			span.onclick = function () {
				modal.style.display = "none";
			}
		}
		modal.style.display = "block";

	}

	//click event für das neue Zähler button, die Ohne verweis auf Zähler.png funktioniert
	if (bmpIndex == 0 && ((x > xZaehlerButtonNeuMin) && (x < xZaehlerButtonNeuMax)) && ((y > yZaehlerButtonNeuMin) && (y < yZaehlerButtonNeuMax))) {
		//alert("on area");
		var vStatCanvas = document.getElementById("vStatCanvas");
		var modal = document.getElementById('modalZaehler');
		window.onclick = function (event) {
			if (event.target == modal) {
				modal.style.display = "none";
			}
		}
		//zähler holen
		var prj = visudata.VCOData.Projektnumer;
		var currentdate = new Date();
		var datetime = "&emsp;&emsp;" + currentdate.getDate() + "."
						+ (currentdate.getMonth() + 1) + "."
						+ currentdate.getFullYear() + " : "
						+ currentdate.getHours() + ":"
						+ (currentdate.getMinutes() < 10 ? '0' : '') + currentdate.getMinutes();
						//+ currentdate.getSeconds();
		var dateMonthYear = currentdate.getDate() + "."
						+ (currentdate.getMonth() + 1) + "."
						+ currentdate.getFullYear();

		var gesamtZaehler = getOnlinegesamtZaehler()
		
		if (gesamtZaehler != "") {
			document.getElementById("modalHeaderZaehler").innerHTML = '<h5> Zähler: ' + projektName + " " + datetime + '<span id="closeModalZaehler" class="close">&times;</span>';
			document.getElementById("modalContenZaehler").style.width = '80%';
			document.getElementById("aktuelleZaehler").innerHTML = "</br> <pre>" + gesamtZaehler + "</pre>";
	
			var span = document.getElementById("closeModalZaehler");
			span.onclick = function () {
				modalZaehler.style.display = "none";
			}

		}
		else {
			
			var aktuelleZaehler = getOnlineAktuellZaehler(prj)
			document.getElementById("modalContenZaehler").style.width = '80%';
			document.getElementById("aktuelleZaehler").innerHTML = "Keine Zählerdaten verfügbar";
			closeModalZaehler();
		}
		modal.style.display = "block";
	}

}


// Mouse Handler für Tooltip Anzeige & Cursor Darstellung (vimgArea)
function handleMouseMove(e) {
	
	var mouseX = parseInt(e.clientX - canvasOffsetX);
	var	mouseY = parseInt(e.clientY - canvasOffsetY);
	
	var currentBmpIndex = bmpIndex;
	match = false;
	var matchTT = false;
	
	for (var i = 0; i < LinkButtonList.length; i++) {
		var item = LinkButtonList[i];
		if (mouseX > item.x_min && mouseX < item.x_max && mouseY > item.y_min && mouseY < item.y_max) {
			match = true;
			i = LinkButtonList.length;
		}
	}

	
	for (var i = 0; i < tt_dots.length; i++) {
		var dx = mouseX - tt_dots[i].x;
		var dy = mouseY - tt_dots[i].y;
		if (tt_dots[i].b) {							//Bool'sches Element?
			dx = mouseX - (tt_dots[i].x - 15);		//Referenzpunkt der Bool'schen Grafiken für tt ungünstig
			dy = mouseY - (tt_dots[i].y + 10);		//daher Verschiebung um 15 & 10px
		}
		var txt = tt_dots[i].t;
		var index = tt_dots[i].index
		if ((dx * dx < 1600) && (dy * dy < 200) && (dx > 0) && (dy < 0) && (index == currentBmpIndex)) {
			
			vtipCanvas.style.left = (tt_dots[i].x) + "px";
			vtipCanvas.style.top = (tt_dots[i].y - 40) + "px";
			tipvctx = vtipCanvas.getContext("2d");
			tipvctx.clearRect(0, 0, vtipCanvas.width, vtipCanvas.height);
			//                  tipvctx.rect(0,0,vtipCanvas.width,vtipCanvas.height);
			
			tipvctx.font = "13.5px Arial";			
			vtipCanvas.width = tipvctx.measureText(txt).width;//(6 * txt.length + 22);
			vtipCanvas.height = 20;
			tipvctx.font = "12px Arial";
			tipvctx.fillStyle = "#F1F1F1"; /*rgb(241, 241, 241); white gray*/
			tipvctx.fillText(txt, 5, 14);
			
			match = true;
			matchTT = true;
			
			i = tt_dots.length;
		}
		
	}
	
	if (match) $(".vinsideWrapper").css("cursor", "pointer");	//Vorarbeit: Pointer als Cursor für zukünftige Visu Bedienung
	
	if (!matchTT) vtipCanvas.style.left = "-2000px";
	
	if (!match && !matchTT) $(".vinsideWrapper").css("cursor", "default");
	
}

// Tooltip pushen
function pushToolTip(px, py, txt, idx, isbool) {
	tt_dots.push({
		x: px,
		y: py,
		t: txt,
		index: idx,
		b: isbool
	});
}

// Tooltipliste aufbauen
function initTooltips() {
	var x = visudata;
	var y = x;
	var DropList = visudata.DropList;

	var n = DropList.length;
	for (i = 0; i < n; i++) {
		if (DropList[i].ToolTip.trim() != "")
			pushToolTip(DropList[i].x, DropList[i].y, DropList[i].ToolTip, DropList[i].bmpIndex, DropList[i].VCOItem.isBool);
	}
}


// Neuzeichnung anfordern (Timer ruft auf)
function requestDrawing() {
	requestDrawingFlag = true;
}

// Timer-Mechanik Darstellung und Animation
var TimerVar = setInterval(function () { globalTimer() }, 100);
var TimerToggle = false;
var TimerToggleCounter = 0;
var TimerCounter = 0;

function globalTimer() {
	if (requestDrawingFlag || hasSymbolsFlag) {
		TimerCounter++;
		if (TimerCounter > 10000)
			TimerCounter = 0;

		// 500ms Toggle (1 Hz)
		TimerToggleCounter++;
		if (TimerToggleCounter > 5) {
			TimerToggleCounter = 0;
			TimerToggle = !TimerToggle;
		}
		DrawVisu(requestDrawingFlag);
		requestDrawingFlag = false;
	}

}


// Diverse Zeichenfunktionen wie im Editor

/*
function Heizkreis(vDynCtx, x, y, scale) {
    vDynCtx.save();
    vDynCtx.lineWidth = 4;
    vDynCtx.translate(x, y);
    vDynCtx.beginPath();
    vDynCtx.arc(0, 0, 18, 0, 2 * Math.PI);
    vDynCtx.stroke();
    vDynCtx.restore();
}
*/

function Heizkreis(vDynCtx, x, y) {
	var notches = 7,                      // num. of notches
		radiusO = 12,                    // outer radius
		radiusI = 9,                    // inner radius
		radiusH = 5,                    // hole radius
		taperO = 30,                     // outer taper %
		taperI = 40,                     // inner taper %

		// pre-calculate values for loop
		pi2 = 2 * Math.PI,            // cache 2xPI (360deg)
		angle = pi2 / (notches * 2),    // angle between notches
		taperAI = angle * taperI * 0.005, // inner taper offset (100% = half notch)
		taperAO = angle * taperO * 0.005, // outer taper offset
		a = angle,                  // iterator (angle)
		toggle = false;                  // notch radius level (i/o)

	vDynCtx.save();
	vDynCtx.fillStyle = '#000';
	vDynCtx.lineWidth = 2.5;
	vDynCtx.strokeStyle = '#000';
	vDynCtx.beginPath();
	vDynCtx.shadowColor = "black";
	vDynCtx.shadowBlur = 3;
	vDynCtx.shadowOffsetX = 3;
	vDynCtx.shadowOffsetY = 3;
	vDynCtx.moveTo(x + radiusO * Math.cos(taperAO), y + radiusO * Math.sin(taperAO));

	for (; a <= pi2; a += angle) {

		// draw inner to outer line
		if (toggle) {
			vDynCtx.lineTo(x + radiusI * Math.cos(a - taperAI),
				y + radiusI * Math.sin(a - taperAI));
			vDynCtx.lineTo(x + radiusO * Math.cos(a + taperAO),
				y + radiusO * Math.sin(a + taperAO));
		}

		// draw outer to inner line
		else {
			vDynCtx.lineTo(x + radiusO * Math.cos(a - taperAO),  // outer line
				y + radiusO * Math.sin(a - taperAO));
			vDynCtx.lineTo(x + radiusI * Math.cos(a + taperAI),  // inner line
				y + radiusI * Math.sin(a + taperAI));
		}

		// switch level
		toggle = !toggle;
	}
	// close the final line
	vDynCtx.closePath();
	vDynCtx.moveTo(x + radiusH, y);
	vDynCtx.arc(x, y, radiusH, 0, pi2);
	vDynCtx.stroke();
	vDynCtx.restore();
}



function Absenkung(vDynCtx, x, y, scale, active) {
	vDynCtx.save();
	vDynCtx.moveTo(0 - 10 * scale, 0);
	vDynCtx.font = '10pt Arial';
	vDynCtx.fillStyle = 'blue';

	vDynCtx.translate(x, y);

	if (active == 1)
		vDynCtx.fillText('Nacht', 0, 0);
	else
		vDynCtx.fillText('Tag', 1, 0);

	vDynCtx.restore();
}


function BHDreh(vDynCtx, x, y, scale, rotation) {
	vDynCtx.save();
	vDynCtx.lineWidth = 1 * scale;
	vDynCtx.translate(x, y);
	vDynCtx.rotate(Math.PI / 180 * rotation);
	vDynCtx.strokeStyle = "steelblue";
	vDynCtx.beginPath();
	vDynCtx.arc(0, 0, 13 * scale, 0, Math.PI * 2, true);

	vDynCtx.moveTo(0 + 10 * scale, 0);
	vDynCtx.arc(0, 0, 10 * scale, 0, -Math.PI / 4, true);
	vDynCtx.moveTo(0 + 10 * scale, 0);
	vDynCtx.arc(0, 0, 10 * scale, 0, Math.PI / 4, false);

	vDynCtx.moveTo(0 - 10 * scale, 0);
	vDynCtx.arc(0, 0, 10 * scale, Math.PI, -3 * Math.PI / 4, false);
	vDynCtx.moveTo(0 - 10 * scale, 0);
	vDynCtx.arc(0, 0, 10 * scale, Math.PI, 3 * Math.PI / 4, true);
	vDynCtx.stroke();

	vDynCtx.lineWidth = 3 * scale;

	vDynCtx.beginPath();
	vDynCtx.moveTo(0 - 10 * scale, 0);
	vDynCtx.lineTo(0 + 10 * scale, 0);

	vDynCtx.stroke();
	vDynCtx.restore();
}


function feuer(vDynCtx, x, y, scale) {
	// 30x48
	var rd1 = (Math.random() - 0.5) * 3;
	var rd2 = (Math.random() - 0.5) * 3;
	var rd3 = (Math.random() - 0.5) * 3;
	var rd4 = (Math.random() - 0.5) * 3;
	var rd5 = (Math.random() - 0.5) * 3;
	var rd6 = (Math.random() - 0.5) * 3;
	vDynCtx.save();

	vDynCtx.lineWidth = 1;
	vDynCtx.translate(x, y);
	vDynCtx.scale(scale, scale);
	vDynCtx.strokeStyle = "red";
	vDynCtx.fillStyle = "yellow";
	vDynCtx.beginPath();
	vDynCtx.moveTo(0 + rd1, -20);
	vDynCtx.lineTo(-5 + rd2, -10);
	vDynCtx.lineTo(-8 + rd3, -5);
	vDynCtx.lineTo(-7 + rd4, 5);
	vDynCtx.lineTo(-2 + rd5, 10);

	vDynCtx.lineTo(2 + rd5, 10);
	vDynCtx.lineTo(4 + rd4, 5);
	vDynCtx.lineTo(6 + rd6, -5);
	vDynCtx.lineTo(5 + rd2, -10);
	vDynCtx.lineTo(0 + rd1, -20);
	vDynCtx.fill();
	vDynCtx.stroke();

	//vDynCtx.closePath();
	vDynCtx.restore();
}

function pmpDreh2(vDynCtx, x, y, scale, rot) {
	// 12x12
	vDynCtx.save();
	vDynCtx.strokeStyle = "black";
	vDynCtx.fillStyle = "black";
	vDynCtx.lineWidth = 1;
	vDynCtx.translate(x, y);
	vDynCtx.rotate(Math.PI / 180 * rot);
	vDynCtx.scale(scale, scale);
	vDynCtx.beginPath();
	vDynCtx.arc(0, 0, 11, 0, Math.PI * 2, true);
	vDynCtx.stroke();
	vDynCtx.closePath();
	vDynCtx.beginPath();
	vDynCtx.lineWidth = 1, 5;
	vDynCtx.arc(0, 0, 6, 0, Math.PI * 2, true);
	vDynCtx.fillStyle = 'black';
	vDynCtx.fill();
	vDynCtx.closePath();
	vDynCtx.beginPath();
	vDynCtx.arc(0, 0, 6, startAngle, endAngle, true);
	vDynCtx.lineTo(0, 0);
	vDynCtx.fillStyle = 'white';
	vDynCtx.fill();
	vDynCtx.closePath();

	vDynCtx.stroke();
	vDynCtx.restore();
}

function drawEllipse(vDynCtx, x, y, w, h) {
	var kappa = .5522848,
		ox = (w / 2) * kappa, // control point offset horizontal
		oy = (h / 2) * kappa, // control point offset vertical
		xe = x + w,           // x-end
		ye = y + h,           // y-end
		xm = x + w / 2,       // x-middle
		ym = y + h / 2;       // y-middle


	vDynCtx.moveTo(x, ym);
	vDynCtx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
	vDynCtx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
	vDynCtx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
	vDynCtx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
	//vDynCtx.closePath(); // not used correctly, see comments (use to close off open path)
	vDynCtx.stroke();
}

function luefter(vDynCtx, x, y, scale, rotL, rotDir) {
	// 51x51
	vDynCtx.save();
	vDynCtx.strokeStyle = "black";
	vDynCtx.fillStyle = "grey";
	vDynCtx.lineWidth = 1;
	vDynCtx.translate(x, y);
	vDynCtx.rotate(Math.PI / 180 * rotDir);
	vDynCtx.scale(scale, scale);
	vDynCtx.beginPath();
	vDynCtx.arc(0, 0, 24, 0, Math.PI * 2, true);
	vDynCtx.moveTo(0, -24);
	vDynCtx.lineTo(-23, -5);
	vDynCtx.moveTo(0, 24);
	vDynCtx.lineTo(-23, 5);
	vDynCtx.stroke();
	vDynCtx.closePath();
	vDynCtx.beginPath();
	vDynCtx.rotate(Math.PI / 180 * rotL);
	drawEllipse(vDynCtx, 0, -5, 22, 10);
	drawEllipse(vDynCtx, -22, -5, 22, 10);
	vDynCtx.fill();

	vDynCtx.restore();
}

function ventil(vDynCtx, x, y, scale, rot) {
	// 6x6
	vDynCtx.save();
	vDynCtx.strokeStyle = "black";
	vDynCtx.fillStyle = "black";
	vDynCtx.lineWidth = 1;
	vDynCtx.translate(x, y);
	vDynCtx.rotate(Math.PI / 180 * rot);
	vDynCtx.scale(scale, scale);
	vDynCtx.beginPath();
	vDynCtx.fillRect(-3, -1, 3, 2);
	vDynCtx.moveTo(0, 3);
	vDynCtx.lineTo(3, 0);
	vDynCtx.lineTo(0, -3);
	vDynCtx.fill();

	vDynCtx.restore();
}

function Led(vDynCtx, x, y, scale, col) {


	vDynCtx.save();
	vDynCtx.strokeStyle = "black";
	vDynCtx.fillStyle = "#aaa";
	vDynCtx.lineWidth = 1;
	vDynCtx.translate(x, y);
	vDynCtx.scale(scale, scale);
	vDynCtx.beginPath();

	vDynCtx.arc(0, 0, 6, 0, Math.PI * 2, true);
	vDynCtx.stroke();
	vDynCtx.fill();
	vDynCtx.closePath();
	vDynCtx.beginPath();
	vDynCtx.arc(0, 0, 4, 0, Math.PI * 2, true);
	vDynCtx.fillStyle = col;
	vDynCtx.fill();
	vDynCtx.restore();
}


// Hintergrundfarbe setzen
function initBGColors() {
	var n = visudata.VCOData.Bitmaps.length;
	for (var i = 0; i < n; i++) {
		var url = visudata.VCOData.Bitmaps[i].URL;
		var bgcol = getBGColor(url);
		bgColors.push(bgcol);
	}
}

// Bitmap setzen
function setBitmap(idx) {
	$("#vimgTarget").remove();
	$("#vimgArea").prepend("<img id='vimgTarget' src='" + visudata.VCOData.Bitmaps[idx].URL + "' class='vcoveredImage'>");
	$(".vinsideWrapper").css("background-color", bgColors[bmpIndex]);
}


// Mousebutton Eventhandler für Bitmapwechsel
function handleMouseDown(e) {
	mx = parseInt(e.clientX - canvasOffsetX);
	my = parseInt(e.clientY - canvasOffsetY);
	var n = LinkButtonList.length;
	match = false;							//Flag zur Click-treffer Erkennung (es ist nicht davon auszugehen, dass es keine doppelten Click-treffer gibt!)
	if (!match) {
		for (var i = 0; i < n; i++) {
			var item = LinkButtonList[i];
			if (mx > item.x_min && mx < item.x_max && my > item.y_min && my < item.y_max) {
				match = true;
				//log(item.x + " " + item.y);
				//log(item.x_min + " " + item.x_max + " " + item.y_min + " " + item.y_max + " - " + mx + " / " + my);
				
				/*bmpIndex = item.bmp;
				setBitmap(bmpIndex);
				requestDrawing();*/
				
				if (bmpIndex != item.bmp) {
					requestDrawing();
					bmpIndex = item.bmp;
					setBitmap(bmpIndex);
				}
			}
		}
	}
	
	if (!match) openFaceplate();	
}


// Zeichen-Hauptfunktion. Wird bei Bedarf von Timer aufgerufen
function DrawVisu(redrawStat = false) {
	vDynCtx.clearRect(0, 0, vDynCanvas.width, vDynCanvas.height);
	drawPropertyList();
	
	if (redrawStat) {
		vStatCtx.clearRect(0, 0, vStatCanvas.width, vStatCanvas.height);
		drawTextList();
	}
	
}

// Linkbutton in Liste eintragen
function addLinkButtonToList(x, y, w, h, orientation, targetBmp, txt) {
	var item = new Object();
	item["txt"] = txt;
	item["x"] = x;
	item["y"] = y;
	0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16
	
	//Referenzpunkt (x,y = TextBeginn unten links bei orientation==hor)
	if (orientation == "hor") {
		item["x_min"] = x - 6;
		item["y_min"] = y - h - 6;
		item["x_max"] = item.x_min + w + h;
		item["y_max"] = item.y_min + 2 * h;
		item["bmp"] = targetBmp;
	}
	if (orientation == "up") {		
		item["x_min"] = x - h - 6;
		item["y_max"] = y + 6;
		item["y_min"] = item.y_max - w - h;
		item["x_max"] = item.x_min + 2 * h;
		item["bmp"] = targetBmp;
	}
	if (orientation == "dn") {		
		item["x_max"] = x + h + 6;
		item["y_min"] = y - 6;
		item["x_min"] = item.x_max - 2 * h;
		item["y_max"] = item.y_min + w + h;
		item["bmp"] = targetBmp;
	}
	
	// get coordinate of the stoerung button
	if (txt == "anstehende Störungen") {
		xStoerButtonMin = item.x_min;
		xStoerButtonMax = item.x_max;
		yStoerButtonMin = item.y_min;
		yStoerButtonMax = item.y_max;
	}
	//get coordinate of button zähler archiv
	if (txt == "Zähler Archiv") {
		xArchivButton = item.x_min;
		yArchivButton = item.y_min;
		xArchivButtonBot = item.x_max;
		yArchivButtonBot = item.y_max;
	}

	//get coordinate of button zähler anzeigen
	if (txt == "Zähler anzeigen") { // & FreitextList[i].BgColor == "slateBlue ") {
		xZaehlerButtonNeuMin = item.x_min;
		yZaehlerButtonNeuMin = item.y_min;
		xZaehlerButtonNeuMax = item.x_max;
		yZaehlerButtonNeuMax = item.y_max;
	}

	//get coordinate of Button IPKamera1
	if (txt == "IP Kamera 1") { // &  FreitextList[i].BgColor == "#ff9966") {
		xIPKamera1Button = item.x_min;
		yIPKamera1Button = item.y_min;
		xIPkamera1ButtonBot = item.x_max;
		yIPkamera1ButtonBot = item.y_max;
	}

	//get coordinate of Button IPKamera2
	if (txt == "IP Kamera 2") { // & FreitextList[i].BgColor == "#ff9966") {
		xIPKamera2Button = item.x_min;
		yIPKamera2Button = item.y_min;
		xIPkamera2ButtonBot = item.x_max;
		yIPkamera2ButtonBot = item.y_max;
	}
	
	//Anzeige des Clickbereichs für Button
	//vStatCtx.fillRect(item["x_min"], item["y_min"], item["x_max"] - item["x_min"], item["y_max"] - item["y_min"]);

	LinkButtonList.push(item);
}

// Gedroptes zeichen
function _drawDropList() {
	var DropList = visudata.DropList;

	var n = DropList.length;
	for (i = 0; i < n; i++) {
		drawVCOItem(DropList[i]);
	}
}


// Properties zeichnen incl. Symbole
function drawVCOItem(item) {
	if (item["bmpIndex"] == bmpIndex) {
		var warnGrenze;
		var stoerGrenze;
		var gasSensorWert;
		var x = item.x;
		var y = item.y;
		var vco = item["VCOItem"];
		var values = VisuDownload.Items;
		var svalue = "-";
		var n = values.length;
		for (var i = 0; i < n; i++) {
			if (vco.Bez.trim() == values[i].Bezeichnung.trim() && vco.Kanal == values[i].Kanal) {
					var value = values[i].Wert;
					var nk = values[i].Nachkommastellen;
					svalue = parseFloat((value * 100) / 100).toFixed(nk);
				}

			if ((values[i].Bezeichnung == "GR") && (values[i].Kanal == 2)) {
					var value = values[i].Wert;
					var nk = values[i].Nachkommastellen;
					warnGrenze = parseFloat((value * 100) / 100).toFixed(nk);
				}
			if ((values[i].Bezeichnung == "GR") && (values[i].Kanal == 3)) {
					var value = values[i].Wert;
					var nk = values[i].Nachkommastellen;
					stoerGrenze = parseFloat((value * 100) / 100).toFixed(nk);
				}
			if (values[i].Bezeichnung == "GA")  {
					var value = values[i].Wert;
					var nk = values[i].Nachkommastellen;
					gasSensorWert = parseFloat((value * 100) / 100).toFixed(nk);
				}
		}

			 if ((item.VCOItem.Bez.trim() == "GA") && (gasSensorWert > stoerGrenze)) {
				item.BgColor = "#fc1803";
				if (item.VCOItem.Projektnummer.trim() == "P 676") {
					svalue = "     ";
					vco.sEinheit = "     ";
				}

			}

			if ((item.VCOItem.Bez.trim() == "GA") && (gasSensorWert < stoerGrenze) && (gasSensorWert > warnGrenze)) {
				item.BgColor = "#fcdf03";
				if (item.VCOItem.Projektnummer.trim() == "P 676") {
					svalue = "     ";
					vco.sEinheit = "     ";
				}
			}

			if (warnGrenze != null) {
			 if ((item.VCOItem.Bez.trim() == "GA") && (gasSensorWert < warnGrenze)) {
				item.BgColor = "#42f545";
					if (item.VCOItem.Projektnummer.trim() == "P 676") {
						svalue = "     ";
						vco.sEinheit = "     ";
					}
				}
			}

		var txt = svalue + " " + vco.sEinheit;
				
		if (false) { // item.ShowSymbolMenue) {
			CurrentDroplistItem = item;
			location.href = '#EditSymbol';
		}
		else {
			if (vco.isBool) {

				/*SettingsFromVisualisierung*/
				if (item.Symbol == "Heizkreis") {
					if (svalue.trim() == "1")
						Heizkreis(vDynCtx, item.x, item.y, 1);
					else
						Heizkreis(vDynCtx, item.x, item.y, 1);
				}

				if (item.Symbol == "Absenkung") {
					if (svalue.trim() == "1")
						Absenkung(vDynCtx, item.x, item.y, 1, 1);
					else
						Absenkung(vDynCtx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Feuer") {
					if (svalue.trim() == "1")
						feuer(vDynCtx, item.x, item.y, 1);
				}

				if (item.Symbol == "BHKW") {
					if (svalue.trim() == "1")
						BHDreh(vDynCtx, item.x, item.y, 1, TimerCounter * 30);
					else
						BHDreh(vDynCtx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Pumpe") {
					if (svalue.trim() == "1")
						pmpDreh2(vDynCtx, item.x, item.y, 1, TimerCounter * 30);
					else
						pmpDreh2(vDynCtx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Luefter") {
					var angle = 30;
					if (svalue.trim() == "1")
						angle = TimerCounter * 30;

					if (item.SymbolFeature == "Links") {
						luefter(vDynCtx, item.x, item.y, 1, angle, 0);
					}
					if (item.SymbolFeature == "Rechts") {
						luefter(vDynCtx, item.x, item.y, 1, angle, 180);
					}
					if (item.SymbolFeature == "Oben") {
						luefter(vDynCtx, item.x, item.y, 1, angle, 90);
					}
					if (item.SymbolFeature == "Unten") {
						luefter(vDynCtx, item.x, item.y, 1, angle, 270);
					}
				}

				if (item.Symbol == "Ventil") {
					if (svalue.trim() == "1") {

						if (item.SymbolFeature == "Links") {
							ventil(vDynCtx, item.x, item.y, 2, 180);
						}
						if (item.SymbolFeature == "Rechts") {
							ventil(vDynCtx, item.x, item.y, 2, 0);
						}
						if (item.SymbolFeature == "Oben") {
							ventil(vDynCtx, item.x, item.y, 2, 270);
						}
						if (item.SymbolFeature == "Unten") {
							ventil(vDynCtx, item.x, item.y, 2, 90);
						}
					}
				}

				if (item.Symbol == "Led") {
					var b = (svalue.trim() == "1");

					if (item.SymbolFeature == "unsichtbar/rot") {
						if (b)
							Led(vDynCtx, item.x, item.y, 1, "red");
					}
					if (item.SymbolFeature == "gruen/rot") {
						if (!b)
							Led(vDynCtx, item.x, item.y, 1, "green");
						else
							Led(vDynCtx, item.x, item.y, 1, "red");

					}
					if (item.SymbolFeature == "unsichtbar/rot blinkend") {
						if (b) {
							if (TimerToggle)
								Led(vDynCtx, item.x, item.y, 1, "red");
						}
					}
					if (item.SymbolFeature == "gruen/rot blinkend") {
						if (!b)
							Led(vDynCtx, item.x, item.y, 1, "green");
						else {
							if (TimerToggle)
								Led(vDynCtx, item.x, item.y, 1, "red");
						}
					}
				}

				hasSymbolsFlag = true;
			}
			else {
				var sz = document.getElementById("selSize");
				vDynCtx.font = item.font;
				var w = vDynCtx.measureText(txt).width;
				(item.BgColor == '#BEBEBE' ||item.BgColor == '#E0E0E0') ? //durchsichtige Darstellung des Hintergrunds, wenn BmpBg || ZaehlerBg
					vDynCtx.fillStyle = "rgba(0,0,0,0)":
					vDynCtx.fillStyle = item.BgColor;
				vDynCtx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
				vDynCtx.fillStyle = item.Color;
				vDynCtx.fillText(txt, x, y);
			}
		}
	}
}

// Aufruf Funktion
function drawPropertyList() {
	_drawDropList();
}

// Aufruf Funktion
function drawTextList() {
	var FreitextList = visudata.FreitextList;
	var n = FreitextList.length;
	LinkButtonList = [];	//LinkButtonList leeren -> wird nachfolgend neu erzeugt
	for (i = 0; i < n; i++) {
		var item = FreitextList[i];
		if (FreitextList[i].bmpIndex == bmpIndex) {
			var x = item.x;
			var y = item.y;
			var txt = item.Freitext;
			vStatCtx.font = item.font;
			vStatCtx.fillStyle = item.BgColor;
			var w = vStatCtx.measureText(txt).width;

			if (item.isVerweis) {
				vStatCtx.save();
				vStatCtx.translate(x, y);
				if (item.VerweisAusrichtung == "up")
					vStatCtx.rotate(-Math.PI / 2);
				if (item.VerweisAusrichtung == "dn")
					vStatCtx.rotate(Math.PI / 2);
				vStatCtx.fillRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vStatCtx.strokeStyle = "black";
				vStatCtx.strokeRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vStatCtx.fillStyle = item.Color;
				vStatCtx.fillText(txt, 0, 0);
				vStatCtx.restore();
				addLinkButtonToList(x, y, w, item.BgHeight, item.VerweisAusrichtung, item.idxVerweisBitmap, txt);
			}
			else {
				vStatCtx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
				vStatCtx.fillStyle = item.Color;
				vStatCtx.fillText(txt, x, y);
			}
		}
	}
}


// 

// Loggen
function log(s) {
	$('#output').append(new Date().toLocaleTimeString() + " " + s + "<br />");
	//var objDiv = document.getElementById("output");
	//objDiv.scrollTop = objDiv.scrollHeight;
}


function ReloadData() {
	var date = new Date();
	var rawvisuData = readFromTextFile(visuDataFile);
	createVisudata(rawvisuData);

	if (rawvisuData != "") {
		DrawVisu();
		document.querySelector('#vupdateStatus-bar').style.color = 'black';
		document.querySelector('#vupdateStatus-info').textContent = 'Letzte Datenaktualisierung: ' + date.toLocaleString("de-DE");
		//console.log("Letzte Datenaktualisierung:" + Date().toLocaleString());
	}
	else
	{
		document.querySelector('#vupdateStatus-bar').style.color = 'red';
		if(document.querySelector('#vupdateStatus-info').textContent == " ") document.querySelector('#vupdateStatus-info').textContent = 'Datenaktualisierung fehlgeschlagen!';
		//console.log("Datenaktualisierung fehlgeschlagen!");
	}
}

function toggleBools() {
	var x = VisuDownload;
	var n = VisuDownload.Items.length;
	for (i = 0; i < n; i++) {
		var itm = VisuDownload.Items[i];
		if (itm.isBool == true) {

			itm.BooVal = !itm.BooVal;
			if (itm.Wert == 1)
				itm.Wert = 0;
			else
				itm.Wert = 1;
		}
	};
}


function UpdateLabelMouseOverHandler() {
	$('#xlabel').css("background-color", "red");
}

function UpdateLabelMouseOutHandler() {
	$('#xlabel').css("background-color", "lightgrey");

}


/*Ab hier Visu Bedienung:*/
// When the user clicks anywhere outside of the Modal, close it
window.onclick = function(event) {
  var modals = Array.from(document.getElementsByClassName("modalVisuBg"));
  modals.forEach(function(el) {
    if (el == event.target) {
		if (el.id.includes('fp')) closeFaceplate();
		if (el.id.includes('Pin')) closePinModal();
		if (el.id.includes('Kalender')) closeModalWochenKalenderImVisu();
	}
  });
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
  //console.log(modal.offsetTop + modal.offsetHeight + OFFSET_MODAL_2_OSK, modal.offsetTop, modal.offsetHeight, OFFSET_MODAL_2_OSK);
  osk.style.top = modal.offsetTop + modal.offsetHeight + OFFSET_MODAL_2_OSK + 'px';
  osk.style.left = modal.offsetLeft + modal.offsetWidth - osk.offsetWidth + 'px';  
}

function switchPinFocus(value) {
  //console.log(value);
  if (value.length >= 4) document.getElementById("btnPinConfirm").focus();
}

function handlePinVisibility(checked) {
  //console.log(checked);
  var txtPin = document.getElementById("txtPin");
  checked ? txtPin.type = "password" : txtPin.type = "text";
}

function checkPin() {
  var txtPin = document.getElementById("txtPin");
  let hash = readFromTextFile(HASH_FILE);
  if(DEBUG) console.log(txtPin.value, md5(txtPin.value), hash);
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











function sendValueFromVisuToRtos(option) {
	var sendBackToRtosUrlList = [];
	var faceplateBody = document.getElementById('fpBody');
	var faceplateBodyList = Array.from(faceplateBody.children);
	faceplateBodyList.forEach(el => el.childNodes.forEach(function (ele) {
		if (ele.id.includes('v')) console.log(ele);
		
	}));	
		
	console.log(faceplateBodyList);
	var errorString = '';
	
	//normale Zurückübertragen mit Validierung der Eingabe; undefined kommt aus der onlickevent des html button (index.html)
	if (option == undefined) {	
		faceplateBodyList.forEach(function(div) {
			var idx = parseInt(div.id.slice(-3)) - 90;
			div.childNodes.forEach(function(el) {
				if (el.className == 'inputWert'/*el.id.includes('inputWert')*/) {
					if (idx == 0) {
						ClickableElement[idx].wert = el.value.padEnd(20, ' ').slice(0, 20);
					}
					else {					
						//Numerische Validierung
						var value = parseFloat(el.value);
						if (!isNaN(value) && el.value.trim() != '') {		//Wenn nicht leer und Fehlerfrei: neuen rtos-Wert prüfen & überschreiben
							//Wertebereich prüfen und ggf. korrigieren
							var unterGrenze = parseFloat(ClickableElement[idx].unterGrenze.trim());
							var oberGrenze = parseFloat(ClickableElement[idx].oberGrenze.trim());
							
							el.style.color = 'black';
							el.previousSibling.style.color = 'black';
							el.nextSibling.style.color = 'black';
								
							if (value < unterGrenze){
								errorString += el.previousSibling.textContent + ': ' + 'min = ' + unterGrenze + '\n';
								el.style.color = '#C31D64';
								el.previousSibling.style.color = '#C31D64';
								el.nextSibling.style.color = '#C31D64';
								//el.value = unterGrenze.toString();
							}
							if (value > oberGrenze){
								errorString += el.previousSibling.textContent + ': ' + 'max = ' + oberGrenze + '\n';
								el.style.color = '#C31D64';
								el.previousSibling.style.color = '#C31D64';
								el.nextSibling.style.color = '#C31D64';
								//el.value = oberGrenze.toString();//ClickableElement[idx].oberGrenze;
							}
							
							var returnValue = el.value.split('.');	//Trennung in Vor- & Nachkommastellen zur Formatierung; hier auch stringLängenkorrektur
							ClickableElement[idx].wert = returnValue[0].padStart(5, ' ').slice(-5) + '.';
							if (returnValue.length > 1) {
								ClickableElement[idx].wert += returnValue[1].padEnd(4, '0').slice(0, 4);
							}
							else {
								ClickableElement[idx].wert += '0000';
							}
						}
						else {	//isNaN || empty
							el.style.color = '#C31D64';
							if (el.previousSibling != null) el.previousSibling.style.color = '#C31D64';
							if (el.nextSibling != null) el.nextSibling.style.color = '#C31D64';
							if (el.previousSibling != null) errorString += el.previousSibling.textContent + ': ';
							errorString += 'ungültige Zahl!' + '\n';
						}
					}
				}
			});
		});
	}
	//Wenn "Zum Wochekalender" -> Wert "HK Wochenkalender" auf 1 umstellen und weitere Daten unverändert zurückübertragen
	else { //if (option == 'openHKWochenKalender' || option == 'closeHKWochenKalender') {
		ClickableElement.forEach(function(el) {
			//console.log(el.name.trim());
			if (el.name.includes('Wochenk')) {
				//console.log('+' + el.wert + '+');
				//Kalender mit Schreibrechten öffnen
				if (option == 'openHKWochenKalender' && !locked) el.wert = el.wert.replace('0', '1');
				//Kalender OHNE Schreibrechte öffnen
				if (option == 'openHKWochenKalender' && locked) el.wert = el.wert.replace('0', '2');
				//if (option == 'closeHKWochenKalender') el.wert = el.wert.replace('1', '0');
				//console.log('+' + el.wert + '+');
			}
		});
	}
	if(errorString == ''){
		//erzeugt Linkliste
		for (var i=0; i<20 ; i++) {
			var sendBackData = '';
			var link = ''
			var idForTranfer = 'v' + (i+90).toString().padStart(3,'0');
			//1.Zeile auffüllen auf 60 Zeichen
			if(i == 0) {
				sendBackData += (ClickableElement[i].name + ClickableElement[i].wert).padEnd(60, ' ');
				link = 'http://172.16.0.102/JSONADD/PUT?' + idForTranfer + '='  + encodeURIComponent('"' + sendBackData + '"');
				sendBackToRtosUrlList.push(link);
			}
			else {		
				sendBackData = ClickableElement[i].name + ClickableElement[i].wert + '  ' + ClickableElement[i].oberGrenze + ' ' +
				ClickableElement[i].unterGrenze + ' ' +	ClickableElement[i].nachKommaStellen + ' ' + ClickableElement[i].einheit + '    ' + ClickableElement[i].sectionIndicator;
				link = 'http://172.16.0.102/JSONADD/PUT?' + idForTranfer + '='  + encodeURIComponent('"' + sendBackData + '"');
				sendBackToRtosUrlList.push(link);
			}
		}
		//Linkliste an Rtos senden
		for (var j=0; j<sendBackToRtosUrlList.length; j++){
			sendData(sendBackToRtosUrlList[j]);
			//console.log(sendBackToRtosUrlList[j]);
		}
		if (option == undefined) closeFaceplate();
		return 0;
	}
	else{
		alert(errorString);
		return -100;
	}
}

function sendDataToRtosNEW(event) {
	if (event == null || event == undefined) return event;
	
	var btn;
	(typeof event) == 'string' ? btn = document.getElementById(event) : btn = event.target;
	if (btn == null || btn == undefined) return btn;
	
	var errorString = '';
	
	//Nur RtosVar für Wochenkalender ändern (Aufforderung an Rtos Kalenderdaten schicken)
	if (btn.id.toUpperCase().includes('CALENDER')) {
		ClickableElement.forEach(function (el) {
			if (btn.idx == el.idx) el.wert = el.wert.replace('0', btn.wert);
		});		
	}
	else {
		var rtosVars = Array.from(document.getElementsByClassName('divRtosVar'));
		var changedRtosVars = [];
		rtosVars.forEach(function (el) {
			if(el.wert != undefined) changedRtosVars.push(el);
		});
		
		changedRtosVars.forEach(function (changedEl) {
			ClickableElement.forEach(function (el) {
				if (changedEl.idx == el.idx) {
					var changedVal = parseFloat(changedEl.wert);
					//console.log(typeof changedEl.wert);
					if (isNaN(changedVal) || changedEl.wert.toString().trim() == '') {
						changedEl.style.color = '#C31D64';
						errorString += changedEl.firstElementChild.textContent + ': ' + 'ungültige Zahl!' + '\n';
					}
					else if (changedVal > parseFloat(el.oberGrenze)) {
						changedEl.style.color = '#C31D64';
						errorString += changedEl.firstElementChild.textContent + ': ' + 'max = ' + el.oberGrenze + '\n';
					}
					else if (changedVal < parseFloat(el.unterGrenze)) {
						changedEl.style.color = '#C31D64';
						errorString += changedEl.firstElementChild.textContent + ': ' + 'min = ' + el.unterGrenze + '\n';
					}
					else {
						el.wert = changedVal.toFixed(4).padStart(10).padEnd(12);
					}
				}
			});
		});
	}
	
	if (errorString != '') {
		alert(errorString);
	}
	else {
		var sendErrors = '';
		ClickableElement.forEach(function (el) {
			var	rtosVar = '"' + el.name + el.wert + el.oberGrenze + el.unterGrenze + el.nachKommaStellen + el.einheit + el.sectionIndicator + '"';
			//console.log(rtosVar);
			var url = 'http://172.16.0.102/JSONADD/PUT?v' + el.idx.toString().padStart(3, '0') + '=' + encodeURIComponent(rtosVar);
			var ans = sendData(url);
			//console.log(url);
			if (!ans.includes('OK')) sendErrors += ans;
		});
		if (sendErrors != '') console.log(sendErrors);
	}
	
	if (btn.id.toUpperCase().includes('CONFIRM') || btn.id.toUpperCase().includes('SEND')) closeFaceplate();
}

function openFaceplate() {
		/*SettingsFromVisualisierung*/
	//handle for button click and clickable item, same philosophy as bitmap change of non linked element above

	var n = ClickableElementList.length;
	for (var i = 0; i < n; i++) {
		var item = ClickableElementList[i];

		//check bitmap referenz to avoid interferenz between layer
		var currentBitmapIndex = bmpIndex;

		/********************* Heizkreise *************************/
		if ((item.bitmapIndex == currentBitmapIndex) && (item.Bezeichnung == "HK" || item.Bezeichnung == "KES" || item.Bezeichnung == "BHK" || item.Bezeichnung == "WWL")) {
			dx = mx - item.x;
			dy = my - item.y;
			if (dx * dx + dy * dy < item.radius * item.radius) {
				match = true;
				var matchItem = item;
				
				showElemementById('fpBg');
				hideElemementById('fpContent');
				showElemementById('visLoader');
				

				//search in the link list of clickable element base on unique id to find out the coresspondent link 
				for (var j = 0; j < ClickableElementUrlList.length; j++) {
					if (ClickableElementUrlList[j].indexOf(item.id) >= 0) {
						clickableElementUrl = ClickableElementUrlList[j];
					}
				}

				/*query the available adjustable params from RTOS in three steps
					1. tell the RTOS-Webserver, which elemente will be queried
					2. read RTOS-Vars until they are empty (Strings)
					3. read RTOS-Vars until identifiers are equal (Strings)
				*/
				sendData(clickableElementUrl);
				//sleep(1000);
				var c = 0;
				do {
					var adjustmentOption  = JSON.parse(getData(readParameterOfClickableElementUrl));
					c++;
				} while (adjustmentOption.v070.trim() != '' && c < 50);
				c = 0;
				do {
					var adjustmentOption  = JSON.parse(getData(readParameterOfClickableElementUrl));
					c++;
				} while (adjustmentOption.v070.slice(0,5) != clickableElementUrl.slice(-5) && c < 50);
				
				if (c < 50) {
					ClickableElement = [];
					//24 stellig für Name , 10 stellig für Werte, 2 Leerzeichen, 5 stellig für Obergrenze, 1 Leerzeichen, 5 stellig für Untergrenze, 1 Leerzeichen, 1 stellig für Nachkommastellen, 1 Leerzeichen, 5 stellig für Einheit
					for (var j = 70; j < 90; j++) {
						var rtosVariable = "v0" + j;
						var option = adjustmentOption[rtosVariable];
						
						/*if (option.trim() == '' || option.trim().toUpperCase() == 'X') {
							//leere rtos-Variablen ignorieren
						}
						else {*/
													
							var item = new Object();

							item['idx'] = j + 20;
							item['name'] = '';
							item['wert'] = '';
							item["oberGrenze"] = '';
							item["unterGrenze"] = '';
							item["nachKommaStellen"] = '';
							item["einheit"] = '';
							item["sectionIndicator"] = option.substr(59, 1);
							
	/*					if (j == 70) item["sectionIndicator"] = 'H';*/
							switch (item["sectionIndicator"]) {
								case 'H':
									item['name'] = option.substr(0, 24);
									item['wert'] = option.substr(24,35)
									break;
								case 'S':
									item['name'] = option.substr(0, 59);
									break;
								default:
									item['name'] = option.substr(0, 24);
									item['wert'] = option.substr(24,12);
									item["oberGrenze"] = option.substr(36,6);
									item["unterGrenze"] = option.substr(42,6);
									item["nachKommaStellen"] = option.substr(48,2);
									item["einheit"] = option.substr(50,9);
							}
							/*if (item.name.includes('Betriebsart')) {
								item.name = ('Handwert&#10' + item.name.trim()).padEnd(24);
								
								console.log(item.name);
							}*/
							ClickableElement.push(item);
						//}
					}
					
					//buildFaceplate();
					/*document.getElementById('btnKesselAuto').wert = 0;
					console.log(document.getElementById('btnKesselAuto'));//*/
					buildFaceplateNEW();
				}
				else {
					console.log('Error: openFaceplate');
				}				
			}	
		}	
	}
	
	if (match) showFaceplate(matchItem);
}

/*function getElementsByClassNameDisjunctionNEW(classNames) {
	if (classNames == null || classNames == undefined) return classNames;
	
	var returnList = [];
	var classNameList = classNames.trim().split(' ');
	classNameList.forEach(function(className) {
		returnList.push(document.getElementsByClassName(className));
	});
	
	return returnList;
}*/

/*function returnDivRtosVarForElement(el) {
	if (el == null || el == undefined) return el;
	
	var ret;
	do {
		ret = el.parentNode;
		if (ret == null) return null;
		el = ret;
	} while(ret.className != 'divRtosVar')
	
	return ret;
}*/
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
	var fpBg = document.getElementById('fpBg');
	//var fpBezeichnung;
	//var fpID;
	//var fpTyp;
	
	var h4fpHeader = document.getElementById('h4FpHeader');
	
	var fpBody = document.getElementById('fpBody');
	var fpSection;
	
	ClickableElement.forEach(function(el) {
		//console.log(el);
/**/	if (el.name.trim() == 'Betriebsart') el.name = ('Kessel ' + el.name.trim()).padEnd(24);
		
		if (el.sectionIndicator.toUpperCase() == 'H') h4fpHeader.innerHTML = 'Einstellungen für ' + el.wert.trim();
		
		var zwischenüberschrift;
		if (el.name.includes('Betriebsart') || el.name.includes('Wochenkalender')) zwischenüberschrift = el.name.trim();
		if (el.name.includes('NennVL')) zwischenüberschrift = 'HK-Temperaturparameter';
		if (el.name.includes('20 &degC')) zwischenüberschrift = 'Pumpenkennlinie\n(nach Außentemperatur)';
		
		if (zwischenüberschrift != undefined || fpSection == undefined) {
			//Beginn neue Section
			//neue Section erzeugen & anhängen
			fpSection = document.createElement('div');
			fpBody.appendChild(fpSection);
			fpSection.className = 'fpSection';
			
			//Zwischenüberschrift erzeugen & anhängen
			var h5fpSection = document.createElement('h5');
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
		//3.Modalfenster mit eingebettets Heizkreiswochenkalender einblenden oder Fernbedienung Tab im Iframe darstellen
		//showElemementById('wochenKalenderImVisu');
		
		//waitForRtosData('V011', 32, false);
		//waitForRtosData('V011', 32, true);	//Auf Bit32-Toggle false->true warten
		
		showWochenKalenderVisu();
		activeTabID = 'wochenKalenderImVisu';
		wochenKalenderImVisuAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50,wochenKalenderImVisuCanvasContext, wochenKalenderImVisuCanvas);
	}
}

/*function waitForRtosData(rtosVar, bit, stateIfDone, maxCicles) {
	if (rtosVar == undefined || rtosVar.length != 4) return undefined;
	rtosVar = rtosVar.toUpperCase();
	if (!rtosVar.startsWith('V')) return undefined;
	
	var bitmask = 2**(32-bit);
	if (stateIfDone == undefined) stateIfDone = true;
	
	const url = 'http://172.16.0.102/JSONADD/GET?p=1&Var=sel&' + rtosVar;
	var i = 0;
	if (maxCicles == undefined || maxCicles < 1) maxCicles = 200;
	
	do {
		var fb = getData(url);
		//fb = JSON.parse(fb);
		//fb = fb[rtosVar].slice(3);		//Hex-Wert(32-Bit) isolieren
		//console.log(fb);
		fb = fb.trim().slice(-10, -2);	//Hex-Wert(32-Bit) isolieren
		fb = parseInt(fb, 16);			//Hex2Int			
		fb &= bitmask;					//VerUndung mit Bitmaske
		i++;							//für notfallausstieg/Timeout
		//console.log(fb, i);
	} while(fb == stateIfDone && i<maxCicles);
}*/

function closeModalWochenKalenderImVisu(){
	hideElemementById('wochenKalenderImVisu');
	sendData(clickableElementUrl);
	//sendValueFromVisuToRtos('closeHKWochenKalender');
	//AnchorHandler(1);	//Sprung ins Hauptmenü, wenn Kalender geschlossen wird
	//showElemementById('osk');	//osk für Faceplate öffnen
}

function showOSK(event) {
	if (event.target.id.includes('inputWert')) showElemementById('osk');	
}

function showFaceplate(matchItem) {
	const OFFSET_ICON_2_FACEPLATE_PX = 80;
	const OFFSET_FP_2_OSK = 40;
	//var faceplateBackground = showElemementById('fpBg');
	hideElemementById('visLoader');
	var faceplateContent = showElemementById('fpContent');//document.getElementById('fpContent');
	var osk = showElemementById('osk');	//osk temporär zu Anordnungsberechnung öffnen; wird am Ende wieder geschlossen!
	
	if (matchItem.x + OFFSET_ICON_2_FACEPLATE_PX + faceplateContent.offsetWidth < window.innerWidth) {
		faceplateContent.style.left = matchItem.x + OFFSET_ICON_2_FACEPLATE_PX + 'px';
		faceplateContent.offsetLeft + osk.offsetWidth < window.innerWidth ? osk.style.left = faceplateContent.style.left : osk.style.left = faceplateContent.offsetLeft + faceplateContent.offsetWidth - osk.offsetWidth + 'px';
	}
	else if (matchItem.x - OFFSET_ICON_2_FACEPLATE_PX - faceplateContent.offsetWidth > 0) {
		faceplateContent.style.left = matchItem.x - OFFSET_ICON_2_FACEPLATE_PX - faceplateContent.offsetWidth + 'px';
		faceplateContent.offsetLeft + osk.offsetWidth < window.innerWidth ? osk.style.left = faceplateContent.style.left : osk.style.left = faceplateContent.offsetLeft + faceplateContent.offsetWidth - osk.offsetWidth + 'px';
	}
	else {
		faceplateContent.style.left = '0px';
		osk.style.left = '0px';
	}
	
	if (faceplateContent.offsetTop + faceplateContent.offsetHeight + OFFSET_FP_2_OSK + osk.offsetHeight < window.innerHeight) {
		osk.style.top = faceplateContent.offsetTop + faceplateContent.offsetHeight + OFFSET_FP_2_OSK + 'px';
	}
	else if (faceplateContent.offsetLeft + faceplateContent.offsetWidth + OFFSET_FP_2_OSK + osk.offsetWidth < window.innerWidth) {
		osk.style.left = faceplateContent.offsetLeft + faceplateContent.offsetWidth + OFFSET_FP_2_OSK + 'px';
		osk.style.top = faceplateContent.offsetTop + faceplateContent.offsetHeight - osk.offsetHeight + 'px';
	}
	else {
		osk.style.left = faceplateContent.offsetLeft - osk.offsetWidth - OFFSET_FP_2_OSK + 'px';
		osk.style.top = faceplateContent.offsetTop + faceplateContent.offsetHeight - osk.offsetHeight + 'px';
		if (osk.offsetLeft < 0) {
			osk.style.left = '0px';
			faceplateContent.style.left = osk.offsetWidth + 'px';//faceplateContent.offsetLeft + Math.abs(osk.offsetLeft) + 'px';
			//osk.style.top = osk.offsetTop - OFFSET_FP_2_OSK + 'px';
		}
	}
	hideElemementById('osk'); //Anordnungsberechnung abgeschlossen -> osk ausblenden!
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