/********************* URL SETTINGS *********************/
const mpcJsonAddUrl = `http://172.16.0.102/JSONADD/`;
const mpcJsonGetUrl = `${mpcJsonAddUrl}GET?`;
const mpcJsonPutUrl = `${mpcJsonAddUrl}PUT?`;

const dataUrl = `${mpcJsonGetUrl}p=2&Var=all`;
const kalenderUrl = `${mpcJsonGetUrl}p=3&Var=all`;
const remoteUserConnectionUrl = `${mpcJsonGetUrl}p=4&Var=sel&V064`;
const prjNameUrl = `${mpcJsonGetUrl}p=4&Var=sel&V065`;
const FBviertdatURL = `${mpcJsonGetUrl}p=1&Var=sel&V012`;

const menuLink = `${mpcJsonPutUrl}V004=`;
const TastURL = `${mpcJsonPutUrl}V010=`;
const textInputUrl = `${mpcJsonPutUrl}V007=`;
const QHUpdateURL = `${textInputUrl}Q2`;

const piDataUrl = `http://172.16.0.101/Data/`;
const uploadSkriptUrl = `${piDataUrl}upload.php`;
const QHSettingFile = `${piDataUrl}QHSetting.txt`;

const HASH_FILE = `../SD_DATA/hash.txt`;
const bedienFile = `../SD_DATA/Bedien.pdf`;
const slpFile = `../SD_DATA/SLP.pdf`;

const QHHeaderFile = `./DATA/vierttx.txt`;
const QHUpdateFile = `./DATA/viertdat.txt`;


//////////////////////Doc Ready//////////////////////
//VanillaJS
function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}
ready(async () => {
	document.querySelector(`.loaderText`).innerText = `trying to connect to MPC	since ${new Date(Date.now()).toLocaleTimeString(`de-DE`)}`;
  //////////////////////addEventListeners//////////////////////
  document.addEventListener(`keydown`, keydownEventHandler)
  document.addEventListener(`keypress`, keypressEventHandler)
  document.querySelectorAll(`.tab`).forEach(tab => tab.addEventListener(`click`, ev => tabClickHanlder(ev.target)));

  //////////////////////get relevant Data to init//////////////////////
  const prjNameObject = await fetchData(prjNameUrl);
  const prjName = prjNameObject.V065;
  const qhHeaderBuffer = await fetchData(QHHeaderFile, `array`);
  const decoder = new TextDecoder(`Windows-1252`);
  const qhHeaderData = decoder.decode(qhHeaderBuffer);
  //console.log(qhHeaderData);
  const prjNo = qhHeaderData.substr(0,5);
  const qhDataFile = `${piDataUrl}${prjNo.substr(1)}.bin`;
  const qhDataBuffer = await fetchData(qhDataFile, `array`);
  const qhDataRaw = new Float32Array(qhDataBuffer);
  const noOfQhDataTracks = qhHeaderData.substr(41,3).trim(); //+10
  //console.log(qhDataRaw);

  
  //////////////////////init//////////////////////
  updateConnectionStatus(true);
  //initVisu();
  //initFb();
  initQh(qhHeaderData, qhDataRaw);
  initPdfs();
  tabClickHanlder(document.querySelector(`.tab3`));
});

function initFb() {
  //globals
  //window.stat1;                           // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
  //window.stat2;                           // 1: normale Ausgabe rot ab x > 20 
  //window.stat3;                           // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
  //window.stat4;                           // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
  //window.statTastzahl;                    // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zahleneingabe zu machen 
  //window.statTastzeich;                   // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
  //window.stat14haktiv;                    // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 
  //window.mousex;                          // 1: xPosition der Maus im Canvas
  //window.mousey;                          // 1: yPosition der Maus im Canvas
  window.toclipboard = false;               // Communikation Klick->Clipboard
  window.statmouseweek = false;             // Maus befindet sich im Wochenkalenderfenster 
  window.ASCII127PositionCurrentPage = [];
  window.zyklus = 40; 
	window.zykzaehler = 10;
	window.einmalholen = 7;
  const fernbedienungCanvas = document.getElementById('DisplayCanvas');    
  const ctx = fernbedienungCanvas.getContext('2d');                    
  initCanvas(fernbedienungCanvas, ctx);
  window.timerReloadFb = setInterval(refreshTextAreaWithoutParameterLocal, 50, ctx, fernbedienungCanvas );  /*  alle 50ms starten aber dann auf Zähler schauen <<< */
}

function initPdfs() {
  const bedien_pdf = new PDF_file(`${bedienFile}?${Date.now()}`, `bedien`);
	const slp_pdf = new PDF_file(`${slpFile}?${Date.now()}`, 'slp');
  callReader(bedien_pdf);
	callReader(slp_pdf);
}


/***********************Kommunikation*************************************/
async function fetchData(url, responseType = `json`) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`fetch responses with status: ${res.status}`);
      return null;
    }
    else {
      let data;
      if (responseType.match(/(json)/i)) {
        data = await res.json();
      }
      else if (responseType.match(/(array)/i)) {
        data = await res.arrayBuffer();
      }
      else {
        data = await res.text();
      }
      //console.log(data);
      return data;
    }
  }
  catch(err) {
    console.error(err);
  }
}

function getData(url) {
	var res;
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/plain; charset=Windows-1252');
    xhr.open("GET", url, false); 
	xhr.onreadystatechange = function(event){
		if (xhr.readyState == 4){
			var status = xhr.status;
			if(status === 0 || (status >=200 && status < 400)){
				if (xhr.response == "{\"result\":\"OK\"}\r\n"){
					xhr.open("GET", dataUrl, false);
					xhr.send();
					res = xhr.response
				}
				else {
					res = xhr.response;
				}
			}
			}
		else{
			res = "";
		}
	};
	xhr.send();
	return res;
}

function sendData(url) {
	var res;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, false); 
	xhr.onreadystatechange = function(event){
		if (xhr.readyState == 4){
			var status = xhr.status;
			if(status === 0 || (status >=200 && status < 400)){
					res = xhr.response;
				}
			}
		else{
			res = "";
		}
	};
	xhr.send();
	return res;
}

