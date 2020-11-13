var deployedVisuFile = "./Visu/Visu.txt";
var visuDataFile = "./DATA/visdat.txt";
var zahlerDataFile = "./DATA/zaehl.txt";
// Diverse globale Variablen
// Vorgehensweise analog zu der in VCO_Edit.aspx
var prj;
var IdVisu;
var canvas;
var vctx;
var visudata;
var bmpIndex = 0;
var VisuDownload = {};
var LinkButtonList = [];
var canvasOffset;
var offsetX;
var offsetY;
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
var xStoerButton;
var yStoerButton;
var xStoerButtonBot;
var yStoerButtonBot;
var xZaehlerButtonNeu;
var xZaehlerButtonNeuBot;
var yZaehlerButtonNeu;
var yZaehlerButtonNeuBot;


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
    var resWithoutDate = res.substring(27);
	var index = resWithoutDate.lastIndexOf('\x1b\x1b\x44\x34');
	return resWithoutDate.substr(0, index -1);
}


function closeModal()
{
	var modal = document.getElementById('myModal');
	var span = document.getElementById("closeModal");
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

function startVisu() {

	wInit = window.outerWidth;
	hInit = window.outerHeight;
	bAutoReload = false;
	canvas = document.getElementById('myvCanvas');
	canvas.width = 1400;
	canvas.height = 630;
	vctx = canvas.getContext('2d');

	// test listener for stoerung
	canvas.addEventListener("mousedown", getPosition, false);
	
	vtipCanvas = document.getElementById("vtipCanvas");
	vtipCanvas.style.left = "-2000px";
	tipvctx = vtipCanvas.getContext("2d");

	canvasOffset = $("#myvCanvas").offset();
	offsetX = canvasOffset.left;
	offsetY = canvasOffset.top;
	 
	// Laden
	//Read deployed visufile /visu/visu.txt 
	visudata = $.parseJSON(readFromTextFile(deployedVisuFile));
	prj = visudata.VCOData.Projektnumer;
	try {
		//read visudata from visdat.txt
		var rawvisuData = readFromTextFile(visuDataFile);
		//create visuitem from rawdata
		//remove all json parser coz lokale data tranfer
		createVisudata(rawvisuData);
		var Stoerungen = VisuDownload.Stoerungen;
		var stoerungencount = Stoerungen.length;

		for (var i = 0; i < stoerungencount; i++) {
			stoerungText += Stoerungen[i].BezNr + ". " + Stoerungen[i].StoerungText.trim() + "<br/>";
		}
		//alert(stoerungText);
		var u = k;

	}
	catch (e) {
		log(e.message);
		log("Es konnten keine Visualisierungsdaten heruntergeladen werden von Steuerung " + prj);
	}
	//var Projektname = getProjektName(prj);
	// Tooltips einlesen
	initTooltips();

	//initBGColors();

	$("#myvCanvas").mousemove(function (e) {
		handleMouseMove(e);
	});

	$("#myvCanvas").mousedown(function (e) {
		handleMouseDown(e);
	});
	setBitmap(bmpIndex);
	DrawVisu();
	findLabelAnstehendeStoerung();
	//getCoordinateOfCanvasButton();
}

/* function getCoordinateOfCanvasButton()
{
	var FreitextList = visudata.FreitextList;
	var n = FreitextList.length;
	for (i = 0; i < n; i++) {
		if (FreitextList[i].Freitext == "anstehende Störungen") {
			xStoerButton = FreitextList[i].x - 6;
			yStoerButton = FreitextList[i].y - 22;
			xStoerButtonBot = FreitextList[i].x + 200;
			yStoerButtonBot = FreitextList[i].y + 18;
		}
		
		if (FreitextList[i].Freitext == "Zähler anzeigen" & FreitextList[i].BgColor == "slateBlue ") {
			xZaehlerButtonNeu = FreitextList[i].x - 6;
			yZaehlerButtonNeu = FreitextList[i].y - 22;
			xZaehlerButtonNeuBot = FreitextList[i].x + 130; 
			yZaehlerButtonNeuBot = FreitextList[i].y + 18;
		}
	}
} */


/*This function was written in C# as WebService and called per ajax
Source can be found at Visutool.cs VisuObject class
Rawdata was read from RD02 folder and will be processed to return Visudownload, no more changed need to be made.

There is no List data structure in Javascript so nested array will be use instead. 
Datastructure of Visudownload will be nested array + array of object
*/

function createVisudata(sText){
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
			item.Wert = sText.substr((idx + 10), 1);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert >0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			item.Wert = sText.substr((idx + 10), 7);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert >0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			item.Wert = sText.substr((idx + 10), 7);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert > 0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			item.Wert = sText.substr((idx + 10), 7);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert>0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			item.Wert = sText.substr((idx + 10), 7);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert>0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			item.Wert = sText.substr((idx + 10), 7);
			//item.Wert *= 0.01;
			item.isBool = true;
			item.BoolVal = item.Wert>0;
			item.EinheitText = getVisuItemEinheit(item.iEinheit);
			Items.push(item);
			sText= sText.slice((idx+17), sText.length);
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
			return "m^3/h";
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
			return "m^3";
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

// click event on canvas

function getPosition(event) {
	var x = event.x -offsetX;
	var y = event.y -offsetY;

	//click event für das anstehende Störungen button
	if (((x - xStoerButton > 0) && (xStoerButtonBot - x > 0)) && ((y - yStoerButton > 0) && (yStoerButtonBot - y > 0))) {


		var vcanvas = document.getElementById("myvCanvas");
		var modal = document.getElementById('myModal');
		window.onclick = function (event) {
			if (event.target == modal) {
				modal.style.display = "none";
			}
		}

		//alert(stoerungText);
		if (stoerungText != "") {
			document.getElementById("modalHeader").innerHTML = '<h5> Aktuelle Störungen' + '<span id="closeModal" class="close">&times;</span>';
			document.getElementById("modalContent").style.width = '30%';
			document.getElementById("modalBody").innerHTML =  stoerungText ;
			var span = document.getElementById("closeModal");
			span.onclick = function () {
				modal.style.display = "none";
			}
		}
		else {
			document.getElementById("modalHeader").innerHTML = '<h5> Aktuelle Störungen' + '<span id="closeModal" class="close">&times;</span>';
			document.getElementById("modalContent").style.width = '30%';
			document.getElementById("modalBody").innerHTML = "keine weiteren Störungen";
			var span = document.getElementById("closeModal");
			span.onclick = function () {
				modal.style.display = "none";
			}
		}
		modal.style.display = "block";

	}

	//click event für das neue Zähler button, die Ohne verweis auf Zähler.png funktioniert
	if (((x - xZaehlerButtonNeu > 0) && (xZaehlerButtonNeuBot - x > 0)) && ((y - yZaehlerButtonNeu > 0) && (yZaehlerButtonNeuBot - y > 0))) {
		//alert("on area");
		var canvas = document.getElementById("myvCanvas");
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
			document.getElementById("modalHeaderZaehler").innerHTML = '<h5> Zähler: ' + Projektname + " " + datetime + '<span id="closeModalZaehler" class="close">&times;</span>';
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


// Mouse Handler für Tooltip Anzeige
function handleMouseMove(e) {

	var currentBmpIndex = bmpIndex;
	var match = false;
	for (var i = 0; i < tt_dots.length; i++) {
		mouseX = parseInt(e.clientX - offsetX);
		mouseY = parseInt(e.clientY - offsetY);
		var dx = mouseX - tt_dots[i].x;
		var dy = mouseY - tt_dots[i].y;
		var txt = tt_dots[i].t;
		var index = tt_dots[i].index
		if ((dx * dx < 1600) && (dy * dy < 200) && (dx > 0) && (dy < 0) && (index == currentBmpIndex)) {

			vtipCanvas.style.left = (tt_dots[i].x) + "px";
			vtipCanvas.style.top = (tt_dots[i].y - 40) + "px";
			tipvctx = vtipCanvas.getContext("2d");
			tipvctx.clearRect(0, 0, vtipCanvas.width, vtipCanvas.height);
			//                  tipvctx.rect(0,0,vtipCanvas.width,vtipCanvas.height);
			tipvctx.font = "12px Arial";
			tipvctx.fillText(txt, 5, 15);
			match = true;

		}
		if (!match) {
			vtipCanvas.style.left = "-2000px";
		}
	}
}

// Tooltip pushen
function pushToolTip(px, py, txt, idx) {
	tt_dots.push({
		x: px,
		y: py,
		t: txt,
		index: idx
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
			pushToolTip(DropList[i].x, DropList[i].y, DropList[i].ToolTip, DropList[i].bmpIndex);
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
		requestDrawingFlag = false;
		DrawVisu();
	}

}


// Diverse Zeichenfunktionen wie im Editor


function Absenkung(vctx, x, y, scale, active) {
	vctx.save();
	vctx.moveTo(0 - 10 * scale, 0);
	vctx.font = '10pt Arial';
	vctx.fillStyle = 'blue';

	vctx.translate(x, y);

	if (active == 1)
		vctx.fillText('Nacht', 0, 0);
	else
		vctx.fillText('Tag', 1, 0);

	vctx.restore();
}


function BHDreh(vctx, x, y, scale, rotation) {
	vctx.save();
	vctx.lineWidth = 1 * scale;
	vctx.translate(x, y);
	vctx.rotate(Math.PI / 180 * rotation);
	vctx.strokeStyle = "steelblue";
	vctx.beginPath();
	vctx.arc(0, 0, 13 * scale, 0, Math.PI * 2, true);

	vctx.moveTo(0 + 10 * scale, 0);
	vctx.arc(0, 0, 10 * scale, 0, -Math.PI / 4, true);
	vctx.moveTo(0 + 10 * scale, 0);
	vctx.arc(0, 0, 10 * scale, 0, Math.PI / 4, false);

	vctx.moveTo(0 - 10 * scale, 0);
	vctx.arc(0, 0, 10 * scale, Math.PI, -3 * Math.PI / 4, false);
	vctx.moveTo(0 - 10 * scale, 0);
	vctx.arc(0, 0, 10 * scale, Math.PI, 3 * Math.PI / 4, true);
	vctx.stroke();

	vctx.lineWidth = 3 * scale;

	vctx.beginPath();
	vctx.moveTo(0 - 10 * scale, 0);
	vctx.lineTo(0 + 10 * scale, 0);

	vctx.stroke();
	vctx.restore();
}


function feuer(vctx, x, y, scale) {
	// 30x48
	var rd1 = (Math.random() - 0.5) * 3;
	var rd2 = (Math.random() - 0.5) * 3;
	var rd3 = (Math.random() - 0.5) * 3;
	var rd4 = (Math.random() - 0.5) * 3;
	var rd5 = (Math.random() - 0.5) * 3;
	var rd6 = (Math.random() - 0.5) * 3;
	vctx.save();

	vctx.lineWidth = 1;
	vctx.translate(x, y);
	vctx.scale(scale, scale);
	vctx.strokeStyle = "red";
	vctx.fillStyle = "yellow";
	vctx.beginPath();
	vctx.moveTo(0 + rd1, -20);
	vctx.lineTo(-5 + rd2, -10);
	vctx.lineTo(-8 + rd3, -5);
	vctx.lineTo(-7 + rd4, 5);
	vctx.lineTo(-2 + rd5, 10);

	vctx.lineTo(2 + rd5, 10);
	vctx.lineTo(4 + rd4, 5);
	vctx.lineTo(6 + rd6, -5);
	vctx.lineTo(5 + rd2, -10);
	vctx.lineTo(0 + rd1, -20);
	vctx.fill();
	vctx.stroke();

	//vctx.closePath();
	vctx.restore();
}

function pmpDreh2(vctx, x, y, scale, rot) {
	// 12x12
	vctx.save();
	vctx.strokeStyle = "black";
	vctx.fillStyle = "black";
	vctx.lineWidth = 1;
	vctx.translate(x, y);
	vctx.rotate(Math.PI / 180 * rot);
	vctx.scale(scale, scale);
	vctx.beginPath();
	vctx.arc(0, 0, 11, 0, Math.PI * 2, true);
	vctx.stroke();
	vctx.closePath();
	vctx.beginPath();
	vctx.lineWidth = 1, 5;
	vctx.arc(0, 0, 6, 0, Math.PI * 2, true);
	vctx.fillStyle = 'black';
	vctx.fill();
	vctx.closePath();
	vctx.beginPath();
	vctx.arc(0, 0, 6, startAngle, endAngle, true);
	vctx.lineTo(0, 0);
	vctx.fillStyle = 'white';
	vctx.fill();
	vctx.closePath();

	vctx.stroke();
	vctx.restore();
}

function drawEllipse(vctx, x, y, w, h) {
	var kappa = .5522848,
		ox = (w / 2) * kappa, // control point offset horizontal
		oy = (h / 2) * kappa, // control point offset vertical
		xe = x + w,           // x-end
		ye = y + h,           // y-end
		xm = x + w / 2,       // x-middle
		ym = y + h / 2;       // y-middle


	vctx.moveTo(x, ym);
	vctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
	vctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
	vctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
	vctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
	//vctx.closePath(); // not used correctly, see comments (use to close off open path)
	vctx.stroke();
}

function luefter(vctx, x, y, scale, rotL, rotDir) {
	// 51x51
	vctx.save();
	vctx.strokeStyle = "black";
	vctx.fillStyle = "grey";
	vctx.lineWidth = 1;
	vctx.translate(x, y);
	vctx.rotate(Math.PI / 180 * rotDir);
	vctx.scale(scale, scale);
	vctx.beginPath();
	vctx.arc(0, 0, 24, 0, Math.PI * 2, true);
	vctx.moveTo(0, -24);
	vctx.lineTo(-23, -5);
	vctx.moveTo(0, 24);
	vctx.lineTo(-23, 5);
	vctx.stroke();
	vctx.closePath();
	vctx.beginPath();
	vctx.rotate(Math.PI / 180 * rotL);
	drawEllipse(vctx, 0, -5, 22, 10);
	drawEllipse(vctx, -22, -5, 22, 10);
	vctx.fill();

	vctx.restore();
}

function ventil(vctx, x, y, scale, rot) {
	// 6x6
	vctx.save();
	vctx.strokeStyle = "black";
	vctx.fillStyle = "black";
	vctx.lineWidth = 1;
	vctx.translate(x, y);
	vctx.rotate(Math.PI / 180 * rot);
	vctx.scale(scale, scale);
	vctx.beginPath();
	vctx.fillRect(-3, -1, 3, 2);
	vctx.moveTo(0, 3);
	vctx.lineTo(3, 0);
	vctx.lineTo(0, -3);
	vctx.fill();

	vctx.restore();
}

function Led(vctx, x, y, scale, col) {


	vctx.save();
	vctx.strokeStyle = "black";
	vctx.fillStyle = "#aaa";
	vctx.lineWidth = 1;
	vctx.translate(x, y);
	vctx.scale(scale, scale);
	vctx.beginPath();

	vctx.arc(0, 0, 6, 0, Math.PI * 2, true);
	vctx.stroke();
	vctx.fill();
	vctx.closePath();
	vctx.beginPath();
	vctx.arc(0, 0, 4, 0, Math.PI * 2, true);
	vctx.fillStyle = col;
	vctx.fill();
	vctx.restore();
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
	mx = parseInt(e.clientX - offsetX);
	my = parseInt(e.clientY - offsetY);
	var n = LinkButtonList.length;
	for (var i = 0; i < n; i++) {
		var item = LinkButtonList[i];
		if (mx > item.x_min && mx < item.x_max && my > item.y_min && my < item.y_max) {
			//log(item.x + " " + item.y);
			//log(item.x_min + " " + item.x_max + " " + item.y_min + " " + item.y_max + " - " + mx + " / " + my);
			bmpIndex = item.bmp;
			setBitmap(bmpIndex);
			requestDrawing();
		}
	}
}


// Zeichen-Hauptfunktion. Wird bei Bedarf von Timer aufgerufen
function DrawVisu() {
	vctx.clearRect(0, 0, canvas.width, canvas.height);
	drawTextList();
	drawPropertyList();
}

// Linkbutton in Liste eintragen
function addLinkButtonToList(x, y, w, h, orientation, targetBmp) {
	var item = new Object();
	item["x"] = x;
	item["y"] = y;
	if (orientation == "hor") {
		item["x_min"] = x - 6;
		item["y_min"] = y - h - 6;
		item["x_max"] = x + w + 16;
		item["y_max"] = y + 6;
		item["bmp"] = targetBmp;
	}
	if (orientation == "up") {
		item["x_min"] = x - h - 16;
		item["y_min"] = y - w - 16;
		item["x_max"] = x + 6;
		item["y_max"] = y + 6;
		item["bmp"] = targetBmp;
	}

	if (orientation == "dn") {
		item["x_min"] = x - 6;
		item["y_min"] = y - 6;
		item["x_max"] = x + h + 16;
		item["y_max"] = y + w + 6;
		item["bmp"] = targetBmp;
	}

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

				if (item.Symbol == "Absenkung") {
					if (svalue.trim() == "1")
						Absenkung(vctx, item.x, item.y, 1, 1);
					else
						Absenkung(vctx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Feuer") {
					if (svalue.trim() == "1")
						feuer(vctx, item.x, item.y, 1);
				}

				if (item.Symbol == "BHKW") {
					if (svalue.trim() == "1")
						BHDreh(vctx, item.x, item.y, 1, TimerCounter * 30);
					else
						BHDreh(vctx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Pumpe") {
					if (svalue.trim() == "1")
						pmpDreh2(vctx, item.x, item.y, 1, TimerCounter * 30);
					else
						pmpDreh2(vctx, item.x, item.y, 1, 0);
				}

				if (item.Symbol == "Luefter") {
					var angle = 30;
					if (svalue.trim() == "1")
						angle = TimerCounter * 30;

					if (item.SymbolFeature == "Links") {
						luefter(vctx, item.x, item.y, 1, angle, 0);
					}
					if (item.SymbolFeature == "Rechts") {
						luefter(vctx, item.x, item.y, 1, angle, 180);
					}
					if (item.SymbolFeature == "Oben") {
						luefter(vctx, item.x, item.y, 1, angle, 90);
					}
					if (item.SymbolFeature == "Unten") {
						luefter(vctx, item.x, item.y, 1, angle, 270);
					}
				}

				if (item.Symbol == "Ventil") {
					if (svalue.trim() == "1") {

						if (item.SymbolFeature == "Links") {
							ventil(vctx, item.x, item.y, 2, 180);
						}
						if (item.SymbolFeature == "Rechts") {
							ventil(vctx, item.x, item.y, 2, 0);
						}
						if (item.SymbolFeature == "Oben") {
							ventil(vctx, item.x, item.y, 2, 270);
						}
						if (item.SymbolFeature == "Unten") {
							ventil(vctx, item.x, item.y, 2, 90);
						}
					}
				}

				if (item.Symbol == "Led") {
					var b = (svalue.trim() == "1");

					if (item.SymbolFeature == "unsichtbar/rot") {
						if (b)
							Led(vctx, item.x, item.y, 1, "red");
					}
					if (item.SymbolFeature == "gruen/rot") {
						if (!b)
							Led(vctx, item.x, item.y, 1, "green");
						else
							Led(vctx, item.x, item.y, 1, "red");

					}
					if (item.SymbolFeature == "unsichtbar/rot blinkend") {
						if (b) {
							if (TimerToggle)
								Led(vctx, item.x, item.y, 1, "red");
						}
					}
					if (item.SymbolFeature == "gruen/rot blinkend") {
						if (!b)
							Led(vctx, item.x, item.y, 1, "green");
						else {
							if (TimerToggle)
								Led(vctx, item.x, item.y, 1, "red");
						}
					}
				}

				hasSymbolsFlag = true;
			}
			else {
				var sz = document.getElementById("selSize");
				vctx.font = item.font;
				var w = vctx.measureText(txt).width;
				vctx.fillStyle = item.BgColor;
				vctx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
				vctx.fillStyle = item.Color;
				vctx.fillText(txt, x, y);
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
	for (i = 0; i < n; i++) {
		var item = FreitextList[i];
		if (FreitextList[i].bmpIndex == bmpIndex) {
			var x = item.x;
			var y = item.y;
			var txt = item.Freitext;
			vctx.font = item.font;
			vctx.fillStyle = item.BgColor;
			var w = vctx.measureText(txt).width;

			if (item.isVerweis) {
				vctx.save();
				vctx.translate(x, y);
				if (item.VerweisAusrichtung == "up")
					vctx.rotate(-Math.PI / 2);
				if (item.VerweisAusrichtung == "dn")
					vctx.rotate(Math.PI / 2);
				vctx.fillRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vctx.strokeStyle = "black";
				vctx.strokeRect(0 - 6, 0 - item.BgHeight - 6, w + 16, item.BgHeight + 16);
				vctx.fillStyle = item.Color;
				vctx.fillText(txt, 0, 0);
				vctx.restore();
				addLinkButtonToList(x, y, w, item.BgHeight, item.VerweisAusrichtung, item.idxVerweisBitmap)

			}
			else {
				vctx.fillRect(x - 1, y - item.BgHeight - 1, w + 2, item.BgHeight + 3);
				vctx.fillStyle = item.Color;
				vctx.fillText(txt, x, y);
			}
		}
		// get coordinate of the stoerung button
		// -6 and -22 because we want the coordinate of the rectangle
		// but the FreitextList[i].x,y give the coordinate of the text "anste.."
		// x0, yo
		if (FreitextList[i].Freitext == "anstehende Störungen") {
			xStoerButton = FreitextList[i].x - 6;
			yStoerButton = FreitextList[i].y - 22;
			xStoerButtonBot = FreitextList[i].x + 200;
			yStoerButtonBot = FreitextList[i].y + 18;
		}

		//get coordinate of button zähler archiv
		
		if (FreitextList[i].Freitext == "Zähler Archiv") {
			xArchivButton = FreitextList[i].x - 6;
			yArchivButton = FreitextList[i].y - 22;
			xArchivButtonBot = FreitextList[i].x + 105;
			yArchivButtonBot = FreitextList[i].y + 18;
		}

		//get coordinate of button zähler anzeigen
		if (FreitextList[i].Freitext == "Zähler anzeigen" & FreitextList[i].BgColor == "slateBlue ") {
			xZaehlerButtonNeu = FreitextList[i].x - 6;
			yZaehlerButtonNeu = FreitextList[i].y - 22;
			xZaehlerButtonNeuBot = FreitextList[i].x + 130; 
			yZaehlerButtonNeuBot = FreitextList[i].y + 18;
		}

		//get coordinate of Button IPKamera1
		if (FreitextList[i].Freitext == "IP Kamera 1" &  FreitextList[i].BgColor == "#ff9966") {
			xIPKamera1Button = FreitextList[i].x - 6;
			yIPKamera1Button = FreitextList[i].y - 22;
			xIPkamera1ButtonBot = FreitextList[i].x + 105;
			yIPkamera1ButtonBot = FreitextList[i].y + 18;
		}

		//get coordinate of Button IPKamera1
		if (FreitextList[i].Freitext == "IP Kamera 2" & FreitextList[i].BgColor == "#ff9966") {
			xIPKamera2Button = FreitextList[i].x - 6;
			yIPKamera2Button = FreitextList[i].y - 22;
			xIPkamera2ButtonBot = FreitextList[i].x + 105;
			yIPkamera2ButtonBot = FreitextList[i].y + 18;
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
		//Kommentar...
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


function findLabelAnstehendeStoerung() {
	//find the freitext "anstehende Störungen" and create this onlick function
	var elem = document.getElementById('myvCanvas');
	elemLeft = elem.offsetLeft,
	elemTop = elem.offsetTop,
	context = elem.getContext('2d'),
	elements = [];

	elem.addEventListener('click', function (event) {
		var x = event.pageX - elemLeft,
			y = event.pageY - elemTop;

		// Collision detection between clicked offset and element.
		elements.forEach(function (element) {
			if (y > element.top && y < element.top + element.height
				&& x > element.left && x < element.left + element.width) {
				alert('clicked an element');
			}
		});
	})
}


/*
Image will be load every second to simulate video streaming
No parameter was passed and no return value coz setInterval requirement
*/
function simVideoStream() {
	var IpCamSnap = 'http://10.0.5.26:8880/action/snap?cam=0&user=admin&pwd=12345';
	var imgBox1 = document.getElementById('ImgBox1');
	var imgBox2 = document.getElementById('ImgBox2');
	var image = 'data:image/png;base64,' + getImage(IpCamSnap);
	var ImgBox1 = document.getElementById('ImgBox1');
	var ImgBox2 = document.getElementById('ImgBox2');
	ImgBox1.src = image;
	ImgBox2.src = image;
}


