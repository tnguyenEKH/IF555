    /*
    var Steuerung = "";
    var qctx;
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

    var QHInfo;*/
       
async function initQh(qhHeaderData, qhDataRaw) {
    //////////////////////window.qhData preparation//////////////////////
    //get saved User Settings
    const qhUserSettings = await fetchQhUserSettings();
    window.UserSettings = qhUserSettings; //temporary global variable for usage of old functions...

    //////////////////////qhHeader//////////////////////
    //fileFormat:
    const positionPrjNo = 0;
    const lengthPrjNo = 5;
    const positionDate = 7;
    const lengthDate = 10;
    const positionTime = 19;
    const lengthTime = 8;
    const positionRecordsCount = 41;
    const lengthRecordsCount = 3;
    
    const positionUnits = positionRecordsCount + lengthRecordsCount;
	const lengthUnits = 5;
	const lengthNames = 20;
    
    const prjNo = qhHeaderData.substr(positionPrjNo, lengthPrjNo);
    console.log(prjNo);
    const qhDataTrackCount = parseInt(qhHeaderData.substr(positionRecordsCount, lengthRecordsCount).trim()); //+10

	
	const qhHeader = [];
	for(let i = 0; i < qhDataTrackCount; i++) {
		const item = {};
		item.Index = i;
		item.Einheit = qhHeaderData.substr((positionUnits + i*lengthUnits), lengthUnits).trim();
		item.Bezeichnung = qhHeaderData.substr((positionUnits + qhDataTrackCount*lengthUnits + i*lengthNames) , lengthNames).trim();
		qhHeader.push(item);
	}
    //console.log(qhHeader);
    //////////////////////window.qhData//////////////////////
    const timestampLength = 4;
    const qhDataTrackReserveCount = 10;
    const qhDataTrackTotalCount = qhDataTrackCount + qhDataTrackReserveCount;
    //console.log(qhDataTrackTotalCount);
    const recordLength = timestampLength + qhDataTrackTotalCount;
    //console.log(recordLength);
    const totalRecords = qhDataRaw.length/recordLength;
    //console.log(totalRecords);
    //////////////////////classic DataPreparation//////////////////////
    ///*
    const qhData = [];
    for(let i = 0; i < totalRecords; i++) {
        const rawRecord = qhDataRaw.slice((i*recordLength), ((i+1)*recordLength));
        
        const record = {};
        const date   = new Date("20"+ rawRecord[0].toString(), (rawRecord[1] -1).toString(), rawRecord[2].toString()); //month index from 0-11
        record.Datum = date.toLocaleDateString();
        const idx = rawRecord[3];
        record.Index = idx;
        record.nValues = qhDataTrackTotalCount;
        record.Projektnumer = prjNo;
        record.Values = rawRecord.slice(timestampLength, recordLength);
        qhData.push(record);
    }
    //console.log(window.qhData);
    //*/

    //////////////////////dataPreparation by Tracks//////////////////////
    //console.log(qhDataRaw);
    /*
    const timestamps = [];
    for(let i = 0; i < totalRecords; i++) {
        const year = 2000 + qhDataRaw[i*recordLength];
        const month = qhDataRaw[i*recordLength + 1] - 1;
        const day = qhDataRaw[i*recordLength + 2];
        const idx = qhDataRaw[i*recordLength + 3];
        const hour = (15 * idx) / 60;
        const minute = hour % 1 * 60;
        const second = minute % 1 * 60;
        const timestamp = new Date(year, month, day, hour, minute, second); //month index from 0-11
        timestamps.push(timestamp.getTime());
    }
    //console.log(timestamps);

    const qhDataByTracks = [];
    for(let i = 0; i < qhDataTrackTotalCount; i++) {
        const qhTrack = {};
        qhTrack.id = i;
        qhTrack.data = new Map(Array.from(qhDataRaw.filter((val, idx) => idx % recordLength - timestampLength === i), (value, idx) => ([timestamps[idx], value])));
        qhDataByTracks.push(qhTrack);
    }
    console.log(qhDataByTracks);
    */


    //////////////////////init HTML//////////////////////
    //////////////////////createQhCanvas with max ViewportSize//////////////////////
    initQhTable(qhHeader, qhUserSettings);
    //createQhSvg();
    //drawQhData(qhDataByTracks);
    
    //createQhCanvas();
    resizeQhCanvases();
    drawQhScale(qhUserSettings);
    drawQhData(qhData);
    //startQH();


    //////////////////////addEventListeners//////////////////////
    document.querySelector(`.btnSaveUserSettings`).addEventListener(`click`, saveUserSettings)
    
       
    //return window.qhData;
}

function resizeQhCanvases() {
    const scalingFactorCanvasHeight = .95;
    const tabContentQh = document.querySelector(`.tabContentQh`);
    const qhCanvases = document.querySelectorAll(`.qhCanvas`);
    qhCanvases.forEach(qhCanvas => {
        qhCanvas.width = tabContentQh.offsetWidth;
        qhCanvas.height = scalingFactorCanvasHeight * tabContentQh.offsetHeight;
    });
}

