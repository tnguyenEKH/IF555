//////////////////////Konstanten//////////////////////
const ONE_DAY_IN_MS = 86400000;
const MAX_STEPS_ON_Y_SCALES = 20;
const LOWER_SCALE_STEP_LIMIT_RATIO = 1 / MAX_STEPS_ON_Y_SCALES;
const UPPER_SCALE_STEP_LIMIT_RATIO = 1 - LOWER_SCALE_STEP_LIMIT_RATIO;


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
    //console.log(prjNo);
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
    //////////////////////dataPreparation by Tracks//////////////////////
    const qhDataByTracks = [];
    for(let i = 0; i < qhDataTrackTotalCount; i++) {
        const trackData = [];
        qhDataByTracks.push(trackData);
    }
    for(let i = 0; i < totalRecords; i++) {
        const rawRecord = qhDataRaw.slice((i*recordLength), ((i+1)*recordLength));
        
        const date   = new Date("20"+ rawRecord[0].toString(), (rawRecord[1] -1).toString(), rawRecord[2].toString()); //month index from 0-11
        date.setSeconds(((rawRecord[3] - 1) * 15 + 7.5) * 60);
        
        rawRecord.slice(timestampLength, recordLength).forEach((value, idx) => {
            const entry = {};
            entry.date = date;
            entry.value = value;
            qhDataByTracks[idx].push(entry);
        });
    }


    //////////////////////init HTML//////////////////////
    //////////////////////createQhCanvas with max ViewportSize//////////////////////
    initQhTable(qhHeader, qhUserSettings);
    resizeQhCanvases();
    drawQhScale(qhUserSettings);
    initQhData(qhDataByTracks);
    drawQhData();


    //////////////////////addEventListeners//////////////////////
    //window.addEventListener(`resize`, resizeQhCanvases);
    document.querySelectorAll(`.qhScale > input`).forEach(input => { input.addEventListener(`blur`, qhScaleInputEventHandler); });
    document.querySelectorAll(`.qhControlsContainer > *`).forEach(el => { el.addEventListener(`click`, qhControlElementEventHandler); });
    //document.querySelector(`.btnSaveUserSettings`).addEventListener(`click`, saveUserSettings)
    
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
    const qhScaleX = document.querySelector(`.qhScaleX`);
    if (qhUserSettings) { //init if parameter qhUserSettings is passed
        qhScaleX.qh_Skalierung = qhUserSettings.qh_Skalierung;
    }
    const {qh_Skalierung} = qhScaleX;
    
    const scaleIds = [`Left`, `Right`];
    const userSettingsScaleId = [`Links`, `Rechts`];
    userSettingsScaleId.forEach((id, idx) => {
        document.querySelector(`.qhScale${scaleIds.at(idx)}Min`).value = qh_Skalierung[`Y_${id}_Min`];
        document.querySelector(`.qhScale${scaleIds.at(idx)}Max`).value = qh_Skalierung[`Y_${id}_Max`];
        document.querySelector(`.qhScale${scaleIds.at(idx)}Steps`).value = qh_Skalierung[`Y_${id}_Schrittweite`];
    

        const scaleRange = qh_Skalierung[`Y_${id}_Max`] - qh_Skalierung[`Y_${id}_Min`];
        const deltaSteps = qh_Skalierung[`Y_${id}_Schrittweite`] - qh_Skalierung[`Y_${id}_Min`];
        const noOfSteps = scaleRange / deltaSteps;
        const stepsFraction = (noOfSteps % 1 > 0 && noOfSteps % 1 < LOWER_SCALE_STEP_LIMIT_RATIO) ? (noOfSteps % 1) + 1 : (noOfSteps % 1); //if Step is too close too max...
        //console.log(noOfSteps, stepsFraction);
        const qhScaleLeft = document.querySelector(`.qhScale${scaleIds.at(idx)}`);
        qhScaleLeft.querySelectorAll(`input[disabled]`).forEach(additionalInput => additionalInput.remove());
        
        qhScaleLeft.style.gridTemplateRows = `${(stepsFraction) ? stepsFraction : 1}fr 1fr`;
        if (stepsFraction < 1) {
            for (let i = 2; i < noOfSteps; i++) {
                const input = document.createElement(`input`);
                input.type = `text`;
                input.value = `${qh_Skalierung[`Y_${id}_Min`] + i*deltaSteps}`.substring(0, 6);
                input.disabled = true;
                qhScaleLeft.insertBefore(input, qhScaleLeft.firstElementChild);
                qhScaleLeft.style.gridTemplateRows += ` 1fr`;
            }
        }
    });
}

