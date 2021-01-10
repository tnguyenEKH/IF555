	var QHHeaderFile = "./DATA/vierttx.txt";
	var QHSettingFile = "http://172.16.0.101/Data/QHSetting.txt"
    var Steuerung = "";
    var canvas;
    var qctx;
    var canvasOffset;
    var offsetX;
    var offsetY;

    // Diagramm: Feste Werte für Positionierung
    var diagramLeft = 10;
    var diagramTop = 10;
    var diagramWidth = 650;
    var diagramHeight = 510;

    // Farbvorgaben
    var diagramColorBG = "white";
    var diagramColorGrid = "black";
    var diagramColorSkala = "black";
    var diagramColorSkalaLinks = "red";

    // weitere Vorgaben
    var diagramZeitraum = "d";
    var diagramForceQH = false;

    // Effektive Zeichenfläche für Daten. Von DrawGrid() initialisiert
    var xd;
    var yd;
    var wd;
    var hd;

    // Skalierungswerte. Werden beim Laden der Usersettings überschrieben
    var YLMin = 0;
    var YLMax = 110;
    var YLStep = 10;
    var YRMax = 440;
    var YRStep = 40;
	
    // von getUserSettings() gefüllt:

    var loaded_Y_Links_Max;
    var loaded_Y_Links_Min;
    var loaded_Y_Links_Schrittweite;
    var loaded_Y_Rechts_Max;
    var loaded_Y_Rechts_Schrittweite;

    // Darstellungsdatum setzen
    //var diagramDatum = prevMonth(prevMonth(InitialDatum()));
    var diagramDatum = InitialDatum();
    // Variablen für Kopf- und Spurdaten
    var diagramHeader;
    var diagramData;

    // wird von getUserSettings() gesetzt
    var UserSettings;

    var TrackInEdit;

    var inColorMenue = false;
    var inScaleMenue = false;

    var sLastUpdate;

    var QHInfo;
       
function startQH() {
        
        canvas = document.getElementById('myqCanvas');
        canvas.width = 1120;
        canvas.height =630;
        qctx = canvas.getContext('2d');
        qctx.clearRect(0, 0, canvas.width, canvas.height);
        canvasOffset = $("#myqCanvas").offset();
        offsetX = canvasOffset.left;
        offsetY = canvasOffset.top;

        diagramHeader = loadHeader(QHHeaderFile);
        diagramData = loadData();
		
		//writeToTextFile(QHSettingTestFile)
        UserSettings = getUserSettings();

        //var sQHInfo = getQH_Info_St(Steuerung);
        //QHInfo = $.parseJSON(sQHInfo);
        //var qhidx = QHInfo.LastItemIndex;

        //dLastUpdate = new Date(QHInfo.LastItemDate);
        //dLastUpdate_ms = dLastUpdate.getTime();
        //dLastUpdate_ms += qhidx * 15 * 60 * 1000;
        //dLastUpdate.setTime(dLastUpdate_ms);

        //sLastUpdate = dLastUpdate.getDate() + "." + (dLastUpdate.getMonth() + 1) + "." + dLastUpdate.getFullYear();
        //sLastUpdate += " " + dLastUpdate.getHours() + ":" + dLastUpdate.getMinutes() + " Uhr";

        //$("#LabelQHInfo").text("Letzte Aktualisierung: " + sLastUpdate);

        InitSettings();
        drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
        drawData();
        //var Projektname = getProjektName(Steuerung);
        //document.title = "1/4h Datenauswertung " + " " + Projektname;
        //OpenModalQH();
        //setTimeout(function () { document.getElementById("btnGetData").click(); }, 1000);
}



function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i == key && obj[key] == val) {
            objects.push(obj);
        }
    }
    return objects;
}


function OpenModalQH() {
    var canvas = document.getElementById("myqCanvas");
    var modal = document.getElementById('ModalQH');
    var span = document.getElementsByClassName("close")[0];
    //span.onclick = function () {
    //    modal.style.display = "none";
    //}
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
    document.getElementById("modalbody").innerHTML = "<p>" + "<h2>" + "Daten werden heruntergeladen. Bitte warten Sie!" + "<h2>" + "</p>";

    modal.style.display = "block";
}

function MeldungAndCloseModal(meldung) {
    var canvas = document.getElementById("myqCanvas");
    var modal = document.getElementById('ModalQH');
    var span = document.getElementsByClassName("close")[0];
    document.getElementById("modalbody").innerHTML = "<p>" + "<h2>" + meldung + "<h2>" + "</p>";
    setTimeout(function () { modal.style.display = "none"; }, 2000);

}

function toPixelY(value, isLeft) {
    var Min;
    var Max;
    if (isLeft) {
        Min = YLMin;
        Max = YLMax;
    }
    else {
        var nSteps = (YLMax - YLMin) / YLStep;
        //Min = YRMax - 10 * YRStep;
        Min = YRMax - nSteps * YRStep;
        Max = YRMax;
    }


    var m = (value - Min) * hd / (Max - Min);
    if (m < 0)
        m = 0;
    if (m > hd)
        m = hd;

    return yd + hd - Math.floor(m);
}