function drawQhScale(qhUserSettings = undefined) {
    //////////////////////draw Axis//////////////////////    
    const qhScaleCanvas = document.querySelector(`.qhScaleCanvas`);
    if (qhUserSettings) { //init if parameter qhUserSettings is passed
        qhScaleCanvas.qh_Skalierung = qhUserSettings.qh_Skalierung;
    }
    /* 
    if (!qhScaleCanvas.qh_Skalierung) { //init if necessarry
        qhScaleCanvas.qh_Skalierung = qhUserSettings.qh_Skalierung;
    }
    */
    const {qh_Skalierung, width, height} = qhScaleCanvas;
    const {Y_Links_Min, Y_Links_Max, Y_Links_Schrittweite, Y_Rechts_Min, Y_Rechts_Max, Y_Rechts_Schrittweite} = qh_Skalierung;
    
    //console.log(height);
    const fontSizeRatio = .03;
    const fontSize = Math.max(10, fontSizeRatio * height);
    const offsetWidthRatio = .05;
    const offsetHeightRatio = .1;
    const offsetWidth = offsetWidthRatio * width;
    const offsetHeight = offsetHeightRatio * height;
    const ctx = qhScaleCanvas.getContext(`2d`);
    ctx.clearRect(0, 0, qhScaleCanvas.width, qhScaleCanvas.height);
    const period = document.querySelector(`.period`).value;
    const isDauerlinie = document.querySelector(`.cbDauerlinie`).checked;
    if (!isDauerlinie) {
        ctx.lineWidth = 3;
        ctx.lineCap = `square`;
        ctx.font = `bold italic ${fontSize}px VAGrounded`;
        //X-Achse
        ctx.textAlign = `center`;
        ctx.textBaseline = `top`;
        ctx.beginPath();
        ctx.strokeStyle = `black`;
        ctx.moveTo(offsetWidth, height - offsetHeight);
        ctx.lineTo(width - offsetWidth, height - offsetHeight);
        const xAxisLength = width - 2*offsetWidth; 
        const xAxisSteps = (period === `tagesgang`) ? 6 : (period === `wochengang`) ? 7 : (period === `jahresgang`) ? 12 : 10; //Monatstagberechnung!! 
        for(let i = 0; i <= xAxisSteps; i++) {
            ctx.moveTo(offsetWidth + i/xAxisSteps * xAxisLength, height - offsetHeight);
            ctx.lineTo(offsetWidth + i/xAxisSteps * xAxisLength, height - offsetHeight + 10);
            ctx.fillText(`${i * 24/6}:00`, offsetWidth + i/xAxisSteps * xAxisLength, height - offsetHeight + 10 + 10);
            //ctx.lineTo(i/xAxisSteps * (.9 * width) + offsetWidthRatio * width, (1 - offsetHeightRatio + .02) * height);
        }
        ctx.stroke();
        //Y-Achsen:
        const yAxisLength = height - 2*offsetHeight;
        ctx.textBaseline = `middle`;
        //Y1-Achse
        ctx.beginPath();
        ctx.strokeStyle = `hsl(334, 74%, 44%)`;
        ctx.fillStyle = `hsl(334, 74%, 44%)`;
        ctx.textAlign = `right`;
        ctx.moveTo(offsetWidth, offsetHeight);
        ctx.lineTo(offsetWidth, height - offsetHeight);
        const y1AxisSteps = (Y_Links_Max - Y_Links_Min) / Y_Links_Schrittweite;
        //console.log(Y_Links_Max, Y_Links_Min, Y_Links_Schrittweite, y1AxisSteps);
        for(let i = 0; i <= y1AxisSteps; i++) {
            ctx.moveTo(offsetWidth, (height - offsetHeight) - i/y1AxisSteps * yAxisLength);
            ctx.lineTo(offsetWidth - 10, (height - offsetHeight) - i/y1AxisSteps * yAxisLength);
            ctx.fillText(`${i * Y_Links_Schrittweite}`, offsetWidth - 10 - 10, (height - offsetHeight) - i/y1AxisSteps * yAxisLength);
        }
        ctx.stroke();
        //Y2-Achse
        ctx.beginPath();
        ctx.strokeStyle = `hsl(194, 71%, 42%)`;
        ctx.fillStyle = `hsl(194, 71%, 42%)`;
        ctx.textAlign = `left`;
        ctx.moveTo(width - offsetWidth, offsetHeight);
        ctx.lineTo(width - offsetWidth, height - offsetHeight);
        const y2AxisSteps = (Y_Rechts_Max - Y_Rechts_Min) / Y_Rechts_Schrittweite;
        //console.log(Y_Rechts_Max, Y_Rechts_Min, Y_Rechts_Schrittweite, y2AxisSteps);
        for(let i = 0; i <= y2AxisSteps; i++) {
            ctx.moveTo(width - offsetWidth, (height - offsetHeight) - i/y2AxisSteps * yAxisLength);
            ctx.lineTo(width - offsetWidth + 10, (height - offsetHeight) - i/y2AxisSteps * yAxisLength);
            ctx.fillText(`${i * Y_Rechts_Schrittweite}`, width - offsetWidth + 10 + 10, (height - offsetHeight) - i/y2AxisSteps * yAxisLength);
        }
        ctx.stroke();

    }
    else {

    }
}
function drawQhData(qhData = undefined) {
    const qhTrackCanvas = document.querySelector(`.qhTrackCanvas`);
    if (qhData) { //init if parameter qhData is passed
        qhTrackCanvas.qhData = qhData;
    }
    const ctx = qhTrackCanvas.getContext(`2d`);
    ctx.clearRect(0, 0, qhTrackCanvas.width, qhTrackCanvas.height);
    //////////////////////draw Tracks//////////////////////
    const startDate = new Date(2024,2,3).toLocaleDateString();
    const relevantQhData = qhTrackCanvas.qhData.filter((el) => el.Datum === startDate);
    /*
    const isDauerlinie = document.querySelector(`.cbDauerlinie`).checked;
    if (isDauerlinie) {
        
    }
    else {
        
    }
    */
    const qhScaleCanvas = document.querySelector(`.qhScaleCanvas`);
    const {qh_Skalierung} = qhScaleCanvas;
    const {Y_Links_Min, Y_Links_Max, Y_Links_Schrittweite, Y_Rechts_Min, Y_Rechts_Max, Y_Rechts_Schrittweite} = qh_Skalierung;
    const qhTable = document.querySelector(`.qhTable`);
    //const trackColors = Array.from(qhTable.querySelectorAll(`input[type='color']`), el => el.value);
    //console.log(trackColors);
    qhTable.qh_Spuren.forEach(track => {
        ctx.strokeStyle = track.color;
        ctx.beginPath();
        const scaleMin = (track.bSkala_Links) ? Y_Links_Min : Y_Rechts_Min;
        const scaleMax = (track.bSkala_Links) ? Y_Links_Max : Y_Rechts_Max;
        const scaleRange = scaleMax - scaleMin;
        relevantQhData.forEach(record => {
            const xVal = record.Index/96 * qhTrackCanvas.width;
            const yVal = record.Values[track.index]/scaleRange * qhTrackCanvas.height;
            (record.Index !== 1) ? ctx.lineTo(xVal, yVal) : ctx.moveTo(xVal, yVal);
        });
        ctx.stroke();
    });
}