/*Read Textfile aus dem Ordner */
function readFromTextFile(fileName) {
	var res;
	var xhr = new XMLHttpRequest();
	xhr.overrideMimeType('text/plain; charset=Windows-1252')
	xhr.open("GET", fileName, false);
	if (fileName != QHSettingFile)
	{
		xhr.setRequestHeader('Cache-Control', 'no-cache');
	}
	xhr.onreadystatechange = function(event){
		if (xhr.readyState == 4){
			var status = xhr.status;
			if(status === 0 || (status >=200 && status < 400)){
					res = xhr.responseText;
				}
			}
		else{
			res = "";
		}
	};
	xhr.send();
	return res;
}
/*1/4h Datafile will ber served by Apache webserver, which is installed on Pi. 
*/
 function readQHFromFile(fileName) {
  var pufferArrayUint8;
  var dataArray;
  var xhr = new XMLHttpRequest();
  xhr.open("GET", fileName);
  xhr.responseType = "arraybuffer";
  xhr.send();
  xhr.onload = function(){
    if(this.status === 200)  
    pufferArray = new Float32Array(xhr.response)
  
    //pufferArray processing
    var res="";
    //define length of date and index in one datarecord
    var dayLength = 1;
    var monthLength = 1;
    var yearLength = 1;
    var datumLength = dayLength + monthLength + yearLength;
    var indexLength = 1;
    var dataTrackLength = 1;
    var recordTotalLength = datumLength + indexLength + dataTrackLength * numberOfDataTrack;
    var totalRecords = pufferArray.length/recordTotalLength;
    for(var i = 0; i< totalRecords; i++){
      var dataRaw = pufferArray.slice((i*recordTotalLength), ((i+1)*recordTotalLength));
      var record ={};
      
      var datum   = new Date("20"+ dataRaw[0].toString(), (dataRaw[1] -1).toString(), dataRaw[2].toString()); //month index from 0-11
      var index = dataRaw[3].toString();
      
      record.Datum = datum.toLocaleString().split(',')[0];
      record.Index = index;
      record.nValues = numberOfDataTrack;
      record.Projektnumer = prjNo;
	  record.Values = dataRaw.slice(4, recordTotalLength);
      allQHDataRecords.push(record);
    }
  }
} 

function writeToTextFile(data) {
  var formData = new FormData();
  formData.append("formData", data);
  var xhr = new XMLHttpRequest();
  //xhr.overrideMimeType('text/plain; charset=utf-8')
  xhr.open("POST", uploadSkriptUrl, true);
  xhr.send(formData);
  return xhr.responseText;
}


/********************************Operating**************************************************************************/

function initCanvas(canvasName, canvasContext){
	var parent = canvasName.parentNode;
	canvasName.width = parent.width;
	parent.offsetWidth > 0 ? canvasName.width = parent.offsetWidth : canvasName.width = 960;
	parent.offsetHeight > 0 ? canvasName.height = parent.offsetHeight : canvasName.height = 520;
	//var parent = document.getElementById('fernbedienungDisplay');
	//canvasName.width = parent.offsetWidth;
	//canvasName.height = parent.offsetHeight;
  
    canvasName.addEventListener("click", function (evt) {
        var rect = canvasName.getBoundingClientRect();

        if (window.stat4 == '1' && window.statmouseweek) {    //status 4:  Wochenkalender in CANVAS und Maus im Wochenfeld 
            var x = evt.clientX - rect.left;
            var y = evt.clientY - rect.top;
            var ypos = Math.round((y - 76) / 30) - 1;
            var xpos = Math.round((x - 50) / 5);
            var maus = Math.round(4001 + ypos * 144 + xpos)
            var TastURLId = TastURL + maus;
            var data = sendData(TastURLId);
        }
        else {

            var x = evt.clientX - rect.left;
            var y = 8 + evt.clientY - rect.top;

            var xr = Math.round(x / 16)   //   /16 Zeichenbreite (spalte column)
            var yr = Math.round(y / 30)   //   /30 Zeilenhoehe (zeile row)

             /************Ton Erweiterung***********************/
            /*erweiterte Logik to simulate clickevent von Eckhard
             Idee: aktuelle Postition of ASCII 127 wird im globalen Variable gespeichert, die wid bei jedem Datenabruf mit aktualisiert
             Die xr und yr, die  von Eckhard ermittelt wurde, wird mit den in den Position im globalen Variable abgeglichen
             Basierend auf die aktuelle Position wird die click event für das Textabschnitt auf dem Canvas als Click auf dem Button simulieren
             */

            /*reorganisieren der Postition of ASCII 127 wird im globalen Variable
             * es wird Zeile für Zeile überprüft, wie viele ASCII 127 in der Zeile sich befinden
             * wenn nur eine ASCII 127 da ist, wird die Koordinate der Spalte = Koordinate der ASCII 127 gesetzt
             * */

            // reorganizize der Postition of ASCII 127 wird im globalen Variable
            var allASCII127ColumnInRow = []
            for (var m = 0; m < window.ASCII127PositionCurrentPage.length; m++) {
                if (yr == window.ASCII127PositionCurrentPage[m].row) {
                    allASCII127ColumnInRow.push(window.ASCII127PositionCurrentPage[m].column);
                }
            }
            var columnsCount = allASCII127ColumnInRow.length
            // wenn nur ein ASCII 127 in der Zeile 
            if (columnsCount == 1) {
                xr = allASCII127ColumnInRow[0];
            }

            //wenn mehrere ASCII 127 in der Zeile sind
            else {
                var anchor;
                for (var n = 0; n < allASCII127ColumnInRow.length; n++) {
                    //Click event zwischen 2 ASCII127

                    if (window.stat4 != '1') {
                        if ((allASCII127ColumnInRow[n] < xr) && (xr <= allASCII127ColumnInRow[(n + 1)])) {
                            anchor = allASCII127ColumnInRow[n+1];
                        }
                    }

                    //window.stat4 =1 bedeutet größeres Display für Wochenkalender, die ASCII127 liegen am Anfang der Zeile, muss sonder behandelt werden
                    else {
                        if ((allASCII127ColumnInRow[n] < xr) && (xr < allASCII127ColumnInRow[(n + 1)])) {
                            anchor = allASCII127ColumnInRow[n];
                        }
                        if (xr >= allASCII127ColumnInRow[(n + 1)]) {
                            anchor = allASCII127ColumnInRow[n+1];
                        }
                    }


                }
                //Click event vor dem 1. ASCII127
                if (xr <= allASCII127ColumnInRow[0]) {
                    anchor = allASCII127ColumnInRow[0];
                }
                xr = anchor;
            }

			/* Ende der Erweiterung*/
         
		//1. Zeile, immer als Zurück zu voherige Seite
		if (yr == 1) {
			xr = 1;
		}
			
		var maus = Math.round(1000+yr*100+xr) 
		var TastURLId = TastURL + maus;
		var data = getData(TastURLId);
	  }

	  if (window.zykzaehler > window.einmalholen) {
		window.zykzaehler=window.einmalholen;
		window.tastzaehler=0;
	  }
	  else  {
		window.tastzaehler=window.einmalholen;
	  }

	  if (xr > 54 && yr < 3) {
		window.toclipboard=true;
	  }
	  
	}, false);
	
	
	canvasName.addEventListener('mousemove', function (evt) {
	  var rect = canvasName.getBoundingClientRect();
	  var x= evt.clientX - rect.left;
	  var y= evt.clientY - rect.top;
	  var xr = Math.round(x/1) 
	  var yr = Math.round(y/1) 

	  window.statmouseweek=false;

	  if (window.stat4 == '1') {    //status 4:  Wochenkalender in CANVAS anzeigen 
		if (xr > 50 && xr < 768 && yr > 91 && yr < 300) { 
		  window.statmouseweek=true;
		  window.mousex=xr;
		  window.mousey=yr;
		  timeweek(canvasContext);
		}
	  }
	  if (window.stat1 == '1') {
	    document.querySelector('#DisplayCanvas').style.cursor = 'default';
		var x = evt.clientX - rect.left;
		var y = 8 + evt.clientY - rect.top;
		var xr = Math.round(x / 16)   //   /16 Zeichenbreite (spalte column)
		var yr = Math.round(y / 30)   //   /30 Zeilenhoehe (zeile row)
		for (var i = 0; i < window.ASCII127PositionCurrentPage.length; i++) {
				if ((yr == window.ASCII127PositionCurrentPage[i].row) && (x < 530)) {
					document.querySelector('#DisplayCanvas').style.cursor = 'pointer';
				}
			}
		}
	}, false);
}