/*
try to load userSetting, if there is none exist, create a default one
*/
function getUserSettings() {
    var res;
    try
    {
		var Settings = $.parseJSON(readFromTextFile(QHSettingFile));
		UserSettings = Settings.UserSettingsObject.UserSettings;
    }
    
    catch
    {
		var settings = {};
		settings.qh_Skalierung = {"Y_Links_Max" :100,  "Y_Links_Schrittweite": 10 , "Y_Rechts_Max": 400, "Y_Rechts_Schrittweite":40};
		
		var default_colors = {0:"#00FF00", 1:"#FFA500", 2:"#FF00FF", 3:"#FF0000", 4:"#000000"};
		settings.qh_Spuren = [
			{
				bSkala_Links: true,
				index: 0,
				color: default_colors[0],
				enabled: true
			},
			{
				bSkala_Links: true,
				index: 1,
				color: default_colors[1],
				enabled: true
			},
			{
				bSkala_Links: true,
				index: 2,
				color: default_colors[2],
				enabled: true
			},
			{
				bSkala_Links: true,
				index: 3,
				color: default_colors[3],
				enabled: true
			},
			{
				bSkala_Links: true,
				index: 4,
				color: default_colors[4],
				enabled: true
			},
		]
		
		UserSettings = settings;
    }
	return UserSettings;

}

// Ist nach Änderungen aufzurufen
function updateUserSettings() {
    UserSettings.qh_Skalierung.Y_Links_Min = YLMin;
    UserSettings.qh_Skalierung.Y_Links_Max = YLMax;
    UserSettings.qh_Skalierung.Y_Links_Schrittweite = YLStep;
    UserSettings.qh_Skalierung.Y_Rechts_Max = YRMax;
    UserSettings.qh_Skalierung.Y_Rechts_Schrittweite = YRStep;

}

function loadData() {
    if (diagramZeitraum == "d") {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, diagramDatum, true, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (diagramZeitraum == "w") {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextWeek(diagramDatum)), false, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (diagramZeitraum == "m") {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextMonth(diagramDatum)), false, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (diagramZeitraum == "y") {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextYear(diagramDatum)), false, true));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
}

function drawData() {
    if (diagramData == null)
        return;
    if (diagramData.length == 0)
        return;

    qctx.save();
    qctx.translate(diagramLeft, diagramTop);
    var nQH = diagramData.length;
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var nSpuren = UserSettings.qh_Spuren.length;

    var nTracks = diagramData[0].Values.length;
    var nValues = diagramData.length;
    //var x = 1;
    if (diagramZeitraum == "d") {
        var didx = 1;
        var stepX = wd / 96;
    }
    if (diagramZeitraum == "w") {
        if (!diagramForceQH) {
            var didx = 1;
            var stepX = wd / (7 * 12);
        }
        else {
            var didx = 4;
            var stepX = wd / (7 * 96);
        }
    }

    if (diagramZeitraum == "m") {
        var didx = 1;
        var tnumday = dayInMonth(datum.m, datum.y);
        var ndata = diagramData.length;
        if (!diagramForceQH)
            //var numDays = ndata / 12;
			var numDays = tnumday;
        else
            var numDays = ndata / 96;
        var stepX = wd / (numDays * 12);
    }

    if (diagramZeitraum == "y") {
        var didx = 1;
        var ndata = diagramData.length;
        var stepX = wd / ndata;
    }

    for (var j = 0; j < nSpuren; j++) {
		var spurindex = Spuren[j].index;
		var isEnabled = Spuren[j].enabled;
		//var isEnabled = $('#' + "enableTrack_" + spurindex).prop("checked");
        var arrDaten = [];
        for (var i = 0; i < nValues; i++) {
            try {
                var valFrom = diagramData[i].Values[Spuren[j].index];
            }
            catch (e) {
                valFrom = -999;
            }
            arrDaten.push(valFrom);
        }
        if (isDauerlinie())
            arrDaten.sort(function (a, b) { return b - a });
		
		if (isEnabled){
			qctx.beginPath();
			qctx.lineWidth = 1;
			//qctx.strokeStyle = Spuren[j].color;
			qctx.fillStyle = Spuren[j].color; 
			

			//var isLeft = $('#' + "cbSettingsL_" + j).prop("checked");
			var isLeft = $('#' + "cbSettingsL_" + spurindex).prop("checked");
			for (var i = 0; i < nValues; i++) {
				if (i >=1) {
					var gXprev = xd + ((i - 1) * didx + 1) * stepX;
					var gYprev = toPixelY(arrDaten[(i - 1) * didx], isLeft);
					}
				var valFrom = arrDaten[i * didx];
				var gXFrom = xd + (i * didx + 1) * stepX;
				var gYFrom = toPixelY(valFrom, isLeft);
				var gYTo = yd + hd - (i + 1) * valFrom;
				if (i == 0 || valFrom == -999)
					qctx.moveTo(gXFrom, gYFrom);
				else
					//qctx.lineTo(gXFrom, gYFrom);
					brezLine(gXprev, gYprev, gXFrom, gYFrom);
				qctx.stroke();
			}
		}
    }
    qctx.restore();

}

function brezLine(x1, y1, x2, y2) {

	x1 |= 0; y1 |= 0; x2 |= 0; y2 |= 0; //no float values!
	var dx = x2 - x1, dy = y2 - y1; //find delta x,y
	var sx = (dx > 0) - (dx < 0), sy = (dy > 0) - (dy < 0); //sign of delta values +1 or 0 or -1
	dx *= sx; dy *= sy; //convert dx,dy to abs values use the multiple with sign
	qctx.fillRect(x1, y1, 1, 1); //start point draw always
	if (!(dx || dy)) return;    //if no any delta dx or dy stop
	var d = 0, x = x1, y = y1, v;
	if (dy < dx) //if abs delta Y less then abs delta X - iterate by X += sign of delta X (+1 or -1)
		for (v = 0 | (dy << 15) / dx * sy; x ^ x2; x += sx, d &= 32767) //v is Tan() = y/x scaled by * 32768 (sub grid step) 
			qctx.fillRect(x, y += (d += v) >> 15, 1, 1); //d accumulate += grid step, so Y take +1px for each 32768 steps.
	else //else if abs delta X less then abs delta Y - iterate by Y += sign of delta Y (+1 or -1)
		for (v = 0 | (dx << 15) / dy * sx; y ^ y2; y += sy, d &= 32767) //v is Ctn() = x/y scaled by * 32768 (sub grid step)
			qctx.fillRect(x += (d += v) >> 15, y, 1, 1); // d &= 32767 is accumulator partial emptyer
}

