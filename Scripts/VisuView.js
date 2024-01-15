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
		var Stoerungen = [];
		var Items = [];
		var Projektnummer = sText.substring(0,5);
		var index = 0;
		
		do
		{
			var stoerung = {};
			idx = sText.indexOf("STOE");
			if(idx >=0)
			{
				stoerung.BezNr = sText.substring((idx + 4), idx +7); //4 Zeichen lang
				stoerung.StoerungText = sText.substring(idx + 7, idx + 27);
				Stoerungen.push(stoerung);
				var textToCut = sText.substring(idx, idx + 27);
				sText = sText.replace(textToCut,'');
			}
			
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("HKNA");
			if (idx >= 0)
			{
				item.Bezeichnung = "HKNA";
				item.Kanal = sText.substring(idx + 4, idx + 6);
				item.isBool = false;
				item.BoolVal = false;
				item.sWert = sText.substring(idx + 6, idx + 26);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 26);
				sText = sText.replace(textToCut,'');
				// sText= sText.slice((idx + 26), sText.length);
			}
		}
		while (idx >= 0);



		do
		{
			var item = {};
			idx = sText.indexOf("KES");
			if (idx >= 0)
			{
				item.Bezeichnung = "KES";
				item.Kanal = sText.substring(idx + 3, idx + 5);
				item.isBool = false;
				item.BoolVal = false;
				item.sWert = sText.substring(idx + 6, idx + 13);
				if (item.sWert == 'CLICK')
				{
					item.Wert = 2;
				}
				else
				{
					item.Wert = sText.substring(idx + 12, idx + 13);
				}
				
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 13);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+14), sText.length);
			}
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("BHK");
			if (idx >= 0)
			{
				item.Bezeichnung = "BHK";
				item.Kanal = sText.substring(idx + 3, idx + 5);
				item.isBool = false;
				item.BoolVal = false;
				item.sWert = sText.substring(idx + 6, idx + 13);
				if (item.sWert == 'CLICK')
				{
					item.Wert = 2;
				}
				else
				{
					item.Wert = sText.substring(idx + 12, idx + 13);
				}
				
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 13);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+14), sText.length);
			}
		}
		while (idx >= 0);


		do
		{
			var item = {};
			idx = sText.indexOf("WWL");
			if (idx >= 0)
			{
				item.Bezeichnung = "WWL";
				item.Kanal = sText.substring(idx + 3, idx + 5);
				item.isBool = false;
				item.BoolVal = false;
				item.sWert = sText.substring(idx + 6, idx + 13);
				if (item.sWert == 'CLICK')
				{
					item.Wert = 2;
				}
				else
				{
					item.Wert = sText.substring(idx + 12, idx + 13);
				}
				
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 13);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+14), sText.length);
			 }
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("HK ");
			if (idx >= 0)
			{
				item.Bezeichnung = "HK ";
				item.Kanal = sText.substring(idx + 3, idx + 5);
				item.isBool = false;
				item.BoolVal = false;
				item.sWert = sText.substring(idx + 6, idx + 13);
				if (item.sWert == 'CLICK')
				{
					item.Wert = 2;
				}
				else
				{
					item.Wert = sText.substring(idx + 12, idx + 13);
				}
				
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 13);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+14), sText.length);
			  }
		}
		while (idx >= 0);		
		
		do
		{
			var item = {};
			idx = sText.indexOf("PMK");
			if(idx >=0)
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
			}
			
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PMB");
			if(idx >=0)
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
			}
			
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PMW");
			if(idx >=0)
			{
				item.Bezeichnung = "PMW";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
			}
			
		}
		while (idx >= 0);

		do
		{
			var item = {};
			idx = sText.indexOf("PWP");
			if(idx >=0)
			{
				item.Bezeichnung = "PWP";
				item.Kanal = sText.substr((idx + 3), 2);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert >0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert >0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert > 0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
			}
		}
		while (idx >= 0);
		
		do
		{
			var item = {};
			idx = sText.indexOf("SP");
			if (idx >= 0)
			{
				item.Bezeichnung = "SP";
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 1);
				//item.Wert *= 0.01;
				item.isBool = true;
				item.BoolVal = item.Wert>0;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 11);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+11), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 10);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 20);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
				item.Kanal = sText.substr((idx + 2), 3);
				item.Nachkommastellen = sText.substr((idx + 6), 1);
				item.iEinheit = sText.substr((idx + 8), 2);
				item.Wert = sText.substr((idx + 10), 7);
				//item.Wert *= 0.01;
				item.isBool = false;
				item.BoolVal = false;
				item.EinheitText = getVisuItemEinheit(item.iEinheit);
				Items.push(item);
				var textToCut = sText.substring(idx, idx + 17);
				sText = sText.replace(textToCut,'');
				//sText= sText.slice((idx+17), sText.length);
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
		case "2":
			return "bar";
		case "3":
			return "V";	
		case "4":
			return "kW";
		case "5":
			return "m³/h";
		case "6":
			return "mWS";
		case "7":
			return "%";
		case "8":
			return "kWh";
		case "9":
			return "Bh";	
		case "10":
			return "m³";
		case "11":
			return "°C\u00F8";
		case "12":
			return "mV";	
		case "13":
			return "UPM";
		case "14":
			return "s";
		case "15":
			return "mbar";
		case "16":
			return "A";
		case "17":
			return "Hz";
		case "18":
			return "l/h";
		case "19":
			return "l";
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