function timeweek (canvasContext) {
  ctx = canvasContext;	
  ctx.fillStyle = "#E0E0E0";
  ctx.fillRect(775, 90, 70, 220);

  var ypos = 85 + 30*(Math.round((window.mousey-76)/30));
  var timehour = Math.round((window.mousex-64)/30);
  var timemin = 10*Math.round((window.mousex-50-timehour*30)/5);
  ctx.fillStyle = "#000000";
  if (timemin > 50) {
    timemin=50; 
  }
  if (timemin < 10) {
    ctx.fillText(("00" + timehour).slice(-2) + ":00", 782, ypos); 
  }
  else {
    ctx.fillText(("00" + timehour).slice(-2) + ":" + timemin, 778, ypos); 
  }
}


function refreshTextAreaWithoutParameterLocal(canvasContext, canvasName, data) {
	var jsonData;
	var ctx = canvasContext;
	var Displaycanvas = canvasName;
	DisplayCanvas = canvas


 // ctx.fillStyle = "#E0E0E0";              // Testausgabe fuers Timing
 // ctx.fillRect(900, 20, 60, 40);
 // ctx.fillStyle = "#000000";
 // ctx.fillText(window.zykzaehler, 910, 40); 


    if (window.tastzaehler > 0) {                  // <<< 
      window.tastzaehler=window.tastzaehler-1;
      if (window.tastzaehler < 1) {
        window.zykzaehler=0;
      } 
    }
    if (window.zykzaehler > 1) {
      window.zykzaehler=window.zykzaehler-1;
    }
    else {                                   // <<< 
      if (window.tastzaehler < 2) {                             
        window.tastzaehler=0;
      } 
	  if(data == undefined){
		  jsonData = getData(dataUrl);
		  data = JSON.parse(jsonData);
	  }
	  else{
		  data = data;
	  }
      var x = data['v035'] - 1; //spalte, wo die texte anfang "rot" sein soll
      var y = data['v036'] + 15;    //Zeile, wo die Texte rot markiert werden soll
      var z = data['v037'];   //Anzahl der Zeichen, die rot markiert werden soll
      var s = data['v034'];   // DISPSTATUS  
      var variableName = "";
      var textToDisplay = "";
      var textToReplace = "";
      var rotText = "";
      var html = "";
      var rotHtml = "";
      var str = b32(s);
      var xpos= 1;                  //  Positionsvariable auf dem CANVAS  x (Pixel) 
      var ypos= 1;                  //  Positionsvariable auf dem CANVAS  y (Pixel)
      window.stat1=str.charAt(0);          // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
      window.stat2=str.charAt(1);          // 1: normale Ausgabe rot ab x > 20 
      window.stat3=str.charAt(2);          // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
      window.stat4=str.charAt(3);          // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
      window.statTastzahl=str.charAt(30);  // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" ode "T" eine Zahleneingabe 
      window.statTastzeich=str.charAt(31); // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
      window.stat14haktiv=str.charAt(29);  // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 

      //status 4:  Wochenkalender in CANVAS anzeigen    600 * 350                             
      // window.zykzaehler=window.zyklus; 
      if (window.stat4 == '1') {
				
		var row = 15;
		var column = 2;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
		var row = 15;
		var column = 35;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);

		var row = 16;
		var column = 2;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
		var row = 16;
		var column = 35;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);

		var row = 17;
		var column = 2;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
		var row = 17;
		var column = 35;
		var coordinateOfClickButton = { row, column };
		window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
		  
        window.zykzaehler=window.zyklus;
        jsonData = getData(kalenderUrl);
        data = JSON.parse(jsonData);
        ctx.fillStyle = "#E0E0E0";
        ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);
        ctx.fillStyle = "#000000";  
        ctx.font = "20px Arial";
        xpos= 5;    //  Positionsvariable auf dem CANVAS  x (Pixel) 
        ypos=25;    //  Positionsvariable auf dem CANVAS  y (Pixel)
        ctx.fillText("<", xpos, ypos);         //  Pfeil fuer Ausstieg
        xpos=20;    
        ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON fuer Ausstieg
        ctx.fillRect(xpos+1,ypos-20,20,23);
        ctx.fillStyle = "#1F94B9";	/*EKH blau*/
        ctx.fillRect(xpos+4,ypos-17,14,17);
        ctx.fillStyle = "#000000";

        xpos= 50;   
        ypos=25;    
        ctx.fillText("Wochenkalender von", xpos, ypos); 

        textToReplace = data['v039'].substring(13, 34)    // Name HK  auslesen aus 2. Zeile grosses Display x 13-34
        xpos= 50;
        ypos=ypos+30;
        ctx.fillText(textToReplace, xpos, ypos); 

        textToReplace = data['v039'].substring(39, 60)    //  Tag  Uhrzeit  auslesen aus 2. Zeile grosses Display x 39-60
        xpos=xpos+200;
        ypos=ypos+ 0;
        ctx.fillText(textToReplace, xpos, ypos); 

        textToReplace = data['v040'].substring(42, 57)    //  Zustand zum Zeitpunkt    auslesen aus 3. Zeile grosses Display x 42-57
        xpos=xpos+220;
        ypos=ypos+ 0;
        var index = textToReplace.indexOf("Tag");    
        if (index > 1) {
          ctx.fillStyle = "#C31D64";	/*EKH rot*/  
        }
        else {  
          index = textToReplace.indexOf("EIN");    
          if (index > 1) {
            ctx.fillStyle = "#C31D64";	/*EKH rot*/ 
          }
          else {  
            index = textToReplace.indexOf("HT");    
            if (index > 1) {
              ctx.fillStyle = "#C31D64";	/*EKH rot*/
            }
            else {  
              ctx.fillStyle = "#1F94B9";	/*EKH blau*/ 
            }
          }
        }
        ctx.fillText(textToReplace, xpos, ypos); 

        // Darstellung Wochenkalender im Canvas
        xpos= 50;
        ypos=ypos+30;
        ctx.fillStyle = "#303030";  
        ctx.fillText("0                              6                             12                            18                            24", xpos, ypos); 
        xpos=  2;
        ypos=ypos+30;
        ctx.fillText("MO",  xpos, ypos); 
        ypos=ypos+30;
        ctx.fillText("DI",  xpos, ypos); 
        ypos=ypos+30;
        ctx.fillText("MI",  xpos, ypos); 
        ypos=ypos+30;
        ctx.fillText("DO",  xpos, ypos); 
        ypos=ypos+30;
        ctx.fillText("FR",  xpos, ypos); 
		// ctx.fillStyle = "red";
        ctx.fillStyle = "#C31D64";	/*EKH rot*/  
        ypos=ypos+30;
        ctx.fillText("SA",  xpos, ypos); 
        ypos=ypos+30;
        ctx.fillText("SO",  xpos, ypos); 

        if (window.statmouseweek) {
          timeweek(canvasContext);
        }

		var Bheizkreis=0;    
        textToReplace = data['v040'].substring(42, 57)    //  Zustand zum Zeitpunkt    auslesen aus 3. Zeile grosses Display x 42-57
        index = textToReplace.indexOf("Tag");             //  -> es handelt sich um einen Heizkreiskalender
        if (index > 1) {
          Bheizkreis=1;
        }
        index = textToReplace.indexOf("Nacht");           //  -> es handelt sich um einen Heizkreiskalender
        if (index > 1) {
          Bheizkreis=1;
        }

        if (Bheizkreis > 0) {
          textToReplace = data['v056'].substring(48, 51)    //  an der Stelle steht bei einem Heizkreis der Betriebszustand (0:Auto, 1:Dauernacht, 2:Dauertag)

          ctx.fillStyle = "#000000";  
          xpos=550;    
          ypos=425;    
          ctx.fillText("HK-Zustand", xpos, ypos);        

          xpos=550;    
          ypos=451;    
          ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON HK Automatikbetrieb
          ctx.fillRect(xpos+1,ypos-20,20,23);
          ctx.fillStyle = "#1F94B9";	/*EKH blau*/
          ctx.fillRect(xpos+4,ypos-17,14,17);
          ctx.fillStyle = "#000000";
          xpos=580;    
          ctx.fillText("Automatikbetrieb (nach Wochenkalender)", xpos, ypos);        
          index = textToReplace.indexOf("1");               //  Automatikbetrieb
          if (index > 0) {
            ctx.strokeStyle = "#C31D64";         // EKH rot Kreuz setzen
            ctx.setLineDash([5,  0]);
            ctx.lineWidth = 3;
            xpos=xpos-25;    
            ypos=ypos-2;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos-12);
            ctx.stroke(); 
            ypos=ypos-12;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos+12);
            ctx.stroke(); 
          }          

          xpos=550;    
          ypos=481;    
          ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON HK Dauertagbetrieb 
          ctx.fillRect(xpos+1,ypos-20,20,23);
          ctx.fillStyle = "#1F94B9";	/*EKH blau*/
          ctx.fillRect(xpos+4,ypos-17,14,17);
          ctx.fillStyle = "#000000";
          xpos=580;    
          ctx.fillText("Dauertagbetrieb", xpos, ypos);        
          index = textToReplace.indexOf("3");               //  Dauertagbetrieb
          if (index > 0) {
            ctx.strokeStyle = "#C31D64";         // EKH rot Kreuz setzen
            ctx.setLineDash([5,  0]);
            ctx.lineWidth = 3;
            xpos=xpos-25;    
            ypos=ypos-2;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos-12);
            ctx.stroke(); 
            ypos=ypos-12;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos+12);
            ctx.stroke(); 
            ctx.strokeStyle = "#606060";         // Kalender durchstreichen dunkelgrau
            ctx.setLineDash([4, 10]);
            ctx.lineWidth = 5;
            xpos=50;    
            ypos=305;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+725, ypos-215);
            ctx.stroke(); 
          }          

          xpos=550;    
          ypos=511;    
          ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON HK Dauernachtbetrieb
          ctx.fillRect(xpos+1,ypos-20,20,23);
          ctx.fillStyle = "#1F94B9";	/*EKH blau*/
          ctx.fillRect(xpos+4,ypos-17,14,17);
          ctx.fillStyle = "#000000";
          xpos=580;    
          ctx.fillText("Dauernachtbetrieb", xpos, ypos);        
          index = textToReplace.indexOf("2");               //  Dauernachtbetrieb
          if (index > 0) {
            ctx.strokeStyle = "#C31D64";         // EKH rot Kreuz setzen
            ctx.setLineDash([5,  0]);
            ctx.lineWidth = 3;
            xpos=xpos-25;    
            ypos=ypos-2;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos-12);
            ctx.stroke(); 
            ypos=ypos-12;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+12, ypos+12);
            ctx.stroke(); 
            ctx.strokeStyle = "#606060";         // Kalender durchstreichen dunkelgrau
            ctx.setLineDash([4, 10]);
            ctx.lineWidth = 5;
            xpos=50;    
            ypos=305;    
            ctx.beginPath();
            ctx.moveTo(xpos, ypos);
            ctx.lineTo(xpos+725, ypos-215);
            ctx.stroke(); 
          }          
        }

        var act=1;
        textToReplace = data['v056'].substring( 2, 40)    //  AKTION:   auslesen aus 19. Zeile grosses Display x 2-40           
        xpos=30;
        ypos=330;
        index = textToReplace.indexOf("anschauen");       // bei Aktion "anschauen" Darstellung schwarz
        if (index > 2) {
          ctx.fillStyle = "#000000";  
        }
        else {                                            // andere Aktion 
          index = textToReplace.indexOf("HT");       // bei Aktion "HT setzen" Darstellung rot
          if (index > 2) {
            ctx.fillStyle = "#C31D64";	/*EKH rot*/
            act=2;
          }
          else {
            index = textToReplace.indexOf("EIN");     // bei Aktion "EIN setzen" Darstellung rot
            if (index > 2) {
              ctx.fillStyle = "#C31D64";	/*EKH rot*/  
              act=2;
            }
            else {
            index = textToReplace.indexOf("Tag");     // bei Aktion "Tagbetrieb setzen" Darstellung rot
              if (index > 2) {
                ctx.fillStyle = "#C31D64";	/*EKH rot*/  
                act=2;
              }
              else {
                ctx.fillStyle = "#1F94B9";	/*EKH blau*/	//  sonst blau
                act=3;
              }
            }
          }
          ctx.font = "30px Arial";
          xpos=250;
        }
        ctx.fillText(textToReplace, xpos, ypos); 
        ctx.font = "20px Arial";

        xpos=20;    
        ypos=425;    
        ctx.fillText("Bedienung", xpos, ypos);        
        xpos=20;    
        ypos=451;     
        ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON Wochenkalender anschauen
        ctx.fillRect(xpos+1,ypos-20,20,23);
        ctx.fillStyle = "#1F94B9";	/*EKH blau*/
        ctx.fillRect(xpos+4,ypos-17,14,17);
        ctx.fillStyle = "#000000";
        xpos=50;    
        ctx.fillText("Wochenkalender anschauen", xpos, ypos);        
        if (act == 1) {
          ctx.strokeStyle = "#000000";         // Haken setzen
          ctx.setLineDash([5,  0]);
          ctx.lineWidth = 3;
          xpos=28;    
          ypos=442;    
          ctx.beginPath();
          ctx.moveTo(xpos, ypos);
          ctx.lineTo(xpos+5, ypos+5);
          ctx.lineTo(xpos+20, ypos-10);
          ctx.stroke(); 
        }          

        xpos=20;    
        ypos=481;    
        ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON rot setzen
        ctx.fillRect(xpos+1,ypos-20,20,23);
        ctx.fillStyle = "#1F94B9";	/*EKH blau*/
        ctx.fillRect(xpos+4,ypos-17,14,17);
     // ctx.fillStyle = "#C31D64";	/*EKH rot*/
        ctx.fillStyle = "#000000";
        xpos=50;    
        ctx.fillText("rot setzen (max. 5 Stunden zwischen 2 Klicks)", xpos, ypos);        
        if (act == 2) {
          ctx.strokeStyle = "#000000";         // Haken setzen
          ctx.setLineDash([5,  0]);
          ctx.lineWidth = 3;
          xpos=28;    
          ypos=472;    
          ctx.beginPath();
          ctx.moveTo(xpos, ypos);
          ctx.lineTo(xpos+5, ypos+5);
          ctx.lineTo(xpos+20, ypos-10);
          ctx.stroke(); 
        }          

        xpos=20;    
        ypos=511;    
        ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/             //  BUTTON blau setzen
        ctx.fillRect(xpos+1,ypos-20,20,23);
        ctx.fillStyle = "#1F94B9";	/*EKH blau*/
        ctx.fillRect(xpos+4,ypos-17,14,17);
     // ctx.fillStyle = "#1F94B9";	/*EKH blau*/
        ctx.fillStyle = "#000000";
        xpos=50;    
        ctx.fillText("blau setzen (max. 5 Stunden zwischen 2 Klicks)", xpos, ypos);        
        if (act == 3) {
          ctx.strokeStyle = "#000000";         // Haken setzen
          ctx.setLineDash([5,  0]);
          ctx.lineWidth = 3;
          xpos=28;    
          ypos=502;    
          ctx.beginPath();
          ctx.moveTo(xpos, ypos);
          ctx.lineTo(xpos+5, ypos+5);
          ctx.lineTo(xpos+20, ypos-10);
          ctx.stroke(); 
        }          
        ctx.fillStyle = "#000000";

        xpos=30;

        ctx.fillStyle = "#000000";  
        textToReplace = data['v057'].substring( 2, 40)    //  AKTION:    auslesen aus 20. Zeile grosses Display x 2-40              
        xpos=30;
        ypos=355;
        ctx.fillText(textToReplace, xpos, ypos); 

        // jetzt das Feld vom grossen Display auslesen ( "0" oder  "1")
        // und als Striche blau oder rot im Wochenkalender darstellen
        ypos=116;
        ctx.setLineDash([5,  0]);
        ctx.lineWidth = 6;
        for (i = 41; i < 55; i++) {
          for (k = 7; k < 80; k++) {
            variableName = "v0" + i;
            textToReplace = data[variableName].substring(k, k+1);
            xpos= 17 + k*5 + ((i-41) % 2)*360;
            if (textToReplace == '1') { 
              ctx.strokeStyle = "#C31D64";	/*EKH rot*/
              ctx.beginPath();
              ctx.moveTo(xpos, ypos);
              ctx.lineTo(xpos, ypos-16);
              ctx.stroke(); 
            }
            if (textToReplace == '0') { 
              ctx.strokeStyle = "#1F94B9";	/*EKH blau*/
              ctx.beginPath();
              ctx.moveTo(xpos, ypos);
              ctx.lineTo(xpos, ypos-10);
              ctx.stroke(); 
            }
          }
          if ( ((i-41) % 2) > 0 ) {
            ypos=ypos+30;
          }
        }
        // aktuelle Position markieren (senkrecht gestrichelt)
        x = data['v061'] -1; /*spalte, wo die texte anfang "rot" sein soll*/
        y = data['v062'] -1; /*Zeile, wo die Texte rot markiert werden muss*/
        xpos= 17 + x*5 + ((y-1) % 2)*360;
        var y1 = Math.floor((y-1)/2);
        ypos= 86 + y1*30;
        ctx.setLineDash([3,  2]);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(xpos, ypos);
        ctx.lineTo(xpos, ypos-22);
        ctx.stroke(); 
      }
      else {

        //status 1:  normales Menue(46 Spalten, 18 Zeilen) ab POS(x,y) z Zeichen rot
		if (window.stat1 == '1') {
			window.ASCII127PositionCurrentPage = [];
			ctx.fillStyle = "#D0D0D0";
			ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
			window.zykzaehler = window.zyklus;
			xpos = 1;
			ypos = 1;
			ctx.font = "bold 26px Courier New";
			ctx.fillStyle = "#000000";
			for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
				variableName = "v0" + i;

				ypos = ypos + 30;
				xpos = 1;
				if (i == y) {                                             //  Zeile in der die rote Stelle ist

					for (k = 0; k < 46; k++) {                              // alle 46 Zeichen der Zeile abarbeiten
						textToReplace = data[variableName].substring(k, k + 1)
						var ascii = textToReplace.charCodeAt(0);                // ASCII-Code des Zeichens ermitteln
						if (ascii == 127) {                                   // bei = 127  Button erstellen
							ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/
							//ctx.fillStyle = "#FF0000";	/*EKH hellblau*/
							//ctx.fillRect(xpos + 1, ypos - 20, 30, 30);
							ctx.fillRect(xpos + 1, ypos - 20, 20, 23);
							ctx.fillStyle = "#1F94B9";	/*EKH blau*/
							ctx.fillRect(xpos + 4, ypos - 17, 14, 17);
							ctx.fillStyle = "#000000";
							var row = i - 15;
							var column = k + 1;
							var coordinateOfClickButton = { row, column };
							window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
						}
						else {                                                //  /= 127  dann Zeichen hinschreiben
							if ((k > x - 1) && (k < x + z)) {                       //  liegt im Bereich rote Darstellung ?
								ctx.fillStyle = "#C31D64";	/*EKH rot*/           //  dann rot
								ctx.fillText(textToReplace, xpos, ypos);
								ctx.fillStyle = "#000000";
							}
							else {
								ctx.fillText(textToReplace, xpos, ypos);
							}
						}
						xpos = xpos + 16;
					}

				}
				else {                //  Zeile ohne rot
					for (k = 0; k < 46; k++) {                               // alle 46 Zeichen der Zeile abarbeiten
						textToReplace = data[variableName].substring(k, k + 1)
						var ascii = textToReplace.charCodeAt(0);                 // ASCII-Code des Zeichens ermitteln
						if (ascii == 127) {                                    // bei = 127  Button erstellen
							ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/
							ctx.fillRect(xpos + 1, ypos - 20, 20, 23);
							ctx.fillStyle = "#1F94B9";	/*EKH blau*/
							ctx.fillRect(xpos + 4, ypos - 17, 14, 17);
							ctx.fillStyle = "#000000";
							var row = i - 15;
							var column = k + 1;
							var coordinateOfClickButton = { row, column };
							window.ASCII127PositionCurrentPage.push(coordinateOfClickButton);
						}
						else {
							ctx.fillText(textToReplace, xpos, ypos);
						}
						xpos = xpos + 16;
					}
				}
			}
			if (window.toclipboard) {
				var texttoclip = "";
				for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
					variableName = "v0" + i;
					textToReplace = data[variableName]
					texttoclip = texttoclip.concat(textToReplace, String.fromCharCode(13, 10));
				}
				// navigator.clipboard.write(texttoclip)
				// event.clipboardData.setData(texttoclip)
				const el = document.createElement('textarea');
				el.value = texttoclip;
				document.body.appendChild(el);
				el.select();
				document.execCommand('copy');
				document.body.removeChild(el);
				window.toclipboard = false;
			}
		}
    
        else {
          //status 2:  Anzeigemenue rechte Displayhaelfte rot (ab POS(x>18))
          if (window.stat2 == '1'){
          	ctx.fillStyle = "#D0D0D0";
            ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);          // damit wird der CANVAS-Inhalt geloescht
            window.zykzaehler=window.zyklus;
            xpos= 1;    //  Positionsvariable auf dem CANVAS  x (Pixel) 
            ypos=-5;    //  Positionsvariable auf dem CANVAS  y (Pixel)
            ctx.font = "bold 26px Courier New";
            ctx.fillStyle = "#000000";  
            for (i = 16; i < 34; i++) {                               // alle 18 Zeilen abarbeiten
              variableName = "v0" + i;
              ypos=ypos+30;
              xpos=1;

              for (k = 0; k < 46; k++) {                              // alle 46 Zeichen der Zeile abarbeiten
                textToReplace = data[variableName].substring(k, k+1)    
                var ascii=textToReplace.charCodeAt(0);                // ASCII-Code des Zeichens ermitteln
                if (ascii == 127) {                                   // bei = 127  Button erstellen
                  ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/
                  ctx.fillRect(xpos+1,ypos-20,20,23);
                  ctx.fillStyle = "#1F94B9";	/*EKH blau*/
                  ctx.fillRect(xpos+4,ypos-17,14,17);
                  ctx.fillStyle = "#000000";
                }
                else {
                  if (k > 18) {
                    ctx.fillStyle = "#C31D64";	/*EKH rot*/  
                    ctx.fillText(textToReplace, xpos, ypos);
                    ctx.fillStyle = "#000000";  
                  }
                  else {
                    ctx.fillText(textToReplace, xpos, ypos);
                  }
                }
                xpos=xpos+16;
              } 

            }
            if (window.toclipboard) {
              var texttoclip="";
              for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
                variableName = "v0" + i;
                textToReplace = data[variableName]
                texttoclip=texttoclip.concat(textToReplace,String.fromCharCode(13, 10));
              }
           // navigator.clipboard.write(texttoclip)
           // event.clipboardData.setData(texttoclip)
              const el = document.createElement('textarea');
              el.value = texttoclip;
              document.body.appendChild(el);
              el.select();
              document.execCommand('copy');
              document.body.removeChild(el);
              window.toclipboard=false;
            }
          }
        
          else {

            //status 3:  grosser Bildschirm
            if (window.stat3 == '1') {
              jsonData = getData(kalenderUrl);
              data = JSON.parse(jsonData);
              x = data['v061'] -1; /*spalte, wo die texte anfang "rot" sein soll*/
              y = data['v062']+37;    /*Zeile, wo die Texte rot markiert werden muss*/
              z = data['v063'];   /*Anzahl der Zeichen, die rot markiert werden soll*/
            	ctx.fillStyle = "#D0D0D0";
              ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
              window.zykzaehler=window.zyklus;
              xpos= 1;   
              ypos= 1;   
              ctx.font = "bold 20px Courier New";
              ctx.fillStyle = "#000000";  
              for (i = 38; i < 60; i++) {                                 // alle 18 Zeilen abarbeiten
                variableName = "v0" + i;
        
                ypos=ypos+25;
                xpos=1;
                if (i == y) {                                             //  Zeile in der die rote Stelle ist
    
                  for (k = 0; k < 80; k++) {                              // alle 46 Zeichen der Zeile abarbeiten
                    textToReplace = data[variableName].substring(k, k+1)    
                    var ascii=textToReplace.charCodeAt(0);                // ASCII-Code des Zeichens ermitteln
                    if (ascii == 127) {                                   // bei = 127  Button erstellen
                      ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/
                      ctx.fillRect(xpos+1,ypos-20,20,23);
                      ctx.fillStyle = "#1F94B9";	/*EKH blau*/
                      ctx.fillRect(xpos+4,ypos-17,14,17);
                      ctx.fillStyle = "#000000";
                    }
                    else {                                                //  /= 127  dann Zeichen hinschreiben
                      if ((k > x-1) && (k < x+z)) {                       //  liegt im Bereich rote Darstellung ?
                        ctx.fillStyle = "#C31D64";	/*EKH rot*/           //  dann rot
                        ctx.fillText(textToReplace, xpos, ypos);
                        ctx.fillStyle = "#000000";  
                      }
                      else {
                        ctx.fillText(textToReplace, xpos, ypos);
                      }
                    }
                    xpos=xpos+11;
                  } 
    
                }
                else {                //  Zeile ohne rot
                  for (k = 0; k < 80; k++) {                               // alle 46 Zeichen der Zeile abarbeiten
                    textToReplace = data[variableName].substring(k, k+1)    
                    var ascii=textToReplace.charCodeAt(0);                 // ASCII-Code des Zeichens ermitteln
                    if (ascii == 127) {                                    // bei = 127  Button erstellen
                      ctx.fillStyle = "#23A6D1";	/*EKH hellblau*/
                      ctx.fillRect(xpos+1,ypos-20,20,23);
                      ctx.fillStyle = "#1F94B9";	/*EKH blau*/
                      ctx.fillRect(xpos+4,ypos-17,14,17);
                      ctx.fillStyle = "#000000";
                    }
                    else {
                      ctx.fillText(textToReplace, xpos, ypos);
                    }
                    xpos=xpos+11;
                  } 
                }
              }
            }

          }
        }
      } // if stst=4
  }    
}