function createDataRequestObject(Steuerung, DatumFrom, DatumTo, bViertelstunden, bJahresdaten) {
    var obj = new Object();
    obj.Steuerung = Steuerung;
    obj.DatumFrom = DatumFrom;
    obj.DatumTo = DatumTo;
    if (bViertelstunden == true)
        obj.bViertelstunden = true;
    else
        obj.bViertelstunden = false;
    if (bJahresdaten == true)
        obj.bJahresdaten = true;
    else
        obj.bJahresdaten = false;
	//JSON Convert to hand over Webservice
    //var sobj = JSON.stringify({ 'RequestObject': obj });
    return obj;
}


function loadHeader(QHHeaderFile) {
	var shdr = readFromTextFile(QHHeaderFile);
	var header = [];
	/*
	3  : Platzhalter für Anzahl der Spuren
	5  : Platzhalter für Einheit*
	20 : Platzhalter fürBezeichnung
	*/
	var nDigits = 3;
	var headerEinheintenLength = 5;
	var headerBezeichnungLength = 20;
	var numberOfHeader = shdr.substr(41,3).trim();
	for(var i=0; i < numberOfHeader;  i++)
	{
		var item = {};
		item.Index = i;
		item.Einheit = shdr.substr((44 + i*headerEinheintenLength), headerEinheintenLength).trim();
		item.Bezeichnung = shdr.substr ((44 + numberOfHeader*headerEinheintenLength + i*headerBezeichnungLength) , headerBezeichnungLength).trim();
		header.push(item);
	}
    return header;
}

function loadDataTrackNumber(QHHeaderFile) {
	var shdr = readFromTextFile(QHHeaderFile);
	var header = [];
	/*
	3  : Platzhalter für Anzahl der Spuren
	5  : Platzhalter für Einheit*
	20 : Platzhalter fürBezeichnung
	*/
	var nDigits = 3;
	var headerEinheintenLength = 5;
	var headerBezeichnungLength = 20;
	var numberOfHeader = shdr.substr(41,3).trim();

    return numberOfHeader;
}

function getQH_Info_St(AllRecords) {
    var lastElement = AllRecords[AllRecords.length -1];
    return lastElement.Datum;
}


function saveUserSettings(UserSettingsObject) {
    var res = "failed";
	res = writeToTextFile(UserSettingsObject)
    return res;
}


//find records from allQHDataRecords
function requestData(DataRequestObject) {
    var res = [];
	var dtFrom = new Date(DataRequestObject.DatumFrom.y, DataRequestObject.DatumFrom.m -1, DataRequestObject.DatumFrom.d);
	var dtTo = 	 new Date(DataRequestObject.DatumTo.y, DataRequestObject.DatumTo.m -1, DataRequestObject.DatumTo.d);
	var currentDate = new Date();
	var today = new Date().toLocaleString().split(',')[0];;
	var DatumFrom = dtFrom.toLocaleString().split(',')[0];
	var DatumTo =   dtTo.toLocaleString().split(',')[0];
	var startIndex = allQHDataRecords.findIndex(x => x.Datum === DatumFrom);
	var endIndex = allQHDataRecords.findIndex(x => x.Datum === DatumTo);
	if(DatumFrom == DatumTo)
		endIndex = startIndex + 96;
	if (DataRequestObject.bJahresdaten == true)
	{
		res = allQHDataRecords.slice(startIndex, endIndex);
	}
		
	else
	{
		if(DataRequestObject.bViertelstunden == true)
		{
				res = allQHDataRecords.slice(startIndex, endIndex);
		}
		else
		{
				var recordFound = allQHDataRecords.slice(startIndex, endIndex);
				for (var i=0; i < recordFound.length; i++)
				{
					if (i%8 == 0)
						res.push(recordFound[i]);
				}
		}
	}
	if (res.length ==0)
	{
		for (var i=1; i <= 96; i++ )
		{
			emmptyValues = new Array(numberOfDataTrack);
			emmptyValues.fill(-999);
			var emptyRecord = {};
			emptyRecord.Datum = today.toLocaleString().split(',')[0];
			emptyRecord.Index = i;
			emptyRecord.nValues = numberOfDataTrack;
			emptyRecord.Projektnumer = projektnummer;
			emptyRecord.Values = emmptyValues;
			res.push(emptyRecord);
		}
	}	
    return res;
}


function toColor(r, g, b) {
    a = 255;
    return "rgba(" + [r, g, b, a].join(",") + ")";
}

function sortAscending(prop, Items) {

    if (Items.length > 0) {
        var ItemsSorted = Items.sort(function (a, b) {
            return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
        });
        return ItemsSorted;
    }
}

function sortDescending(prop, Items) {

    if (Items.length > 0) {
        var ItemsSorted = Items.sort(function (b, a) {
            return (a[prop] > b[prop]) ? 1 : ((a[prop] < b[prop]) ? -1 : 0);
        });
        return ItemsSorted;
    }
}


function SettingsColorHandler(id) {
    inColorMenue = true;
    TrackInEdit = parseInt(id.substring(8));
    $("#ModalMenuTitle").text("Farbe auswählen");
    $("#ModalMenuContent").empty();
    $("#LabelConfirm").text("Entfernen");
    var cont = '<div style="float:left;">';
    var i = 0;
    var nc = defaultColors.length;
    for (var i = 0; i < nc; i++) {
        color = defaultColors[i];
        cont += '<div id="col_' + i + '" style="background-color: ' + color + '; width: 28px; height:28px; float:left;" onclick="ColorSelectionHandler(id)">&nbsp</div>';
    }
    cont += '</div></br>';
    $("#ModalMenuContent").append(cont);
    location.href = "#ModalMenu";

}