function Heizkreis(vDynCtx, x, y, betrieb) {
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
    vDynCtx.beginPath()
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

    if (betrieb == '0') {

    }
    else {
        //vDynCtx.font = "12px Arial";
        //vDynCtx.fillText("Handbetrieb", x - 20, y + 24);
        vDynCtx.translate(x,y)
        vDynCtx.moveTo(40, 27);
        vDynCtx.lineTo(40, 10);
        vDynCtx.arc(38, 8, 2, 2 * Math.PI, 1 * Math.PI, true);
        vDynCtx.lineTo(36, 16);
        vDynCtx.arc(34, 6.5, 2, 2 * Math.PI, 1 * Math.PI, true);
        vDynCtx.lineTo(32, 15);
        vDynCtx.arc(30, 5.5, 2, 2 * Math.PI, 1 * Math.PI, true);
        vDynCtx.lineTo(28, 15);
        vDynCtx.arc(26, 6.5, 2, 2 * Math.PI, 1 * Math.PI, true);
        vDynCtx.lineTo(24, 20);
        vDynCtx.lineTo(20, 16);
        vDynCtx.arc(19, 17.8, 2, 1.8 * Math.PI, 0.8 * Math.PI, true);
        vDynCtx.lineTo(26, 27);
        vDynCtx.lineTo(40, 27);
        vDynCtx.fillStyle = 'yellow';
        vDynCtx.scale(1, 1)
        vDynCtx.fill();
        //vDynCtx.stroke();
    }
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
	//patch 29.12.22/ entspr. Webtermpatch 22.11.2022: doppelte (kleinere) Pfeile
	vDynCtx.fillRect(-1.5, -1, 1.5, 2);
	vDynCtx.moveTo(0, 2);
	vDynCtx.lineTo(2, 0);
	vDynCtx.lineTo(0, -2);
	vDynCtx.fill();
	vDynCtx.translate(11, 0);
	vDynCtx.fillRect(-1.5, -1, 1.5, 2);
	vDynCtx.moveTo(0, 2);
	vDynCtx.lineTo(2, 0);
	vDynCtx.lineTo(0, -2);
	vDynCtx.fill();

	vDynCtx.restore();
}

function lueftungsklappe(ctx, x, y, scale, val, orientation = 'Links', isNC = true) {
    let rotation = 0;
    if (orientation == 'Oben') rotation = 90;
    if (orientation == 'Rechts') rotation = 180;
    if (orientation == 'Unten') rotation = 270;
	if (!val) val = 0;
	if (isNC) val = 100 - val;
    rotation -= val/100 * 75;
    
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    //Kreis zeichnen
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'black';
    ctx.fill();

    
    ctx.rotate(rotation * Math.PI / 180);
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);

    ctx.stroke();
    ctx.restore();
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

function freitext(ctx, x, y, scale, font, color, txt, bgHeight, bgColor, active) {
    if (txt.startsWith('!')) {  //führendes '!' in SymbolFeature als Invertierungsindikator!
        txt = txt.replace('!','');
        active = !active;
    }
    if (!active) return;
    
    ctx.save();
    ctx.moveTo(0 - 10 * scale, 0);

    var w = ctx.measureText(txt).width;
    ctx.font = font;
    if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x - 1, y - bgHeight - 1, w + 2, bgHeight + 3);
    }
    
    ctx.translate(x, y);
    
    ctx.fillStyle = color;
    ctx.fillText(txt, 0, 0);

    ctx.restore();
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
			if ((values[i].Bezeichnung == "HKNA") && (vco.Kanal == values[i].Kanal)) {
                        svalue = values[i].sWert;
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
						Heizkreis(vDynCtx, item.x, item.y, 0);
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

				if (item.Symbol == "Lueftungsklappe" || item.Symbol == "Abluftklappen") {
					let val = parseFloat(svalue.trim());
					if (val == 1) val = 100;
					lueftungsklappe(vDynCtx, item.x, item.y, 1, val, item.SymbolFeature);                            
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
					if (item.SymbolFeature == "rot/gruen") {
						if (!b)
							Led(vDynCtx, item.x, item.y, 1, "red");
						else
							Led(vDynCtx, item.x, item.y, 1, "green");

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

				if (item.Symbol == "Freitext") {
					const val = (svalue.trim() == "1")
					freitext(vDynCtx, item.x, item.y, 1, item.font, item.Color, item.SymbolFeature, item.BgHeight, item.BgColor, val);
				}

				hasSymbolsFlag = true;
			}
			else {
				var sz = document.getElementById("selSize");
				vDynCtx.font = item.font;
				var w = vDynCtx.measureText(txt).width;
				vDynCtx.fillStyle = item.BgColor;
				if (item.BgColor && item.BgColor != '#BEBEBE' && item.BgColor != '#E0E0E0') vDynCtx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
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
				if (item.BgColor) vStatCtx.fillRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vStatCtx.strokeStyle = "black";
				vStatCtx.strokeRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vStatCtx.fillStyle = item.Color;
				vStatCtx.fillText(txt, 0, 0);
				vStatCtx.restore();
				addLinkButtonToList(x, y, w, item.BgHeight, item.VerweisAusrichtung, item.idxVerweisBitmap, txt);
			}
			else {
				if (item.BgColor) vStatCtx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
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