/*****************Hanler für Menulink Click******************/
function AnchorHandler(id) {
  var menuLinkId = menuLink + id;
  var data = getData(menuLinkId);
  refreshTextAreaWithoutParameterLocal(fernbedienungCanvasContext, fernbedienungCanvas, data);  
}

function tabClickHanlder(target) {
  const {id} = target;
  window.activeTabID = id;

  document.querySelectorAll(`.tabContent, .tab`).forEach(el => el.classList.toggle(`active`, el.className.includes(target.id)));
  
	if (id == "fernbedienung") {
		resetNumlock();							//osk-Numpad-layout zurücksetzen
		window.timerReloadFb = setInterval(refreshTextAreaWithoutParameterLocal, 50, fernbedienungCanvasContext, fernbedienungCanvas );  /*  alle 50ms starten aber dann auf Zähler schauen <<< */
		//window.timerRemoteConnection = setInterval (updateBenachrichtigung, 5000);		// Aktivieren der paralellen Fernbedienung
		clearInterval(window.timerVisuReload); // Deaktivieren der Abholung der Visudaten 
		clearInterval(window.timerVisuKalenderReload);
		showElemementById("benachrichtigung");	
	}
  
    if (id == "visualisierung") {
		setNumlock();							//osk-layout auf Numpad wechseln
        startVisu();
		window.timerVisuReload = setInterval(ReloadData, 2000); //Lade Visudaten alle 2 Sekunden
		clearInterval(window.timerReloadFb); // Deaktivieren  der Datenabholung der Fernbedienung 
		clearInterval(window.timerRemoteConnection);
		clearInterval(window.timerVisuKalenderReload);
		hideElemementById("benachrichtigung");
    }

    if (id == "datenauswertung") {
		location.href = '#';					//sicherstellen dass YScaleModal geschlossen ist
		setNumlock();							//osk-layout auf Numpad wechseln
		startQH();								//Daten in Diagramm ausrichten
		clearInterval(window.timerReloadFb); // Deaktivieren  der Datenabholung der Fernbedienung 
		clearInterval(window.timerRemoteConnection);
		clearInterval(window.timerVisuReload); // Deaktivieren der Abholung der Visudaten 		
		clearInterval(window.timerVisuKalenderReload);
		hideElemementById("benachrichtigung");
    }
	
}