/*
Farbauswahl:
 
Die ausgewwählten Spuren werden in einer sortierten Liste in den Usersettings verwaltet.
Der Zufriff erfolgt über den dort mit abgelegten Spur-Index.
*/

function ColorSelectionHandler(id) {
    inColorMenue = true;
    var si = id.substring(4);
    var i = parseInt(si);
    var sCol = defaultColors[i];
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var nSpuren = UserSettings.qh_Spuren.length;
    var itemsFound = $.grep(Spuren, function (e) { return e.index == TrackInEdit; });
    if (itemsFound.length > 0) {
        var SpurIndex = 1;
        var item = itemsFound[0];
        // patch 19.05.2016: Bug bei Farbauswahl
        var idx = UserSettings.qh_Spuren.indexOf(item);
        //UserSettings.qh_Spuren[TrackInEdit].color = sCol;
        UserSettings.qh_Spuren[idx].color = sCol;
    }
    else {
        var isLeft = $('#' + "cbSettingsL_" + TrackInEdit).prop("checked");
        var itm = { bSkala_Links: isLeft, color: sCol, index: TrackInEdit };
        UserSettings.qh_Spuren.push(itm);
        UserSettings.qh_Spuren = sortAscending(UserSettings.qh_Spuren.index, UserSettings.qh_Spuren);
    }
    InitSettings();
    drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
    drawData();
    inColorMenue = false;
    location.href = "#";
}

function ConfirmModalMenu() {
    if (inColorMenue)
        ConfirmColorMenu();
    if (inScaleMenue)
        YScaleMenuConfirm();

}

function ConfirmColorMenu() {

    // Color-Eintrag entfernen
    inColorMenue = false;
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var itemsFound = $.grep(Spuren, function (e) { return e.index == TrackInEdit; });
    if (itemsFound.length > 0) {
        var idx = UserSettings.qh_Spuren.indexOf(itemsFound[0]);
        UserSettings.qh_Spuren.splice(idx, 1);
        UserSettings.qh_Spuren = sortAscending(UserSettings.qh_Spuren.index, UserSettings.qh_Spuren);
    }
    InitSettings();
    drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
    drawData();
    location.href = "#";
}


function enadbleDisableTrack(id) {	
	var checked = $('#' + id).prop("checked");
	var idx = id.substr(id.indexOf('_') + 1);
	var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
	var itemsFound = $.grep(Spuren, function (e) { return e.index == idx; });
    if (itemsFound.length > 0) {
        itemsFound[0].enabled = checked;
		InitSettings();
		drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
		drawData();
	}
}


function SettingsLeftRightHandler(id) {
    var checked = $('#' + id).prop("checked");
    var theOther = id;
    var iTrack = id.substring(id.indexOf("_") + 1);
    var idx = theOther.indexOf("L");
    if (idx >= 0)
        theOther = theOther.replace('L', 'R');
    else
        theOther = theOther.replace('R', 'L');
    $('#' + theOther).prop("checked", !checked);
    if (idx >= 0)
        setScaleSelection(iTrack, true);
    else
        setScaleSelection(iTrack, false);
}

function setScaleSelection(idx, bLeft) {
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var itemsFound = $.grep(Spuren, function (e) { return e.index == idx; });
    if (itemsFound.length > 0) {
        itemsFound[0].bSkala_Links = bLeft;
        InitSettings();
        drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
        drawData();
    }

}

function createSettingsItem(id, enable, color, text, left, avg, sum) {
	var res = '<div style="float:left; height:14px">';
	var cb1val = left ? "checked" : "";
	var cb2val = left ? "" : "checked";
	var enableVal = enable ? "checked" : "";

	res += '<div class = "" id="trackVisibleSettings" style="float: left; height: 14px; font-size: 1vh">'
	res += '<input class = "QHcheckbox" id="enableTrack_' + id + '" type ="checkbox" value="" ' + enableVal + ' onchange="enadbleDisableTrack(id)" />';
	res += '</div>';
	
	res += '<div id="colpick_' + id + '" style="background-color: ' + color + '; width: 14px; height:14px; float:left;" onclick="SettingsColorHandler(id)">&nbsp</div>';
	res += '<div class = "SettingsText" style="color:black; background-color: lightgrey; overflow: hidden; width: 200px; height:14px; float:left;">' + text + '</div>';

	res += '<div style="float: left; height: 14px; font-size: 1vh">';
	res += '<input class = "QHcheckbox" id ="cbSettingsL_' + id + '" style="background-color:' + color + '" type ="checkbox" value="" ' + cb1val + ' onchange="SettingsLeftRightHandler(id)" />';
	res += '<input class = "QHcheckbox" id ="cbSettingsR_' + id + '" style="background-color:' + color + '" type ="checkbox" value="" ' + cb2val + ' onchange="SettingsLeftRightHandler(id)" />';
	res += '</div>';

	res += '</div></br>';
	return res;
}

var defaultColors = ["#931414", "#920000", "#4c5660", "#39444f", "#485663", "#315172", "#920000",
    "#540000", "#2d2d2d", "#bbbaba", "#aaa9a9", "#4b6d8e", "#385d82", "#6ca6cd",
    "#38d6e0", "#4dffff", "#4da6ff", "#0080ff", "#0000ff", "#0099cc", "#ff4444",
    "#4775a3", "#dadada", "#cbcbcb", "#336699", "#669999", "#ada59c", "#ede1d1",
    "#e6e4e1", "#ada59c", "#e7e5d9", "#ffa500", "#cc474b", "#ffa500", "#000000",
    "#008000", "#ffff00", "#ff0000", "#ffc0cb", "#CCFF33", "#B88A00", "#CC33FF"
];