async function initQhTable(qhHeader, qhUserSettings) {
    //build qhTable
    const qhTable = document.querySelector(`.qhTable`);
    qhTable.qh_Spuren = qhUserSettings.qh_Spuren;
    qhHeader.forEach(el => {
        const foundItem = qhTable.qh_Spuren.find(spur => spur.index === el.Index);        
        const inpColor = document.createElement(`input`);
        inpColor.classList.add(`inpColor${el.Index}`);
        inpColor.idx = el.Index;
        inpColor.type = `color`;
        inpColor.value = (foundItem) ? foundItem.color : `#EFEFEF`;
        inpColor.lastValue = (foundItem) ? undefined : hslToHex(30 * el.Index, 100, 75 - 25*Math.floor(el.Index/12));
        inpColor.title = `Doppelclick zum Deaktivieren`;
        //inpColor.lastValue = inpColor.value;
        inpColor.addEventListener(`change`, (ev) => colorPickChangeHandler(ev.target));
        inpColor.addEventListener(`dblclick`, (ev) => colorPickDblclickHandler(ev.target));
        inpColor.addEventListener(`click`, (ev) => {
            //open ColorPick only if click is Simulated (!ev.Trusted); otherwise preventDefault & start Timer to give dblClickEvent the chance to fire
            if(ev.isTrusted) {
                ev.preventDefault();
                //Start Timer if not already started to give dblClick-Event the Chance to fire before clickSimulation is fired!
                if(!window.timerColorPickClicks)
                    window.timerColorPickClicks = setTimeout(simulateColorPickClick, 300, ev.target);
            }
        });
        qhTable.appendChild(inpColor);

        const span = document.createElement(`span`);
        span.innerText = `${el.Bezeichnung.trim()} [${el.Einheit}]`;
        qhTable.appendChild(span);
        const useLeftScale = (foundItem) ? foundItem.bSkala_Links : true;
        for (let j = 0; j < 2; j++) {
            const radio = document.createElement(`input`);
            radio.type = `radio`;
            radio.name = `qhScale${el.Index}`;
            radio.checked = (j) ? !useLeftScale : useLeftScale; //(!!j)^(!!useLeftScale); //XOR-Logic; !! is to convert to bool
            radio.classList.add(`${radio.name}${(j) ? `_R` : `_L`}`);
            radio.addEventListener(`change`, (ev) => {
                const {target} = ev;
                const targetIdx = parseInt(target.className.match(/\d+/).toString());
                const qhTable = document.querySelector(`.qhTable`);
                const currentColor = Array.from(qhTable.querySelectorAll(`input[type='color']`)).find(inpColor => inpColor.idx === targetIdx).value;  
                if (currentColor !== `#efefef`) {
                    const useLeftScale = !!target.className.match(/(_L)/);  // !! is to convert to bool
                    console.log(useLeftScale);
                    const qh_SpurenEntry = qhTable.qh_Spuren.find(qh_Spur => qh_Spur.index === targetIdx);
                    if (qh_SpurenEntry) {
                        qh_SpurenEntry.bSkala_Links = useLeftScale;
                        //qh_SpurenEntry.color = currentColor;
                    }
                    else {
                        const newEntry = {};
                        newEntry.index = targetIdx;
                        newEntry.color = currentColor;
                        newEntry.bSkala_Links = useLeftScale;
                        qhTable.qh_Spuren.push(newEntry);
                    }
                }
                //console.log(qhTable.qh_Spuren);
                drawQhData();
            });
            qhTable.appendChild(radio);
        }
    });
}