function updateBenachrichtigung (){
	var displayElement = document.getElementById('benachrichtigungText');
	var jsonData = getData(benachrichtigungsUrl);
	var data =  JSON.parse(jsonData);
	var message = 'Heizzentrale ' + prjName + '.	Fernbedienung aktiv durch: ' + '<span style="color:#C31D64">' + data['V064'].trim() + '</span>';
	displayElement.innerHTML = message;
}

function updateConnectionStatus(isConnected) {
  const connectionStatusIcon = document.querySelector(`.connectionStatusIcon`);
  connectionStatusIcon.classList.toggle(`connected`, isConnected);
  connectionStatusIcon.innerText = (isConnected) ? `\u2B24` : `↻`; //\u25CF
}

/*****************Hanler für Button Click ******************/
function EthernetButtonHanlder(id) {      /* <<< */
  
  if (id.includes("btnVirtualKeyboard")) {
	  var osk = document.getElementById("osk");
	  if (osk.style.display == "none") {
		  showElemementById('osk');
		  osk.style.top = '';
		  osk.style.left = '';
		  osk.style.bottom = '220px';
		  osk.style.right = '1.5vh';
	  }
	  else {
		  hideElemementById("osk");		  
	  }
  }
  
  if (id == "btnHome")	AnchorHandler(1);

  if ((id == "btnUp") || (id == "btnUpVisu")) 	var Tast='11';
  if ((id == "btnDown") || (id == "btnDownVisu"))	var Tast='10';
  if ((id == "btnLeft") || (id == "btnLeftVisu"))	var Tast='8';
  if ((id == "btnRight") || (id == "btnRightVisu")) var Tast='12';
  if (id == "btnEnter") var Tast='13';
  

  var TastURLId = TastURL + Tast;
  var data = getData(TastURLId);
  if (window.zykzaehler > window.einmalholen) {
    window.zykzaehler=window.einmalholen;
    window.tastzaehler=0;
  }
  else {
//  window.zykzaehler=window.zykzaehler+1;
    window.tastzaehler=window.einmalholen;
  }

  document.getElementById("btnEnter").focus();

}