function InitSettings() {
    var x = diagramData;
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var nSpuren = UserSettings.qh_Spuren.length;
    $("#qSettings").empty();
    var SettingsContent = "";
    var n = diagramHeader.length;
    for (var i = 0; i < n; i++) {
        var itemsFound = $.grep(Spuren, function (e) { return e.index == i; });
        if (itemsFound.length > 0) {
            SettingsContent += createSettingsItem(i, itemsFound[0].enabled, itemsFound[0].color, diagramHeader[i].Bezeichnung.trim()
                + " [" + diagramHeader[i].Einheit + "]", itemsFound[0].bSkala_Links, 0, 0);
        }
        else {
            SettingsContent += createSettingsItem(i, false, "white", diagramHeader[i].Bezeichnung.trim()
                + " [" + diagramHeader[i].Einheit + "]", true, 0, 0);
        }

    }

    SettingsContent = "<div>" + SettingsContent + "</div>";
    $("#qSettings").append(SettingsContent);
    //$(".insideWrapper").css("background-color", bgColors[bmpIndex]);

}


// URL Query Strings auswerten
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var datum = { d: 1, m: 1, y: 2000 };

function diagramMonthNumDays(Datum) {
    var isSchalt = Datum.y % 4 == 0;
    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isSchalt)
        arrMLen[1] = 29;
    return (arrMLen[(m - 1) % 12] < arrMLen[m % 12]) ? arrMLen[m - 1] : arrMLen[m % 12];
}

function InitialDatum() {
    var jetzt = new Date();
    var Jahr = jetzt.getFullYear();
    var Jahresmonat = jetzt.getMonth() + 1;
    var Tag = jetzt.getDate();
    var dat = { d: Tag, m: Jahresmonat, y: Jahr };
    return dat;
}

function toDatum(year, month, day) {
    var dat = { d: day, m: month, y: year };
    return dat;
}

function prevYear(Datum) {
    var dat = { d: Datum.d, m: Datum.m, y: Datum.y - 1 };
    return dat;
}

function nextYear(Datum) {
    var dat = { d: Datum.d, m: Datum.m, y: Datum.y + 1 };
    return dat;
}

function prevMonth(Datum) {
    var isSchalt = Datum.y % 4 == 0;
    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isSchalt)
        arrMLen[1] = 29;
    var dd = Datum.d;
    var dm = Datum.m;
    var dy = Datum.y;
    if (dm == 1) {
        dm = 12;
        dy -= 1;
    }
    else {
        dm -= 1;
        dd = dd <= arrMLen[dm - 1] ? dd : arrMLen[dm - 1];
    }
    var dat = { d: dd, m: dm, y: dy };
    return dat;
}

function nextMonth(Datum) {
    var isSchalt = Datum.y % 4 == 0;
    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isSchalt)
        arrMLen[1] = 29;
    var dd = Datum.d;
    var dm = Datum.m;
    var dy = Datum.y;
    if (dm == 12) {
        dm = 1;
        dy += 1;
    }
    else {
        dm += 1;
        dd = dd <= arrMLen[dm - 1] ? dd : arrMLen[dm - 1];
    }
    var dat = { d: dd, m: dm, y: dy };
    return dat;
}

function prevWeek(Datum) {
    var DatOrg = Datum;
    for (var i = 0; i < 7; i++) {
        DatOrg = prevDay(DatOrg);
    }
    return DatOrg;
}

//function prevWeekxxx(Datum) {
//    var isSchalt = Datum.y % 4 == 0;
//    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
//    if (isSchalt)
//        arrMLen[1] = 29;
//    var dd = Datum.d;
//    var dm = Datum.m;
//    var dy = Datum.y;
//    dd -= 7;
//    if (dd < 1) {
//        dm -= 1;
//        if (dm < 1) {
//            dm = 12;
//            dy -= 1;
//        }
//        dd += arrMLen[dm - 1];
//    }
//    var dat = { d: dd, m: dm, y: dy };
//    return dat;
//}

function nextWeek(Datum) {
    var DatOrg = Datum;
    for (var i = 0; i <= 7; i++) {
        DatOrg = nextDay(DatOrg);
    }
    return DatOrg;
}

//function nextWeekxxx(Datum) {
//    var isSchalt = Datum.y % 4 == 0;
//    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
//    if (isSchalt)
//        arrMLen[1] = 29;
//    var dd = Datum.d;
//    var dm = Datum.m;
//    var dy = Datum.y;
//    dd += 7;
//    if (dd > arrMLen[dm - 1]) {
//        dm += 1;
//        if (dm > 12) {
//            dm = 1;
//            dy += 1;
//        }
//        dd -= arrMLen[dm];
//    }
//    var dat = { d: dd, m: dm, y: dy };
//    return dat;
//}

function prevDay(Datum) {
    var isSchalt = Datum.y % 4 == 0;
    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isSchalt)
        arrMLen[1] = 29;
    var dd = Datum.d;
    var dm = Datum.m;
    var dy = Datum.y;
    if (dd <= 1) {
        if (dm <= 1) {
            dm = 12;
            dy -= 1;
            dd = 31;
        }
        else {
            dm -= 1;
            dd = arrMLen[dm - 1];
        }
    }
    else
        dd--;
    var dat = { d: dd, m: dm, y: dy };
    return dat;
}