async function fetchQhUserSettings() {
    const response = await fetchData(QHSettingFile);

    console.log(response);
    const userSettings = (response) ? response.UserSettingsObject.UserSettings : {};
    const skalierung = (userSettings.qh_Skalierung) ? userSettings.qh_Skalierung : {};
    if (skalierung.Y_Rechts_Min === undefined) {    //Y_Rechts_Min bisher garnicht in qhUserSettings enthalten! hier werden nun neue DefaultSettings festgelegt!
        skalierung.Y_Links_Min = 0;
        skalierung.Y_Links_Max = 110;
        skalierung.Y_Links_Schrittweite = 10;
        skalierung.Y_Rechts_Min = 0;
        skalierung.Y_Rechts_Max = 440;
        skalierung.Y_Rechts_Schrittweite = 40;
        userSettings.qh_Skalierung = skalierung;

        //qh_Spuren
        const trackSettings = [];
        //defaultColors
        for (let i = 0; i < 3; i++) {
            const track = {};
            track.index = i;
            track.color = hslToHex(30 * i, 100, 75 - 25*Math.floor(i/12));
            track.bSkala_Links = true;
            trackSettings.push(track);
        }
        userSettings.qh_Spuren = trackSettings;

    }
    return userSettings;
}




function startQH() {
    

		//defaultColors = generateDefaultColors();
        
        /*
        canvas = document.getElementById('myqCanvas');
        canvas.width = 1120;
        canvas.height =630;
        qctx = canvas.getContext('2d');
        qctx.clearRect(0, 0, canvas.width, canvas.height);
        */
        //canvasOffset = document.querySelector("#myqCanvas").offset();
        //offsetX = canvasOffset.left;
        //offsetY = canvasOffset.top;

        diagramHeader = loadHeader(QHHeaderFile);
        diagramData = loadData();
		
        //writeToTextFile(QHSettingTestFile)
        if (!window.UserSettings) window.UserSettings = getUserSettings();

        //var sQHInfo = getQH_Info_St(Steuerung);
        //QHInfo = $.parseJSON(sQHInfo);
        //var qhidx = QHInfo.LastItemIndex;

        //dLastUpdate = new Date(QHInfo.LastItemDate);
        //dLastUpdate_ms = dLastUpdate.getTime();
        //dLastUpdate_ms += qhidx * 15 * 60 * 1000;
        //dLastUpdate.setTime(dLastUpdate_ms);

        //sLastUpdate = dLastUpdate.getDate() + "." + (dLastUpdate.getMonth() + 1) + "." + dLastUpdate.getFullYear();
        //sLastUpdate += " " + dLastUpdate.getHours() + ":" + dLastUpdate.getMinutes() + " Uhr";

        //document.querySelector("#LabelQHInfo").text("Letzte Aktualisierung: " + sLastUpdate);

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
		var Settings = JSON.parse(readFromTextFile(QHSettingFile));
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
    window.UserSettings.qh_Skalierung.Y_Links_Min = YLMin;
    window.UserSettings.qh_Skalierung.Y_Links_Max = YLMax;
    window.UserSettings.qh_Skalierung.Y_Links_Schrittweite = YLStep;
    window.UserSettings.qh_Skalierung.Y_Rechts_Max = YRMax;
    window.UserSettings.qh_Skalierung.Y_Rechts_Schrittweite = YRStep;

}

function loadData(_diagramDatum) {
    const period = document.querySelector(`.period`).value;
    const Steuerung = ``;
    const diagramDatum = (_diagramDatum) ? _diagramDatum : InitialDatum();

    if (period === `tagesgang`) {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, diagramDatum, true, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (period === `wochengang`) {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextWeek(diagramDatum)), false, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (period === `monatsgang`) {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextMonth(diagramDatum)), false, false));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
    if (period === `jahresgang`) {
        var sdata = requestData(createDataRequestObject(Steuerung, diagramDatum, prevDay(nextYear(diagramDatum)), false, true));
        if (sdata == "")
            sdata = "[]";
        //var data = $.parseJSON(sdata);
        return sdata;
    }
}