//////////////////////EventListeners//////////////////////
function keypressEventHandler(ev) {
  //keypressEvent doesn't fire on controlInputs especially arrows, esc & ctrl needed for RTOS; in this cases keydownEventHandler is used!
    //=>keypress respects keyboardLayout & fires less than keydown, so prefer to use keypress over keydown
  const {key} = ev;
  //console.log(key, ev.type, ev);

  //Fernbedienung aktiv
  let charCode;
  if ((window.activeTabID.match(/(fernbedienung|wochenkalenderImVisu)/gi))) {
    charCode = (key.match(/(enter)/gi)) ? 13 : key.charCodeAt(0);
  }
  else if (window.activeTabID.match(/(datenauswertung)/gi)) {
    if (key.match(/(enter)/gi))
      ConfirmModalMenu();			//Enter Handling
  }
  
  //console.log(charCode);
  if (charCode)
    sendKeyInputToMPC(charCode);
}

function keydownEventHandler(ev) {
  //keypressEvent doesn't fire on controlInputs especially arrows, esc & ctrl needed for RTOS; in this cases keydownEventHandler is used!
    //=>keypress respects keyboardLayout & fires less than keydown, so prefer to use keypress over keydown
  const {key} = ev;
  //console.log(key, ev.type, ev);
  
  //preventScrolling on window overflow!
  if (key.match(/(arrow)/gi))
    ev.preventDefault();
  
  //Fernbedienung aktiv
  let charCode;
  if (window.activeTabID.match(/(fernbedienung|wochenkalenderImVisu)/gi)) {
    if (key.match(/(arrowUp)/gi))
      charCode = 11;        
    if (key.match(/(arrowDown)/gi))
      charCode = 10;
    if (key.match(/(arrowLeft)/gi))
      charCode = 8;
    if (key.match(/(arrowRight)/gi))
      charCode = 12;
    if (key.match(/(esc)/gi))
      charCode = 27;
    if (key.match(/(control)/gi))
      charCode = 17;

    //by Eckhard
    window.zykzaehler = Math.min(window.zykzaehler, window.einmalholen);
    window.tastzaehler = (window.zykzaehler === window.einmalholen) ? 0 : window.einmalholen;    
  }
  else if (window.activeTabID.match(/(datenauswertung)/gi)) {
    if (key.match(/(esc)/gi))
      location.href = '#';
  }
  
  //console.log(charCode);
  if (charCode)
    sendKeyInputToMPC(charCode);	
}
//////////////////////MPC Kommunikation//////////////////////
function sendKeyInputToMPC(charCode) {
  return getData(`${TastURL}${charCode}`);
}