//function prevDayxxx(Datum) {
//    var isSchalt = Datum.y % 4 == 0;
//    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
//    if (isSchalt)
//        arrMLen[1] = 29;
//    var dd = Datum.d;
//    var dm = Datum.m;
//    var dy = Datum.y;
//    dd -= 1;
//    if (dd < 1) {
//        dm -= 1;
//        if (dm < 1) {
//            dm = 12;
//            dy -= 1;
//        }
//        dd += arrMLen[dm - 1];
//    }
//    var dat = { d: dd, m: dm, y: dy };
//    return dat;
//}

function nextDay(Datum) {
    var isSchalt = Datum.y % 4 == 0;
    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (isSchalt)
        arrMLen[1] = 29;
    var dd = Datum.d;
    var dm = Datum.m;
    var dy = Datum.y;
    if (dd >= arrMLen[dm - 1]) {
        dd = 1;
        dm += 1;
        if (dm > 12) {
            dm = 1;
            dy++;
        }
    }
    else
        dd++;
    var dat = { d: dd, m: dm, y: dy };
    return dat;
}


//function nextDayxxx(Datum) {
//    var isSchalt = Datum.y % 4 == 0;
//    var arrMLen = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
//    if (isSchalt)
//        arrMLen[1] = 29;
//    var dd = Datum.d;
//    var dm = Datum.m;
//    var dy = Datum.y;
//    dd += 1;
//    if (dd > arrMLen[dm - 1]) {
//        dm += 1;
//        if (dm > 12) {
//            dm = 1;
//            dy += 1;
//        }
//        dd -= arrMLen[dm - 1];
//    }
//    var dat = { d: dd, m: dm, y: dy };
//    return dat;
//}

function getSTag(Datum) {
    var jDate = new Date(Datum.y, Datum.m - 1, Datum.d);
    var TagInWoche = jDate.getDay();
    var Wochentag = new Array("So", "Mo", "Di", "Mi", "Do", "Fr", "Sa");
    return Wochentag[TagInWoche] + " " + Datum.d;
}

function getWochenTag(Datum, ofs) {
    var jDate = new Date(Datum.y, Datum.m - 1, Datum.d);
    var t = jDate.getTime();
    t += ofs * 1000 * 60 * 60 * 24;
    jDate.setTime(t);
    var TagInWoche = jDate.getDay();
    var Wochentag = new Array("So", "Mo", "Di", "Mi", "Do", "Fr", "Sa");
    return Wochentag[TagInWoche];
}


function getSDatum(Datum) {
    var jDate = new Date(Datum.y, Datum.m - 1, Datum.d);
    var TagInWoche = jDate.getDay();
    var Wochentag = new Array("So", "Mo", "Di", "Mi", "Do", "Fr", "Sa");
    return Wochentag[TagInWoche] + " " + Datum.d + "." + Datum.m + "." + Datum.y;
}

function getSDayOfMonth(Datum, ofs) {
    var jDate = new Date(Datum.y, Datum.m - 1, Datum.d);
    var t = jDate.getTime();
    t += ofs * 1000 * 60 * 60 * 24;
    jDate.setTime(t);
    return jDate.getDate();
}


function diagramGetTitle(Datum, Zeitraum, ForceQH) {
    var res = "";
    if (Zeitraum == "d") {
        res += "Tagesgang (1/4h-Werte) ";
        res += getSDatum(Datum);
    }
    if (Zeitraum == "w") {
        var sTimeGrid = ForceQH == true ? "(1/4h-Werte ab )" : "(2h-Werte) ab  ";
        //res += "Wochengang " + sTimeGrid + getSDatum(nextDay(prevWeek(Datum)));
        res += "Wochengang " + sTimeGrid + getSDatum(Datum);
    }
    if (Zeitraum == "m") {
        var sTimeGrid = ForceQH == true ? "(1/4h-Werte ab )" : "(2h-Werte) ab  ";
        // res += "Monatsgang " + sTimeGrid + getSDatum(nextDay(prevMonth(Datum)));
        res += "Monatsgang " + sTimeGrid + getSDatum(Datum);
    }
    if (Zeitraum == "y") {
        var sTimeGrid = ForceQH == true ? "(1/4h-Werte ab )" : "(2h-Werte) ab  ";
        // res += "Jahresgang " + sTimeGrid + getSDatum(nextDay(prevYear(Datum)));
        res += "Jahresgang " + sTimeGrid + getSDatum(Datum);

    } return res;
}

function dayInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function drawGrid(x, y, w, h, Zeitraum, Datum) {

    if (Zeitraum == "d") {
        var nDivsX = 4;
        var nSubDivsX = 6;
    }

    if (Zeitraum == "w") {
        var nDivsX = 7;
        var nSubDivsX = 4;
    }

    if (Zeitraum == "m") {
        var tnumday = dayInMonth(datum.m, datum.y);
        var ndata = diagramData.length;
        if (!diagramForceQH)
            //var numDays = ndata / 12;
            var numDays = tnumday;
        else
            var numDays = ndata / 96;

        var nDivsX = numDays;
        var nSubDivsX = 1;
    }
    if (Zeitraum == "y") {
        var nDivsX = 12;
        var nSubDivsX = 3;
    }
    qctx.clearRect(0, 0, canvas.width, canvas.height);
    qctx.save();
    qctx.lineWidth = 0.5;
    qctx.translate(x, y);
    qctx.fillStyle = diagramColorBG;
    qctx.fillRect(0, 0, w, h);

    var marginLeft = 0.1 * w;
    var marginRight = 0.2 * w;
    var marginTop = 0.02 * w;
    var marginBottom = 0.1 * w;

    xd = x + marginLeft;
    yd = y + marginTop;
    wd = w - marginLeft - marginRight;
    hd = h - marginTop - marginBottom;

    var dSubX = wd / (nDivsX * nSubDivsX);
    var xi = 0;

    for (i = 0; i <= nDivsX * nSubDivsX; i++) {
        qctx.beginPath();
        if ((i % nSubDivsX == 0) && (Zeitraum != "m"))
            qctx.setLineDash([1, 0]);
        else
            qctx.setLineDash([1, 3]);
        qctx.moveTo(xd + i * dSubX, yd);
        qctx.lineTo(xd + i * dSubX, yd + hd);
        qctx.stroke();

        qctx.font = "11px Arial";
        qctx.fillStyle = diagramColorSkala;

        if ((i % nSubDivsX == 0) && (Zeitraum == "d")) {
            qctx.fillText(xi + "h", xd + i * dSubX - 8, yd + hd + 14);
            xi += 6;
        }
        if ((i % nSubDivsX == 0) && (Zeitraum == "w") && xi < 7) {
            var tnumday = parseInt(dayInMonth(Datum.m, Datum.y));
            var dt = parseInt(Datum.d.toString()) + xi;
            if (dt > tnumday) {
                dt = dt - tnumday;
            }
            qctx.fillText(getWochenTag(Datum, xi) + " " + dt + ".", xd + i * dSubX + 20, yd + hd + 14);
            xi += 1;
        }

        if ((i % nSubDivsX == 0) && (Zeitraum == "m") && xi < numDays) {
            qctx.fillText(getSDayOfMonth(Datum, xi), xd + i * dSubX + 2, yd + hd + 14);
            xi += 1;
        }

        //if ((Zeitraum == "y") && xi < 12) {
        //    qctx.fillText(Datum.m, xd + i * dSubX, yd + hd)
        //    xi += 1;
        //}


        qctx.stroke();
    }
    qctx.beginPath();
    qctx.setLineDash([1, 2]);
    qctx.font = "11px Arial";
    qctx.fillStyle = diagramColorSkala;
    for (i = 0; i <= (YLMax - YLMin) / YLStep; i++) {
        qctx.moveTo(xd, yd + i * YLStep * hd / (YLMax - YLMin));
        qctx.lineTo(xd + wd, yd + i * YLStep * hd / (YLMax - YLMin));
        txt = (YLMax - i * YLStep).toFixed(2).replace(".", ",");
        qctx.fillText(txt, marginLeft / 2, yd + i * YLStep * hd / (YLMax - YLMin));

        txt = (YRMax - i * YRStep).toFixed(2).replace(".", ",");
        qctx.fillText(txt, xd + wd + marginRight * 0.1, yd + i * YLStep * hd / (YLMax - YLMin));
    }
    qctx.stroke();


    titel = diagramGetTitle(Datum, Zeitraum, diagramForceQH)
    qctx.font = "14px Arial";
    qctx.fillText(titel, 0.5 * w / 2, h - marginBottom * 0.4);
    qctx.stroke();
    qctx.restore();
}

// Spurauswahl speichern
function saveTrackSelection() {

    updateUserSettings();

    var obj = new Object();
    //obj.YLMax = YLMax;
    //obj.YLMin = YLMin;
    //obj.YLStep = YLStep;
    //obj.YRMax = YRMax;
    //obj.YRStep = YRStep;
    obj.UserSettings = UserSettings;
    obj.Steuerung = Steuerung;
    var sobj = JSON.stringify({ 'UserSettingsObject': obj });

    var res = saveUserSettings(sobj);

    var rr = res;

}

function launchYScaleMenue() {
    inScaleMenue = true;
    $("#ModalMenuTitle").text("Y-Skalierung bearbeiten");
    $("#ModalMenuContent").empty();
    $("#LabelConfirm").text("Ok");
    var cont = '<div>';
    cont += '<p>Y-Links Max</p>';
    cont += '<input id="inpYLMax" type=text value = "' + YLMax + '"></br>';
    cont += '<p>Y-Links Min</p>';
    cont += '<input id="inpYLMin" type=text value = "' + YLMin + '"></br>';
    cont += '<p>Y-Links Schrittweite</p>';
    cont += '<input id="inpYLStep" type=text value = "' + YLStep + '"</></br>';
    cont += '<p>Y-Rechts Max</p>';
    cont += '<input id="inpYRMax" type=text value = "' + YRMax + '"</></br>';
    cont += '<p>Y-Rechts Schrittweite</p>';
    cont += '<input id="inpYRStep" type=text value = "' + YRStep + '"</br>';
    cont += '</div></br>';
    $("#ModalMenuContent").append(cont);
    location.href = "#ModalMenu";


}

function isValidFloat(fString) {
    var f = parseFloat(fString);
    return (f != NaN);
}

function YScaleMenuConfirm() {


    var sf = $("#inpYLMax").val().trim().replace(",", "."); var fYLMax = parseFloat(sf);
    sf = $("#inpYLMin").val().trim().replace(",", "."); var fYLMin = parseFloat(sf);
    sf = $("#inpYLStep").val().trim().replace(",", "."); var fYLStep = parseFloat(sf);
    sf = $("#inpYRMax").val().trim().replace(",", "."); var fYRMax = parseFloat(sf);
    sf = $("#inpYRStep").val().trim().replace(",", "."); var fYRStep = parseFloat(sf);

    if (!isNaN(fYLMax) & !isNaN(fYLMin) & !isNaN(fYLStep) & !isNaN(fYRMax) & !isNaN(fYRStep)) {
        YLMax = fYLMax;
        YLMin = fYLMin;
        YLStep = fYLStep;
        YRMax = fYRMax;
        YRStep = fYRStep;
        inScaleMenue = false;
        InitSettings();
        drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
        drawData();
        location.href = "#";
    }
    //InitSettings();
    //drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
    //drawData();
    //var Spuren = UserSettings.qh_Spuren;

    //location.href = "#";
}