function drawData() {
    return;
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
		//var isEnabled = document.querySelector('#' + "enableTrack_" + spurindex).prop("checked");
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
			

			//var isLeft = document.querySelector('#' + "cbSettingsL_" + j).prop("checked");
			var isLeft = document.querySelector(`#cbSettingsL_${spurindex}`).checked;
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
	
	if (shdr == null) return null;
	
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


//find records from window.qhData
function requestData(DataRequestObject) {
    var res = [];
	var dtFrom = new Date(DataRequestObject.DatumFrom.y, DataRequestObject.DatumFrom.m -1, DataRequestObject.DatumFrom.d);
	var dtTo = 	 new Date(DataRequestObject.DatumTo.y, DataRequestObject.DatumTo.m -1, DataRequestObject.DatumTo.d);
	var currentDate = new Date();
	var today = new Date().toLocaleString().split(',')[0];;
	var DatumFrom = dtFrom.toLocaleString().split(',')[0];
	var DatumTo =   dtTo.toLocaleString().split(',')[0];
	var startIndex = window.qhData.findIndex(x => x.Datum === DatumFrom);
	var endIndex = window.qhData.findIndex(x => x.Datum === DatumTo);
	if(DatumFrom == DatumTo)
		endIndex = startIndex + 96;
	if (DataRequestObject.bJahresdaten == true)
	{
		res = window.qhData.slice(startIndex, endIndex);
	}
		
	else
	{
		if(DataRequestObject.bViertelstunden == true)
		{
				res = window.qhData.slice(startIndex, endIndex);
		}
		else
		{
				var recordFound = window.qhData.slice(startIndex, endIndex);
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
			emptyRecord.Projektnumer = projektNummer;
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
    document.querySelector("#ModalMenuTitle").textContent = "Farbe auswählen";
    document.querySelector("#ModalMenuContent").replaceChildren();
    document.querySelector("#LabelConfirm").textContent = "Entfernen";
    var cont = '<div style="float:left;">';
    var i = 0;
	//console.log(defaultColors);
    var nc = defaultColors.length;
    for (var i = 0; i < nc; i++) {
        color = defaultColors[i];
        cont += '<div id="col_' + i + '" style="background-color: ' + color + '; width: 28px; height:28px; float:left;" onclick="ColorSelectionHandler(id)">&nbsp</div>';
    }
    cont += '</div></br>';
    document.querySelector("#ModalMenuContent").append(cont);
    location.href = "#ModalMenu";

}

/*
Farbauswahl:
 
Die ausgewwählten Spuren werden in einer sortierten Liste in den Usersettings verwaltet.
Der Zufriff erfolgt über den dort mit abgelegten Spur-Index.
*/

function ColorSelectionHandler(id) {
    inColorMenue = true;
    //var si = id.substring(4);
    const i = parseInt(id.substring(4));
    const sCol = defaultColors[i];
    if (sCol === `white` || sCol === `#FFFFFF`) {   //wenn weiß ausgewählt wird -> gleichbedeutend mit Spur entfernen!
        ConfirmColorMenu();
    }
    else {
        const Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
        //var nSpuren = UserSettings.qh_Spuren.length;
        const itemsFound = Spuren.filter(el => el.index === TrackInEdit);
        if (itemsFound.length > 0) {
            //var SpurIndex = 1;
            const item = itemsFound[0];
            // patch 19.05.2016: Bug bei Farbauswahl
            const idx = UserSettings.qh_Spuren.indexOf(item);
            //UserSettings.qh_Spuren[TrackInEdit].color = sCol;
            UserSettings.qh_Spuren[idx].color = sCol;
        }
        else {
            const isLeft = document.querySelector(`#cbSettingsL_${TrackInEdit}`).prop("checked");
            const itm = { bSkala_Links: isLeft, color: sCol, index: TrackInEdit, enabled: true }; //Wenn Spur in Settings ergänzt wird -> enabled setzen!
            UserSettings.qh_Spuren.push(itm);
            UserSettings.qh_Spuren = sortAscending(UserSettings.qh_Spuren.index, UserSettings.qh_Spuren);
        }

        InitSettings();
        drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
        drawData();
        inColorMenue = false;
        location.href = "#";
    }
}

function ConfirmModalMenu() {
    if (inColorMenue)
        ConfirmColorMenu();
    if (inScaleMenue)
        YScaleMenuConfirm();
}

function CancelModalMenu() {
    location.href = "#";
	hideElemementById('osk');
}

function ConfirmColorMenu() {

    // Color-Eintrag entfernen
    inColorMenue = false;
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var itemsFound = Spuren.filter(el => el.index === TrackInEdit);
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


function enableDisableTrack(target) {
    const {id} = target;
    const idx = parseInt(id.match(/\d+/));
	
	const foundItem = UserSettings.qh_Spuren.find(el => el.index === idx);
    if (foundItem) {
        foundItem.enabled = target.checked;
		InitSettings();
		drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
		drawData();
	}
}


function SettingsLeftRightHandler(target) {
    const {id} = target;
    var checked = document.querySelector('#' + id).checked;
    var theOther = id;
    var iTrack = id.substring(id.indexOf("_") + 1);
    var idx = theOther.indexOf("L");
    if (idx >= 0)
        theOther = theOther.replace('L', 'R');
    else
        theOther = theOther.replace('R', 'L');
    document.querySelector('#' + theOther).checked = !checked;
    if (idx >= 0)
        setScaleSelection(iTrack, true);
    else
        setScaleSelection(iTrack, false);
}

function setScaleSelection(idx, bLeft) {
    var Spuren = UserSettings.qh_Spuren; // bSkala_Links, color, index, enabled
    var itemsFound = Spuren.filter(el => el.index === idx);
    if (itemsFound.length > 0) {
        itemsFound[0].bSkala_Links = bLeft;
        InitSettings();
        drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);
        drawData();
    }

}

function createSettingsItem(id, text, useLeftScale, color) {
    //console.log(color);

    const container = document.createElement(`div`);
    container.classList.add(`QHdivTrack`);
        const inpColor = document.createElement(`input`);
        inpColor.type = `color`;
        inpColor.value = color;
        container.appendChild(inpColor);
        inpColor.classList.add(`colpick`);
        inpColor.addEventListener(`change`, ev => colorPickerHandler(ev.target));

        const divText = document.createElement(`div`);
        container.appendChild(divText);
        divText.classList.add(`SettingsText`);
        divText.innerText = text;

        const divScaleCb = document.createElement(`div`);
        container.appendChild(divScaleCb);
        divScaleCb.classList.add(`QHdivCBscale`);
        for(let i = 1; i <= 2; i++) {
            const lblcb = document.createElement(`label`);
            divScaleCb.appendChild(lblcb);
            lblcb.classList.add(`lblcb`);
                const rBtn = document.createElement(`input`);
                rBtn.type = `radio`;
                lblcb.appendChild(rBtn);
                rBtn.id = `cbSettings${(i === 1) ? 'L' : 'R'}_${id}`;
                rBtn.classList.add(`ekhCheckbox`);
                rBtn.name = `qhScale${id}`;
                rBtn.checked = (i === 1) ? useLeftScale : !useLeftScale;
                //rBtn.addEventListener(`change`, ev => SettingsLeftRightHandler(ev.target));

                const spanCheckmark = document.createElement(`span`);
                lblcb.appendChild(spanCheckmark);
                spanCheckmark.classList.add(`checkmark`);
        }             
    
    return container;
}

var defaultColors =
	["#C31D64", "#B4286C", "#A53373", "#963D7B", "#874883", "#78538B",
	 "#6A5E92", "#5B699A", "#4C74A2", "#3D7EAA", "#2E89B1", "#1F94B9",	 
	
	 "#000000", "#0D0D0D", "#1A1A1A", "#262626", "#333333", "#404040",
	 "#4D4D4D", "#595959", "#666666", "#737373", "#808080", "#8C8C8C",
	 "#969696", "#9F9F9F", "#A9A9A9", "#B2B2B2", "#BCBCBC", "#C6C6C6",
	 "#CFCFCF", "#D9D9D9", "#E2E2E2", "#ECECEC", "#F5F5F5", "#FFFFFF",	 
	 
	 "#FF0000", "#FF4000", "#FF8000", "#FFBF00", "#FFFF00", "#BFFF00",
	 "#80FF00", "#40FF00", "#00FF00", "#00FF40", "#00FF80", "#00FFBF",
	 "#FF0040", "#FF0080", "#FF00BF", "#FF00FF", "#BF00FF", "#8000FF",
	 "#4000FF", "#0000FF", "#0040FF", "#0080FF", "#00BFFF", "#00FFFF",
	 
	 "#800000", "#802000", "#804000", "#806000", "#808000", "#608000",
	 "#408000", "#208000", "#008000", "#008020", "#008040", "#008060",
	 "#800020", "#800040", "#800060", "#800080", "#600080", "#400080", 
	 "#200080", "#000080", "#002080", "#004080", "#006080", "#008080"];//*/
	 

/*var defaultColors = ["#931414", "#920000", "#4c5660", "#39444f", "#485663", "#315172", "#920000",
    "#540000", "#2d2d2d", "#bbbaba", "#aaa9a9", "#4b6d8e", "#385d82", "#6ca6cd",
    "#38d6e0", "#4dffff", "#4da6ff", "#0080ff", "#0000ff", "#0099cc", "#ff4444",
    "#4775a3", "#dadada", "#cbcbcb", "#336699", "#669999", "#ada59c", "#ede1d1",
    "#e6e4e1", "#ada59c", "#e7e5d9", "#ffa500", "#cc474b", "#ffa500", "#000000",
    "#008000", "#ffff00", "#ff0000", "#ffc0cb", "#CCFF33", "#B88A00", "#CC33FF"
];*/

function InitSettings() {
    const qSettings = document.querySelector("#qSettings");
    qSettings.replaceChildren();
    
    const div = document.createElement(`div`);
    qSettings.appendChild(div);
  
    diagramHeader.forEach((el, i) => {
        const foundItem = UserSettings.qh_Spuren.find(spur => spur.index === i);
        const useLeftScale = (foundItem) ? foundItem.bSkala_Links : true;
        const color = (foundItem) ? foundItem.color : `#EFEFEF`;
        div.appendChild(createSettingsItem(i, `${el.Bezeichnung.trim()} [${el.Einheit}]`, useLeftScale, color));
    });
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
    return;

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

/*function launchYScaleMenue() {
    inScaleMenue = true;
    document.querySelector("#ModalMenuTitle").textContent = "Y-Skalierung bearbeiten";
    document.querySelector("#ModalMenuContent").replaceChildren();
    document.querySelector("#LabelConfirm").textContent = "Ok";
    
    const div = document.createElement(`div`);

    const p = document.createElement(`p`);
    div.appendChild(p);
    p.textContent = `Y-Links Max`;

    const input = document.createElement(`input`);
    div.appendChild(input);
    input.id = 
    


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
    document.querySelector("#ModalMenuContent").append(cont);
    location.href = "#ModalMenu";
	
	var osk = showElemementById('osk');
	var modal = document.getElementById('ModalMenuDiv');
	osk.style.left = modal.offsetLeft + 'px';
	osk.style.top = modal.offsetTop + modal.offsetHeight + 40 + 'px';
	
	//Set Focus to End of first Inputfield of ScaleMenue
	var focusedInput = document.querySelector('#inpYLMax');
	var strLength = focusedInput.val().length * 2;

	focusedInput.focus();
	focusedInput[0].setSelectionRange(strLength, strLength);
}*/

function isValidFloat(fString) {
    var f = parseFloat(fString);
    return (f != NaN);
}

function YScaleMenuConfirm() {
    var sf = document.querySelector("#inpYLMax").val().trim().replace(",", "."); var fYLMax = parseFloat(sf);
    sf = document.querySelector("#inpYLMin").val().trim().replace(",", "."); var fYLMin = parseFloat(sf);
    sf = document.querySelector("#inpYLStep").val().trim().replace(",", "."); var fYLStep = parseFloat(sf);
    sf = document.querySelector("#inpYRMax").val().trim().replace(",", "."); var fYRMax = parseFloat(sf);
    sf = document.querySelector("#inpYRStep").val().trim().replace(",", "."); var fYRStep = parseFloat(sf);

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
	
    hideElemementById('osk');
}

function toggleDauerlinie() {
	var btn = isDauerlinie();
	if (btn) {
		btn.id = 'btnDauerlinie';
	}
	else {
		btn = document.getElementById('btnDauerlinie');
		btn.id += 'Checked';
	}
}

function isDauerlinie() {
	return document.getElementById('btnDauerlinieChecked');
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
        var checked = document.querySelector('#cbForceQH').checked;
        diagramForceQH = checked;
    }

    if (id == "btnSaveSelection") {
        saveTrackSelection();
    }

    if (id == "btnYScale") {
        //launchYScaleMenue();
    }

    if (id.includes("btnDauerlinie")) {
        toggleDauerlinie();
    }

    if (id == "btnGetData") {
        OpenModalQH();
        DatenHolen(Steuerung);
		CloseModalQH();
    }

    if (id == "btnUpdateQHHeader") {
        UpdateQHHeaderRaw(Steuerung);
    }

    diagramData = loadData();

    drawGrid(diagramLeft, diagramTop, diagramWidth, diagramHeight, diagramZeitraum, diagramDatum);

    drawData();
}

function DatenHolen() {
	const MAX_CYCLE_TIMEOUT = 80;
	var updated = false;
	var error = false;
	var date = InitialDatum();
	
	do {	//Schleife für Mehrtageabholung
		var lastQHData = window.qhData[window.qhData.length - 1];
		var lastQHDatum = lastQHData.Datum.split('.');
		if (lastQHDatum[2] == undefined || lastQHDatum[1] == undefined || lastQHDatum[0] == undefined) error = true;
		
		if (!error) {
			const YEAR2020 = new Date(2020, 0, 1);
			var date_ms = new Date();
			date_ms = date_ms.getTime();
			//console.log(date_ms);
			var lastQHdt = new Date(lastQHDatum[2], (parseInt(lastQHDatum[1]) - 1), lastQHDatum[0]); //month index from 0-11
			//console.log(YEAR2020.getTime(), lastQHdt.getTime(), date_ms);
			if ((lastQHdt.getTime() < YEAR2020.getTime()) || (lastQHdt.getTime() > date_ms)) error = true;
		}
		
		if (!error) {
			getData(QHUpdateURL + lastQHDatum[2] + lastQHDatum[1].padStart(2, '0') + lastQHDatum[0].padStart(2, '0') + lastQHData.Index.padStart(2, '0'));		//viertdat.txt auf MPC erzeugen lassen
			//console.log(QHUpdateURL + lastQHDatum[2] + lastQHDatum[1].padStart(2, '0') + lastQHDatum[0].padStart(2, '0') + lastQHData.Index.padStart(2, '0'));
			var r_datum = lastQHdt;
			var r_index = parseInt(lastQHData.Index) + 1;	//zu schreibenden Index generieren
			
			if (r_index > 96) {								//zu schreibenden Index verifizieren; ggf. Tagesüberlauf
				r_index = 1;
				r_datum = new Date(lastQHDatum[2], (parseInt(lastQHDatum[1]) - 1), (parseInt(lastQHDatum[0]) + 1)); //month index from 0-11; +Tagesüberlauf
			}
			
			var i = 0;
			do {			//prüfen ob viertdat.txt verfügbar (Bit30 also 3.LSB [Wert==4] in V012)
				var fb = getData(FBviertdatURL);
				//console.log(fb);
				fb = parseInt(fb.slice(18,19), 16);	//Antwort auf die letzten 4Bit (hex) reduzieren
				fb &= 4;							//VerUndung mit Bitmaske (4==0100) 
				i++;								//für notfallausstieg/Timeout
				//console.log(fb);
			} while (fb != 0 && i<MAX_CYCLE_TIMEOUT);				//wiederholen bis Bit30 == 0;
			//console.log(i);
			
			var QHTrackNumber = loadDataTrackNumber(QHHeaderFile);	//Anz. Spuren aus vierttx.txt holen
			if (QHTrackNumber == null) return null;
			var QHData = readFromTextFile(QHUpdateFile);			//viertdat.txt auslesen
			if (QHData == null) return null;
			
			
			if (projektNummer == QHData.substring(0,5) &&			//Verifizierung viertdat.txt
				r_datum.toLocaleString().split(',')[0] == QHData.substring(5,7).trim() + '.' + QHData.substring(7,9).trim() + '.20' + QHData.substring(9,11).padStart(2, '0') &&
				r_index.toString() == QHData.substring(11,13).trim()) {
				
				updated = true;
				//console.log('Update läuft...');
				var QHBuffer = QHData.split(',');					//Spurdaten in Array laden
				
				for (var i=0; i<QHBuffer.length; i++) {				//Arraydaten auf Messwerte reduzieren(11 Zeichen)
					QHBuffer[i] = QHBuffer[i].slice(-11);
				}
				for (var i=0; i<10; i++) {							//Array um Reservespuren erweitern (relevant für letzte Messwerte; s.u.)
					QHBuffer.push(-999.00);
				}
				
				var recordArray = Float32Array.from(QHBuffer);		//Float32Array aus Array generieren (gemäß window.qhData)
				
				while (recordArray.length > window.qhData[0].nValues && r_index <= 96) {		//window.qhData erweitern bis Ende erreicht
					var record = {};
					record.Datum = r_datum.toLocaleString().split(',')[0];
					record.Index = r_index.toString();
					record.nValues = window.qhData[0].nValues;
					record.Projektnumer = projektNummer;
					record.Values = recordArray.slice(0, record.nValues);
					record.Values.fill(-999.00, QHTrackNumber, record.nValues);		//Reservespuren mit DEFAULTWERT füllen
					//console.log(record);
					window.qhData.push(record);
					
					r_index++;
					
					recordArray = recordArray.slice(QHTrackNumber);					//Float32Array beschneiden
					//console.log(recordArray.length);
				}				
			
			}
		}
		
	} while (!error && (date.d != lastQHDatum[0] || date.m != lastQHDatum[1] || date.y != lastQHDatum[2])); 
	if (error) alert('inkonsitente Daten!');
	return updated;
}

//////////////////////EventListeners//////////////////////
function simulateColorPickClick(target) {
    //reset TimerID
    window.timerColorPickClicks = undefined;
    target.click();
    //console.log(`simulateColorPickClick`);
}
function colorPickChangeHandler(target) {
    const targetIdx = parseInt(target.className.match(/\d+/).toString());
    //const currentColor = Array.from(qhTable.querySelectorAll(`input[type='color']`)).find(inpColor => inpColor.idx === targetIdx).value;  
    //console.log(useLeftScale);
    const qhTable = document.querySelector(`.qhTable`);
    const qh_SpurenEntry = qhTable.qh_Spuren.find(qh_Spur => qh_Spur.index === targetIdx);
    if (target.value !== `#efefef`) {
        const useLeftScale = qhTable.querySelector(`.qhScale${targetIdx}_L`).checked;
        if (qh_SpurenEntry) {
            qh_SpurenEntry.color = target.value;
            //qh_SpurenEntry.bSkala_Links = useLeftScale;
        }
        else {
            const newEntry = {};
            newEntry.index = targetIdx;
            newEntry.color = target.value;
            newEntry.bSkala_Links = useLeftScale;
            qhTable.qh_Spuren.push(newEntry);
        }
    }
    else {
        qhTable.qh_Spuren.splice(qhTable.qh_Spuren.indexOf(qh_SpurenEntry), 1);
    }
    //console.log(qhTable.qh_Spuren);
    drawQhData();
}
function colorPickDblclickHandler(target) {
    //interrupt clickTimer & reset timerID cuz dblClick (disableTrack is users input)
    clearTimeout(window.timerColorPickClicks);
    window.timerColorPickClicks = undefined;
    //ev.target.value = `#EFEFEF`;
    //console.log(`dblClick`);

    const {lastValue, value} = target;
    if (lastValue) {
        target.value = lastValue;
        target.lastValue = undefined;
    }
    else {
        target.lastValue = value;
        target.value = `#EFEFEF`;
    }
    colorPickChangeHandler(target);
    //target.lastValue = target.value;
    //target.toggleAttribute(`disabled`);
    
}