//////////////////////Hilfsfunktionen//////////////////////
function constrain(_in, _min, _max) {
  const min = Math.min(parseFloat(_min), parseFloat(_max));
  const max = Math.max(parseFloat(_min), parseFloat(_max));
  return Math.max(Math.min(parseFloat(_in), max), min);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}


function hideElemementById(id)
{
   var selectedElement = document.getElementById(id);
   if (selectedElement != null) selectedElement.style.display = "none";
   return selectedElement;
}

function showElemementById(id)
{
   var selectedElement = document.getElementById(id); 
   if (selectedElement != null) selectedElement.style.display = "block";
   return selectedElement;
}

// return count of an object
function ojbCounts(obj) {
  var count = 0;
  for (var property in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, property)) {
      count++;
    }
  }
  return count;
}

/**
 * Return a string representing n as a 32-bit unsigned integer,
 * in binary notation.
 */
function b32(n) {
  // >>> ensures highest bit isn’t interpreted as a sign
  return (n >>> 0).toString(2).padStart(32, '0');
}

//string.replace does not work with the week-year calendar. Because the data contain only 1 and 0. The built-in function won't work
// we need a new replace function, where we can replace a character at particular postion. 
//Another point, in Javascript are string immutable, we can't change it "on the go". Best practices is create a new string and assign the changed content to it.
String.prototype.replaceAt = function(startIndex, replacement, numberOfCharacter) {
  return this.substr(0, startIndex) + replacement + this.substr(startIndex + numberOfCharacter);
}