function toggleDauerlinie() {
    var className = $('#btnDauerlinie').attr('class');
    if (className == "qcmdButtonMedium") {
        $("#btnDauerlinie").removeClass(className).addClass("qcmdButtonMediumPressed");
    }
    else {
        $("#btnDauerlinie").removeClass(className).addClass("qcmdButtonMedium");
    }
}

function isDauerlinie() {
    return $('#btnDauerlinie').attr('class') == "cmdButtonMediumPressed";
}


function printCanvas() {

    var spurNameAndColor = "";
    var sCol = defaultColors[i];
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var nSpuren = UserSettings.qh_Spuren.length;

    var pdf = new jsPDF('a4');
    var text = "1/4h-Daten-Auswertung der Steuerung: " + QHInfo.Beschreibung; //Titeltext mit Anlagenamen
    var canvas = document.getElementById("myqCanvas");
    var imgData = canvas.toDataURL("image/png", 0.2);                        //erzeugt imgdata from canvasbereich 
    pdf.setFontSize(16);
    pdf.text(20, 20, text);
    pdf.addImage(imgData, 'PNG', 15, 30);
    pdf.setFontSize(12);
    for (var i = 0; i < nSpuren; i++) {
        var index = Spuren[i].index;
        var color = Spuren[i].color;
		var enabled = Spuren[i].enabled; //aktuell noch nicht Berücksichtigt!
        var spurname = diagramHeader[index].Bezeichnung;
        pdf.setTextColor(color, 0, 0, 0);
        pdf.text(30, 180 + i * 8, '-----: ' + spurname);
        var skala = Spuren[i].bSkala_Links ? 'links Skala' : 'rechts Skala';
        pdf.setTextColor('#000000', 0, 0, 0);
        pdf.text(80, 180 + i * 8, '(' + skala + ')');
    }

    pdf.save("download.pdf");
}


// Bei StackOverflow gefunden...

function exportToCsv(filename, rows) {
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
            if (row[j] instanceof Date) {
                innerValue = row[j].toLocaleString();
            };
            var result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,|\n)/g) >= 0)
                result = '"' + result + '"';
            if (j > 0)
                finalVal += ';';
            finalVal += result;
        }
        return finalVal + '\r\n';
    };

    var csvFile = '';
    for (var i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i]);
    }
    //csvFile = exportCSV(Steuerung, dtFrom, dtTo)
    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}


function exportData() {
    var date = diagramDatum.d;
    var month = diagramDatum.m;
    var year = diagramDatum.y;
    var header = diagramHeader;
    var datum = diagramZeitraum
    var len = diagramData.length;
    var zeitraum = diagramZeitraum;

    var res = [];
    if (len > 0) {
        for (var i = 0; i < diagramData.length; i++) {
            var row = [];
            for (var j = 0; j < diagramData[i].Values.length; j++) {
                var val = diagramData[i].Values[j].toString();
                val = val.replace(".", ",");
                if (val.indexOf(",") < 0)
                    val += ",0";
                row.push(val);
            }
            res.push(row);
        }
        var fname = Steuerung.replace(" ", "_");
        fname += "_";
        fname += diagramZeitraum + "_";
        var m = (diagramDatum.m + 1).toString();
        if (m.length < 2)
            m = "0" + m;

        var d = (diagramDatum.d).toString();
        if (d.length < 2)
            d = "0" + d;
        fname += diagramDatum.y + m + d;

        fname += ".csv";
        exportToCsv(fname, res);

    }
}

function ButtonHandler(id) {

    if (id == "btnGotoLast") {
        var Datum = new Date(sLastUpdate);
        var dat = { d: dLastUpdate.getDate(), m: dLastUpdate.getMonth() + 1, y: dLastUpdate.getFullYear() };
        dat = prevDay(dat);
        diagramDatum = dat;
    }
    if (id == "btnIncTag")
        diagramDatum = nextDay(diagramDatum);
    if (id == "btnDecTag")
        diagramDatum = prevDay(diagramDatum);
    if (id == "btnIncWoche")
        diagramDatum = nextWeek(diagramDatum);
    if (id == "btnDecWoche")
        diagramDatum = prevWeek(diagramDatum);
    if (id == "btnIncMonat")
        diagramDatum = nextMonth(diagramDatum);
    if (id == "btnDecMonat")
        diagramDatum = prevMonth(diagramDatum);
    if (id == "btnIncJahr")
        diagramDatum = nextYear(diagramDatum);
    if (id == "btnDecJahr")
        diagramDatum = prevYear(diagramDatum);
    if (id == "btnPrint")
        printCanvas();
    if (id == "btnExport")
        //exportData();

        window.location.replace("/DatenExport.aspx?ID=" + Steuerung);
    //if (id == "btnSonder")
    //window.location.replace("/DatenExport.aspx?ID=" + Steuerung);

    if (id == "btnTagesgang")
        diagramZeitraum = "d";
    if (id == "btnWochengang")
        diagramZeitraum = "w";
    if (id == "btnMonatsgang")
        diagramZeitraum = "m";
    if (id == "btnJahresgang")
        diagramZeitraum = "y";

    if (id == "cbForceQH") {
        var checked = $('#cbForceQH').prop('checked');
        diagramForceQH = checked;
    }

    if (id == "btnSaveSelection") {
        saveTrackSelection();
    }

    if (id == "btnYScale") {
        launchYScaleMenue();
    }

    if (id == "btnDauerlinie") {
        toggleDauerlinie();
    }

    if (id == "btnGetData") {
        OpenModalQH();
        //alert("Daten werden heruntergeladen, bitte warten Sie!");
        DatenHolen(Steuerung);
    }

    if (id == "btnUpdateQHHeader") {
        UpdateQHHeaderRaw(Steuerung);
    }

    diagramData = loadData();

    drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);

    drawData();
}