function initQhData(qhDataByTracks) {
    const qhTrackCanvas = document.querySelector(`.qhTrackCanvas`);
    qhTrackCanvas.qhDataByTracks = qhDataByTracks;
}

function drawQhData(endDate = undefined) {
    //console.log(endDate);
    const qhHeader = document.querySelector(`.qhHeader`);
    if (endDate) {
        qhHeader.endDate = new Date(endDate.getTime());
        qhHeader.endDate.setHours(0,0,0,0);
    }
    else if (!qhHeader.endDate) {
        qhHeader.endDate = new Date(Date.now());
        qhHeader.endDate.setDate(qhHeader.endDate.getDate() + 1);
        qhHeader.endDate.setHours(0,0,0,0);
    }
    //console.log(qhHeader.endDate);

    const qhTrackCanvas = document.querySelector(`.qhTrackCanvas`);
    const ctx = qhTrackCanvas.getContext(`2d`);
    ctx.clearRect(0, 0, qhTrackCanvas.width, qhTrackCanvas.height);
    //////////////////////draw Tracks//////////////////////
    const period = document.querySelector(`.period`).value;
    //const endDate = new Date(2024,2,4);
    const startDate = new Date(qhHeader.endDate.getTime());
    startDate.setDate(qhHeader.endDate.getDate() - 1);
    if (period === `wochengang`) startDate.setDate(qhHeader.endDate.getDate() - 6);
    if (period === `monatsgang`) {
        startDate.setMonth(qhHeader.endDate.getMonth() - 1);
        startDate.setDate(startDate.getDate() + 1);
    }
    if (period === `jahresgang`) {
        startDate.setFullYear(qhHeader.endDate.getFullYear() - 1);
        startDate.setDate(startDate.getDate() + 1);
    }
    qhHeader.innerText = (qhHeader.endDate.getTime() - startDate.getTime() <= ONE_DAY_IN_MS) ? `${startDate.toLocaleDateString()}` : `${startDate.toLocaleDateString()} - ${qhHeader.endDate.toLocaleDateString()}`;
    
    const forceQhData = document.querySelector(`.cbForceQh`).checked;
    const isDauerlinie = document.querySelector(`.cbDauerlinie`).checked;
    const avgIdxCount = (forceQhData || period === `tagesgang` || isDauerlinie) ? 1 : 8; //2h-Mittelwert == 8*15min
    const qhScaleX = document.querySelector(`.qhScaleX`);
    const {qh_Skalierung} = qhScaleX;
    const {Y_Links_Min, Y_Links_Max, Y_Links_Schrittweite, Y_Rechts_Min, Y_Rechts_Max, Y_Rechts_Schrittweite} = qh_Skalierung;
    const qhTable = document.querySelector(`.qhTable`);
    const periodValueCount = (qhHeader.endDate.getTime() - startDate.getTime()) / 1000 / 60 / 15;
    
    qhTable.qh_Spuren.forEach(track => {
        relevantQhDataByTracks = qhTrackCanvas.qhDataByTracks[track.index].filter(el => (el.date.getTime() >= startDate.getTime() && el.date.getTime() <= qhHeader.endDate.getTime()));
        (isDauerlinie) ? relevantQhDataByTracks.sort((a, b) => b.value - a.value) : relevantQhDataByTracks.sort((a, b) => b.date.getTime() - a.date.getTime());        
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const scaleMin = (track.bSkala_Links) ? Y_Links_Min : Y_Rechts_Min;
        const scaleMax = (track.bSkala_Links) ? Y_Links_Max : Y_Rechts_Max;
        const scaleRange = scaleMax - scaleMin;
        let yVal = 0;
        relevantQhDataByTracks.forEach((dataset, idx) => {
            yVal += dataset.value;
            if ((idx+1) % avgIdxCount === 0) {
                yVal = constrain(yVal/avgIdxCount, scaleMin, scaleMax)/scaleRange * qhTrackCanvas.height;
                const xVal = (idx + .5)/periodValueCount * qhTrackCanvas.width;
                (idx / avgIdxCount >= 1) ? ctx.lineTo(xVal, yVal) : ctx.moveTo(xVal, yVal);
                yVal = 0;
            }
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
    //console.log(response);
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

// URL Query Strings auswerten
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
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
function qhScaleInputEventHandler(ev) {
    const {target} = ev;
    const {className} = target;
    
    if (target.validity.valid) {
        target.value = target.value.replace(`,`,`.`);

        const scaleId = className.match(/(Left|Right)/).at(0);
        const scaleMax = document.querySelector(`.qhScale${scaleId}Max`);
        const scaleMin = document.querySelector(`.qhScale${scaleId}Min`);
        if (!className.includes(`Max`))
            scaleMax.value = Math.max(scaleMax.value, parseFloat(scaleMin.value) + 1);
        if (!className.includes(`Min`))
            scaleMin.value = Math.min(scaleMin.value, parseFloat(scaleMax.value) - 1);
        const scaleRange = scaleMax.value - scaleMin.value;
        const lowerStepsLimit = LOWER_SCALE_STEP_LIMIT_RATIO * scaleRange + parseFloat(scaleMin.value);
        const upperStepsLimit = UPPER_SCALE_STEP_LIMIT_RATIO * scaleRange + parseFloat(scaleMin.value);
        const scaleSteps = document.querySelector(`.qhScale${scaleId}Steps`);
        scaleSteps.value = `${constrain(scaleSteps.value, lowerStepsLimit, upperStepsLimit)}`.substring(0, 6);

        const qhUserSettings = document.querySelector(`.qhScaleX`).qh_Skalierung;
        const userSettingsScaleId = (scaleId === `Left`) ? `Links` : `Rechts`;
        qhUserSettings[`Y_${userSettingsScaleId}_Min`] = parseFloat(document.querySelector(`.qhScale${scaleId}Min`).value);
        qhUserSettings[`Y_${userSettingsScaleId}_Max`] = parseFloat(document.querySelector(`.qhScale${scaleId}Max`).value);
        qhUserSettings[`Y_${userSettingsScaleId}_Schrittweite`] = parseFloat(document.querySelector(`.qhScale${scaleId}Steps`).value);
        drawQhScale();
        if (!className.includes(`Steps`))
            drawQhData();
    }
    else {
        target.title = target.validity.toString();
    }
}

function qhControlElementEventHandler(ev) {
    const {target} = ev;
    const {classList, value, type} = target;
    //console.log(type);
    if (classList.contains(`qhDateControl`)) {
        const endDate = document.querySelector(`.qhHeader`).endDate;
        const direction = (value.includes(`-`)) ? -1 : 1;
        if (value.includes(` Jahr`))
            endDate.setFullYear(endDate.getFullYear() + direction);
        if (value.includes(` Monat`))
            endDate.setMonth(endDate.getMonth() + direction);
        if (value.includes(` Woche`))
            endDate.setDate(endDate.getDate() + direction * 7);
        if (value.includes(` Tag`))
            endDate.setDate(endDate.getDate() + direction);

        drawQhData(endDate);
    }
    else if (type === `checkbox`) {
        drawQhData();
    }
}

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