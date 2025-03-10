/********************* SETTINGS *********************/
const LOCALE = true;
const TOUCHDISPLAY = LOCALE;

const MPC_TERMINAL_RELOAD_INTERVAL_MS = 2000; //ehemals zyklus=40 (*50ms Interval)
const MPC_TERMINAL_RELOAD_DELAY_AFTER_INPUT_MS = (LOCALE) ? 150 : 350; //ehemals einmalholen=7 (*50ms Interval)

/********************* KEYS *********************/
const ESC = `\x1b`;
const DEL = `\x7f`; //Btns in MPC Terminal

const KEY2MPC_CHAR_MAP = new Map([
  [`ArrowLeft`, 8],
  [`ArrowRight`, 12],
  [`ArrowUp`, 11],
  [`ArrowDown`, 10],
  [`Enter`, 13],
  [`Escape`, 27],
  [`Control`, 17],
  //oskInput:
  [`←`, 8],
  [`→`, 12],
  [`↑`, 11],
  [`↓`, 10],
  [`⏎`, 13],
  [`␛`, 27]
]);


/********************* COLORS *********************/
//Colors here in rgb, because style.color will return rgb-format
const WHITE_GREY = `hsl(0, 0%, 95%)`;
const ZAEHLER_BG = `hsl(0, 0%, 88%)`;
const BG_COLOR = `hsl(0, 0%, 75%)`;

const MAGENTA_HSL = `hsl(334, 74%, 44%)`;
const MAGENTA_HEX = `#c31d65`;
const MAGENTA_RGB = `rgb(195, 29, 101)`;
const CYAN_HSL = `hsl(194, 74%, 44%)`;
const CYAN_HSLA = `hsla(194, 74%, 44%, .5)`;
const CYAN_HEX = `#1d9cc3`;
const CYAN_RGB = `rgb(29, 156, 195)`;
const PURPLE_HSL = `hsl(264, 74%, 44%)`;
const PURPLE_HEX = `#601dc3`;
const PURPLE_RGB = `rgb(96, 29, 195)`;
const YELLOW_HSL = `hsl(50, 74%, 44%)`;
const YELLOW_HEX = `#c3a81d`;
const YELLOW_RGB = `rgb(195, 168, 29)`;
const GREEN_HSL = `hsl(120, 74%, 44%)`;
const GREEN_HEX = `#1dc31d`;
const GREEN_RGB = `rgb(29, 195, 29)`;
const COLORS_HEX = [MAGENTA_HEX, CYAN_HEX, PURPLE_HEX, YELLOW_HEX, GREEN_HEX];

/********************* URL SETTINGS *********************/
const mpcJsonAddUrl = `http://172.16.0.102/JSONADD/`;
const mpcJsonGetUrl = `${mpcJsonAddUrl}GET?`;
const mpcJsonPutUrl = `${mpcJsonAddUrl}PUT?`;

//p=[1-6] available:
//p=1: v011: 0xUnknownStatus; v012: 0xDisplayStatus, v013: xDisplayRot, v014: xDisplayRot, v015: zDisplayRot
//p=2: v016-v033: Displayzeilen (klein 46x18), v034: 0xDisplayStatus, v035-v037: xyz-redTxt
//p=3: v038-v059: Displayzeilen (gross 80x22), v060: 0xDisplayStatus, v061-v063: xyz-redTxt
//p=4: v064: connectedUsers, v065: ProjectName, v066-069: unknown
//p=5: v070-v089: FaceplateData
//p=6: v090-v109: FaceplateResponseData

const dataUrl = `${mpcJsonGetUrl}p=2&Var=all`;
const kalenderUrl = `${mpcJsonGetUrl}p=3&Var=all`;
const benachrichtigungsUrl = `${mpcJsonGetUrl}p=4&Var=sel&V064`;
const getSteuerungNameUrl = `${mpcJsonGetUrl}p=4&Var=sel&V065`;

const menuLink = `${mpcJsonPutUrl}V004=`;
const keyInputUrl = `${mpcJsonPutUrl}V010=`;
const textInputUrl = `${mpcJsonPutUrl}V007=`;

const piDataUrl = `http://172.16.0.101/Data/`;
const uploadSkriptUrl = `${piDataUrl}upload.php`;

const MPC_H0_URL = `../SD_DATA/`;
const HASH_FILE_URL = `${MPC_H0_URL}hash.txt`;
const MANUAL_URL = `${MPC_H0_URL}Bedien.pdf`;
const SLP_URL = `${MPC_H0_URL}SLP.pdf`;

/********************* Projekt SETTINGS *********************/
var projektNummer ="";
var numberOfDataTrack;
var allQHDataRecords  = [];

var wochenKalenderImVisuAutoReload;

/********************* Operating SETTINGS *********************/
var stat1;                // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
var stat2;                // 1: normale Ausgabe rot ab x > 20 
var stat3;                // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
var stat4;                // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
var statTastzahl;         // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zahleneingabe zu machen 
var statTastzeich;        // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
var stat14haktiv;        // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 
var mousex;               // 1: xPosition der Maus im Canvas
var mousey;               // 1: yPosition der Maus im Canvas
var toclipboard;              // Communikation Klick->Clipboard
var statmouseweek;

var currentDataSet;
var ASCII127PositionCurrentPage = [];  

//Canvas für die Darstellung der WochenKalender auf "Visualisierung" Reiter
var wochenKalenderImVisuCanvas;
var wochenKalenderImVisuCanvasContext;

var toclipboard = new Boolean("false");               // Communikation Klick->Clipboard
var statmouseweek = new Boolean("false");             // Maus befindet sich im Wochenkalenderfenster 

/********************* VanillaDocReady *********************/
window.addEventListener('load', function () {
  init();
}, false);

/********************* Init *********************/
async function init() {
  if (TOUCHDISPLAY) {
    appendOSK(document.body);
    hideOsk();
  }
  initVisu();
  //reloadTerminal(kalenderUrl);
	/*Initialize layout, static variable....*/	
  let fetchedData = await fetchTxt(QHHeaderFile);
  projektNummer = fetchedData.match(/P\s*\d+/).at(0);
  updateProjectName(getSteuerungNameUrl);
	
	initCanvas();
  reloadFernbedienung();
	
	
  const bedien_pdf = new PDF_file(MANUAL_URL, 'bedien');
	const slp_pdf = new PDF_file(SLP_URL, 'slp');
  callReader(bedien_pdf);
	callReader(slp_pdf);

  tabSwitchHandler(document.querySelector(`#visualisierung`));

  document.body.addEventListener(`keydown`, keyDownEventHandler);
}

/********************* EventHandlers *********************/
function keyDownEventHandler(ev) {
  keyDownKeyHandler(ev.key);  
}
async function keyDownKeyHandler(key) {
  const activeTabId = document.querySelector(`.tablink.active`).id;
  //console.log(key, KEY2MPC_CHAR_MAP.get(key), key.charCodeAt(0));
  const asciiKey = (KEY2MPC_CHAR_MAP.get(key)) ? KEY2MPC_CHAR_MAP.get(key) : 
                   (key.length === 1) ? key.charCodeAt(0) :
                   undefined;

  if (asciiKey) {
    if (activeTabId.match(/(fernbedienung)|(visuWochenkalender)/)) {
      document.body.setAttribute(`cursorStyle`, `progress`);
      const response = await fetchJSON(`${keyInputUrl}${asciiKey}`);
      if (updateConnectionStatus(!!response)) {
        asyncTimeout(reloadFernbedienung, MPC_TERMINAL_RELOAD_DELAY_AFTER_INPUT_MS);
      }
    }
    else if (activeTabId === `datenauswertung`) {
      if (asciiKey === 13) { //Enter Handling
        ConfirmModalMenu();
      }
      else if (asciiKey === 27) { //Esc Handling
        location.href = '#';
      }
    }
  }
}
/*********************** COM *************************************/
function fetchLiveData(projectNo) {
  const url = `WebServiceEK.asmx/getVisuDataRaw`;
  const options = {};
  options.method = `POST`;
  options.headers = {};
  options.headers[`Content-Type`] = `application/json; charset=utf-8`;
  options.body = `{Projektnummer: '${projectNo}'}`;
  
  return fetchJSON(url, options);
}

function fetchVisuServerFile(projectNo) {
  const url = `WebServiceEK.asmx/loadVisuFile`;
  const options = {};
  options.method = `POST`;
  options.headers = {};
  options.headers[`Content-Type`] = `application/json; charset=utf-8`;
  options.body = `{fname: '${projectNo}'}`;
  
  return fetchJSON(url, options);
}

function isAdmin() {
  if (window.DEBUG) {
      return true;
  }
  const url = `WebServiceEK.asmx/isAdmin`;
  const options = {};
  options.method = `POST`;
  options.headers = {};
  options.headers[`Content-Type`] = `application/json; charset=utf-8`;
  options.body = `{}`;

  return fetchJSON(url, options);
}

async function fetchJSON(url, options) {
  try {
    const res = await fetch(url, options);
    if (res.ok) {
      const data = await res.json();
      return (data.d) ? data.d : data;
    }
    else {
      console.error(`ServerErrorStatus: ${res.status}`);
    }
  }
  catch(err) {
    console.error(err);
  }
}

function fetchLiveDataLocal() {
  const url = LIVE_DATA_URL;
  const charset = `windows-1252`;
  const options = {};
  options.method = `GET`;
  options.headers = {};
  options.headers[`Content-Type`] = `text/plain; charset=${charset}`;
  //options.body = `{Projektnummer: '${projectNo}'}`;
  
  return fetchTxt(url, charset, options);
}

async function fetchTxt(url, charset, options) {
  try {
    const res = await fetch(url, options);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const decoder = new TextDecoder(charset);
      const data = decoder.decode(buffer);
      return data;
    }
    else {
      console.error(`ServerErrorStatus: ${res.status}`);
    }
  }
  catch(err) {
    console.error(err);
  }
}

/********************************Operating**************************************************************************/

function initCanvas() {
  const displayCanvas = document.querySelector(`#DisplayCanvas`);
  const canvasContext = displayCanvas.getContext(`2d`);
	var parent = displayCanvas.parentNode;
	displayCanvas.width = parent.width;
	parent.offsetWidth > 0 ? displayCanvas.width = parent.offsetWidth : displayCanvas.width = 960;
	parent.offsetHeight > 0 ? displayCanvas.height = parent.offsetHeight : displayCanvas.height = 520;
	//var parent = document.getElementById('fernbedienungDisplay');
	//displayCanvas.width = parent.offsetWidth;
	//displayCanvas.height = parent.offsetHeight;
  
  displayCanvas.addEventListener("click", async function (evt) {
    document.body.setAttribute(`cursorStyle`, `progress`);
    var rect = displayCanvas.getBoundingClientRect();

    let response;
    if (stat4 == '1' && statmouseweek) {    //status 4:  Wochenkalender in CANVAS und Maus im Wochenfeld 
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;
      var ypos = Math.round((y - 76) / 30) - 1;
      var xpos = Math.round((x - 50) / 5);
      var maus = Math.round(4001 + ypos * 144 + xpos)
      var TastURLId = keyInputUrl + maus;
      console.log(maus);
      response = await fetchJSON(TastURLId);
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
      for (var m = 0; m < ASCII127PositionCurrentPage.length; m++) {
          if (yr == ASCII127PositionCurrentPage[m].row) {
              allASCII127ColumnInRow.push(ASCII127PositionCurrentPage[m].column);
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
          if (stat4 != '1') {
              if ((allASCII127ColumnInRow[n] < xr) && (xr <= allASCII127ColumnInRow[(n + 1)])) {
                anchor = allASCII127ColumnInRow[n+1];
              }
          }
          //stat4 =1 bedeutet größeres Display für Wochenkalender, die ASCII127 liegen am Anfang der Zeile, muss sonder behandelt werden
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
      var TastURLId = keyInputUrl + maus;
      //console.log(maus);
      response = await fetchJSON(TastURLId);
    }

    if (updateConnectionStatus(!!response)) {
      asyncTimeout(reloadFernbedienung, MPC_TERMINAL_RELOAD_DELAY_AFTER_INPUT_MS);
    }

    if (xr > 54 && yr < 3) {
      toclipboard=true;
    }
    
  }, false);
	
	
	displayCanvas.addEventListener('mousemove', function (evt) {
	  var rect = displayCanvas.getBoundingClientRect();
	  var x= evt.clientX - rect.left;
	  var y= evt.clientY - rect.top;
	  var xr = Math.round(x/1) 
	  var yr = Math.round(y/1) 

	  statmouseweek=false;

	  if (stat4 == '1') {    //status 4:  Wochenkalender in CANVAS anzeigen 
		if (xr > 50 && xr < 768 && yr > 91 && yr < 300) { 
		  statmouseweek=true;
		  mousex=xr;
		  mousey=yr;
		  timeweek(canvasContext);
		}
	  }
	  if (stat1 == '1') {
	    //$('#DisplayCanvas').css('cursor', 'default');
		var x = evt.clientX - rect.left;
		var y = 8 + evt.clientY - rect.top;
		var xr = Math.round(x / 16)   //   /16 Zeichenbreite (spalte column)
		var yr = Math.round(y / 30)   //   /30 Zeilenhoehe (zeile row)
		for (var i = 0; i < ASCII127PositionCurrentPage.length; i++) {
				if ((yr == ASCII127PositionCurrentPage[i].row) && (x < 530)) {
					//$('#DisplayCanvas').css('cursor', 'pointer');
				}
			}
		}
	}, false);
}

function timeweek (canvasContext) {
  ctx = canvasContext;	
  ctx.fillStyle = "#E0E0E0";
  ctx.fillRect(775, 90, 70, 220);

  var ypos = 85 + 30*(Math.round((mousey-76)/30));
  var timehour = Math.round((mousex-64)/30);
  var timemin = 10*Math.round((mousex-50-timehour*30)/5);
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

async function reloadTerminal(url = kalenderUrl) {
  const terminalData = await fetchJSON(url);
  const terminalDataArray = Object.values(terminalData);
  const redTxtLength = terminalDataArray.pop();
  const redTextRowStart = constrain(terminalDataArray.pop() - 1, 0); //mpcDataIdxBase = 1 => idx-1 to get 0-basedIdxs; 
  const redTextCol = constrain(terminalDataArray.pop() - 1, 0); //mpcDataIdxBase = 1 => idx-1 to get 0-basedIdxs
  const displayStatus = hexToBinaryString(terminalDataArray.pop());
  const isHomeDisplay = !!parseInt(displayStatus[1]);
  const redTextColStartHome = 20;
  const redTextColStart = (isHomeDisplay) ? redTextColStartHome : redTextCol;
  const redTextColEnd = (isHomeDisplay) ? undefined : redTextColStart + redTxtLength;


  //console.log(terminalDataArray, redTextRowStart, redTextColStart, redTextColEnd);

  document.querySelector(`.mpcTerminal`).remove();
  const mpcTerminal = document.createElement(`div`);
  document.querySelector(`#fernbedienungDisplay .container`).appendChild(mpcTerminal);
  mpcTerminal.classList.add(`mpcTerminal`);

  terminalDataArray.forEach((rowString, rowIdx) => {
    const rowSpan = document.createElement(`span`);
    mpcTerminal.appendChild(rowSpan);

    const leftBlackSpan = document.createElement(`span`);
    if (rowIdx < redTextRowStart || (!isHomeDisplay && redTxtLength === 0)) {
      rowSpan.appendChild(leftBlackSpan);
      leftBlackSpan.innerText = rowString;
      if (rowString.includes(DEL)) {
        leftBlackSpan.setAttribute(`terminalbtn-col-idx`, rowString.indexOf(DEL));
        leftBlackSpan.setAttribute(`terminalbtn-row-idx`, rowIdx);
        leftBlackSpan.setAttribute(`cursorStyle`, `pointer`);
        leftBlackSpan.addEventListener(`click`, mpcTerminalClickEventHandler);
      }
    }
    else {
      if (redTextColStart > 0) {
        rowSpan.appendChild(leftBlackSpan);
        const leftBlackString = rowString.slice(0, redTextColStart);
        leftBlackSpan.innerText = leftBlackString
        if (leftBlackString.includes(DEL)) {
          leftBlackSpan.setAttribute(`terminalbtn-col-idx`, rowString.indexOf(DEL));
          leftBlackSpan.setAttribute(`terminalbtn-row-idx`, rowIdx);
          leftBlackSpan.setAttribute(`cursorStyle`, `pointer`);
          leftBlackSpan.addEventListener(`click`, mpcTerminalClickEventHandler);
        }
      }

      const redSpan = document.createElement(`span`);
      rowSpan.appendChild(redSpan);
      redSpan.setAttribute(`color`, `magenta`);
      const redString = rowString.slice(redTextColStart, redTextColEnd);
      redSpan.innerText = redString;
      if (redString.includes(DEL)) {
        redSpan.setAttribute(`terminalbtn-col-idx`, rowString.indexOf(DEL));
        redSpan.setAttribute(`terminalbtn-row-idx`, rowIdx);
        redSpan.setAttribute(`cursorStyle`, `pointer`);
        redSpan.addEventListener(`click`, mpcTerminalClickEventHandler);
      }

      if (redTextColEnd) {
        const rightBlackSpan = document.createElement(`span`);
        rowSpan.appendChild(rightBlackSpan);
        const rightBlackString = rowString.slice(redTextColEnd);
        rightBlackSpan.innerText = rightBlackString;
        if (rightBlackString.includes(DEL)) {
          rightBlackSpan.setAttribute(`terminalbtn-col-idx`, rowString.indexOf(DEL));
          rightBlackSpan.setAttribute(`terminalbtn-row-idx`, rowIdx);
          rightBlackSpan.setAttribute(`cursorStyle`, `pointer`);
          rightBlackSpan.addEventListener(`click`, mpcTerminalClickEventHandler);
        }
      }
    }
  });
}
async function mpcTerminalClickEventHandler(ev) {
  const colIdx = parseInt(ev.target.getAttribute(`terminalbtn-col-idx`)) + 1; //pearl has base-1-idxs
  const rowIdx = parseInt(ev.target.getAttribute(`terminalbtn-row-idx`)) + 1; //pearl has base-1-idxs
  const keyVal = 1000 + 100*rowIdx + colIdx;
  console.log(`${keyInputUrl}${keyVal}`);
  const response = await fetchJSON(`${keyInputUrl}${keyVal}`);
  if (updateConnectionStatus(!!response)) {
    asyncTimeout(reloadTerminal, 50);
  }
}


async function reloadFernbedienung(data) {
  //console.log(`reload...`);
	const DisplayCanvas = document.querySelector(`#DisplayCanvas`);
	const ctx = DisplayCanvas.getContext(`2d`);
  
  data = (!data) ? await fetchJSON(dataUrl) : data;
  if (updateConnectionStatus(!!data)) {
    var x = data['v035'] - 1; //spalte, wo die texte anfang "rot" sein soll
    var y = data['v036'] + 15;    //Zeile, wo die Texte rot markiert werden soll
    var z = data['v037'];   //Anzahl der Zeichen, die rot markiert werden soll
    var s = data['v034'];   
    // DISPSTATUS(v034):
    // MSB(Bit0): standardausgabe (klein p=2), Bit1: halb-rot-ausgabe (klein p=2), Bit2/3: große ausgabe (p=3)
    // Bit29: MPC busy creating viertdat.txt, Bit30: enter `T` to enter NUMBER, Bit31: enter `T` to enter STRING
    var variableName = "";
    var textToReplace = "";
    var str = hexToBinaryString(s);
    //console.log(str);
    var xpos= 1;                  //  Positionsvariable auf dem CANVAS  x (Pixel) 
    var ypos= 1;                  //  Positionsvariable auf dem CANVAS  y (Pixel)
    stat1=str.charAt(0);          // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
    stat2=str.charAt(1);          // 1: normale Ausgabe rot ab x > 20 
    stat3=str.charAt(2);          // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
    stat4=str.charAt(3);          // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
    statTastzahl=str.charAt(30);  // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" ode "T" eine Zahleneingabe 
    statTastzeich=str.charAt(31); // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
    stat14haktiv=str.charAt(29);  // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 

    //status 4:  Wochenkalender in CANVAS anzeigen    600 * 350
    if (stat4 == '1') {
      var row = 15;
      var column = 2;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);
      var row = 15;
      var column = 35;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);

      var row = 16;
      var column = 2;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);
      var row = 16;
      var column = 35;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);

      var row = 17;
      var column = 2;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);
      var row = 17;
      var column = 35;
      var coordinateOfClickButton = { row, column };
      ASCII127PositionCurrentPage.push(coordinateOfClickButton);
        
      data = await fetchJSON(kalenderUrl);
      if (updateConnectionStatus(!!data)) {
          ctx.clearRect(0, 0, DisplayCanvas.width, DisplayCanvas.height);
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

          if (statmouseweek) {
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
    }
    else {

      //status 1:  normales Menue(46 Spalten, 18 Zeilen) ab POS(x,y) z Zeichen rot
      if (stat1 == '1') {
        ASCII127PositionCurrentPage = [];
        ctx.clearRect(0, 0, DisplayCanvas.width, DisplayCanvas.height);            // damit wird der CANVAS-Inhalt geloescht
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
                ASCII127PositionCurrentPage.push(coordinateOfClickButton);
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
                ASCII127PositionCurrentPage.push(coordinateOfClickButton);
              }
              else {
                ctx.fillText(textToReplace, xpos, ypos);
              }
              xpos = xpos + 16;
            }
          }
        }
        if (toclipboard) {
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
          toclipboard = false;
        }
      }
      
          else {
            //status 2:  Anzeigemenue rechte Displayhaelfte rot (ab POS(x>18))
            if (stat2 == '1'){
              ctx.clearRect(0, 0, DisplayCanvas.width, DisplayCanvas.height);          // damit wird der CANVAS-Inhalt geloescht
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
              if (toclipboard) {
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
                toclipboard=false;
              }
            }
          
            else {

              //status 3:  grosser Bildschirm
              if (stat3 == '1') {
                data = await fetchJSON(kalenderUrl);
                x = data['v061'] -1; /*spalte, wo die texte anfang "rot" sein soll*/
                y = data['v062']+37;    /*Zeile, wo die Texte rot markiert werden muss*/
                z = data['v063'];   /*Anzahl der Zeichen, die rot markiert werden soll*/
                ctx.clearRect(0, 0, DisplayCanvas.width, DisplayCanvas.height);            // damit wird der CANVAS-Inhalt geloescht
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
      
    document.body.removeAttribute(`cursorStyle`);
  }
}
/*****************Hanler für Menulink Click******************/
async function AnchorHandler(id) {
  const data = await fetchJSON(`${menuLink}${id}`);
  if (updateConnectionStatus(!!data)) {
    reloadFernbedienung(data);
  }
}

function tabSwitchClickEventHandler(ev) {
  tabSwitchHandler(ev.target);
}
function tabSwitchHandler(target) {
  document.querySelectorAll(`.tabcontent`).forEach(el => el.classList.toggle(`hidden`, el !== document.querySelector(`#${target.id}Display`)));
  document.querySelectorAll(`.tablink`).forEach(el => el.classList.toggle(`active`, el === target));
  document.querySelector(`.connectedUsers`).classList.toggle(`displayNone`, target.id !== `fernbedienung`);
  document.querySelector(`.mpcTimeStamp`).classList.toggle(`displayNone`, target.id !== `visualisierung`);
  document.querySelector(`.lockStatus`).classList.toggle(`displayNone`, target.id !== `visualisierung`);

	if (target.id == "fernbedienung") {
    //reloadTerminal();
    //document.body.timerReloadTerminal = setInterval(reloadTerminal, 50);
    reloadFernbedienung();
    document.body.timerFernbedienung = setInterval(reloadFernbedienung, MPC_TERMINAL_RELOAD_INTERVAL_MS);
		updateConnectedUsers();
    document.body.timerConnectedUsers = setInterval (updateConnectedUsers, 5000);
    if (TOUCHDISPLAY) {
      appendOSK(undefined, `min`);
      showOsk();
    }
	}
  else {
    clearInterval(document.body.timerReloadTerminal);
    clearInterval(document.body.timerFernbedienung);
    clearInterval(document.body.timerConnectedUsers);
    if (TOUCHDISPLAY) {
      hideOsk();
    }
  }
  
  if (target.id == "visualisierung") {
    reloadVisuLiveData();
    document.body.timerVisu = setInterval(reloadVisuLiveData, 2000);
  }
  else {
    clearInterval(document.body.timerVisu);
  }

  if (target.id == "datenauswertung") {
    startQH();
  }
  else if (target.id == "bedienungsAnleitung") {
	//callReader(bedien_pdf);//'../SD_DATA/Bedien.pdf', 'bedien');
  }
  else if (target.id == "verdrahtungsplan") {
	//callReader(slp_pdf);
  }
}

async function updateConnectedUsers() {
  const data = await fetchJSON(benachrichtigungsUrl);
  if (updateConnectionStatus(!!data)) {
    const connectedUsers = document.querySelector(`.connectedUsers`);
    connectedUsers.innerText = `connected users: ${data.V064.trim()}`;
  }
}

async function updateProjectName(url) {
  const data = await fetchJSON(url);
  if (updateConnectionStatus(!!data)) {
    const projectName = document.querySelector(`.projectName`);
    projectName.innerText = data.V065.trim();
    return data.V065.trim();
  }
}

function updateConnectionStatus(status) {
  const connectionStatus = document.querySelector(`.connectionStatus`);
	connectionStatus.innerText = (!!status) ? `connected` : `disconnected`;
  connectionStatus.classList.toggle(`errorHighlighter`, !status);
  return !!status;
}
/*************Hilfsfunktionen------------------*/
function showOsk() {
  document.querySelector(`.osk[layout]`).style.display = `grid`;
}
function hideOsk() {
  document.querySelector(`.osk[layout]`).style.display = `none`;
}
function appendOSK(target, layout = `default`, allowMultipleOSKs = false, keyDownIntervalMs = 20) {
  const existingOsk = document.querySelector(`.osk[layout]`);
  if (!allowMultipleOSKs && existingOsk && layout === existingOsk.getAttribute(`layout`) && `${keyDownIntervalMs}` === existingOsk.getAttribute(`keyDownIntervalMs`)) {
    //don't do anything if existingOSK has same Attributes
    return existingOsk;
  }
  else {    
    const oskParent = (existingOsk) ? existingOsk.parentNode : undefined;
    if (!allowMultipleOSKs && existingOsk) {
      existingOsk.remove();
    }  
    const targetParent = (target) ? target : (oskParent) ? oskParent : undefined;
    if (targetParent) {
      const osk = createOSK(layout, keyDownIntervalMs);
      targetParent.appendChild(osk);
      return osk;
    }
  }
}
function createOSK(layout = `default`, keyDownIntervalMs = 20) {
  const osk = document.createElement(`div`);
  osk.classList.add(`osk`);
  osk.setAttribute(`layout`, layout);
  osk.setAttribute(`keyDownIntervalMs`, keyDownIntervalMs);
  const layoutStr = (layout.match(/num/i)) ?
  `"_7 _8 _9 №"
    "_4 _5 _6 ⌫"
    "_1 _2 _3 ⏎"
    "_0 ↑ . ⏎"
    "← ↓ → ⏎"`
  : (layout.match(/min/i)) ?
  `"ƒ ↑ ⏎"
    "← ↓ →"`
  :
  `"␛ _1 _2 _3 _4 _5 _6 _7 _8 _9 _0 ß ⌫"
    "↹ q w e r t z u i o p ü ␡"
    "⇫ a s d f g h j k l ö ä ⏎"
    "⇧ y x c v b n m . - __ ↑ ⏎"
    "№ ƒ ␠ ␠ ␠ ␠ ␠ ␠ ␠ ␠ ← ↓ →"`;//*/    

  //osk.style.position = `absolute`;
  //osk.style.bottom = `0px`;
  //osk.style.width = `100%`;
  //osk.style.height = `100%`;
  osk.style.gridArea = `osk`;
  osk.style.display = `grid`;
  osk.style.gridTemplateAreas = layoutStr;//`"1 2 3"`;
  
  layoutStr.replaceAll(`"`, ``).split(` `).filter(el => !!el).forEach(el => {
    const oskKey = document.createElement(`input`);
    oskKey.type = `button`;
    osk.appendChild(oskKey);
    oskKey.value = el.replace(`_`, ``).trim();
    oskKey.style.gridArea = el;
    oskKey.style.padding = `0`;
    oskKey.style.fontSize = `250%`;

    //style checked №Key for numpad
    if (layout.match(/num/i) && oskKey.value === `№`) {
      oskKey.style.backgroundColor = `rgb(208, 208, 215)`;
      oskKey.style.borderStyle = `inset`;
    }
  });

  const supportedElements = `textarea:not([readonly]):not([disabled]), [type=text]:not([readonly]):not([disabled]), [type=password]:not([readonly]):not([disabled]), [type=number]:not([readonly]):not([disabled])`
  
  document.body.addEventListener(`focusin`, oskFocusedElementEventHandler);
  document.body.addEventListener(`focusout`, oskFocusedElementEventHandler);
  function oskFocusedElementEventHandler (ev) {
    if (ev.type === `focusout`) {
      hideOsk();
    }
    else if (ev.target.matches(supportedElements)) {
      const currentLayout = document.querySelector(`.osk[layout]`).getAttribute(`layout`);
      if (ev.target.matches(`[type=number], [type=password]`) && !currentLayout.match(/(num)/i)) {
        appendOSK(undefined, `num`);
      }
      else if (!currentLayout.match(/(default)/i)) {
        appendOSK();
      }
      showOsk();
    }
  }

  osk.addEventListener(`mousedown`, oskMousedownEventHandler);
  osk.addEventListener(`touchstart`, oskMousedownEventHandler);
  
  osk.addEventListener(`mouseup`, oskMouseupEventHandler);
  osk.addEventListener(`mouseout`, oskMouseupEventHandler);
  osk.addEventListener(`touchend`, oskMouseupEventHandler);
  osk.addEventListener(`touchcancel`, oskMouseupEventHandler);

  function oskMouseupEventHandler(ev) {
    const osk = ev.target.closest(`.osk`);
    clearInterval(osk.timerKeyDown);
    osk.timerKeyDown = undefined;
    clearInterval(osk.timerStartKeyDown);
    osk.timerStartKeyDown = undefined;
  }

  function oskMousedownEventHandler(ev) {
    ev.preventDefault();
    const key = ev.target;
    const keyVal = key.value;
    const osk = key.closest(`.osk`);
    const focusedInput = (document.activeElement.matches(supportedElements)) ? document.activeElement : null;

    if (osk.timerStartKeyDown) {
      osk.timerStartKeyDown = undefined;
      osk.timerKeyDown = setInterval(oskMousedownEventHandler, keyDownIntervalMs, ev);
    }
    if (!osk.timerStartKeyDown && !osk.timerKeyDown) {
      osk.timerStartKeyDown = setTimeout(oskMousedownEventHandler, 500, ev);
    }

    //possible MPCinputs
    if (keyVal.match(/[↑← ↓ →⏎⌂␛]/)) {
      if (focusedInput) {
        if (keyVal.match(/[⏎␛]/)) {
          focusedInput.blur();
        }
        else {
          const {selectionStart, selectionEnd, textLength} = focusedInput;
          console.log(selectionStart, selectionEnd, textLength);
          const caretPosition = (keyVal === `↑`) ? textLength :
                                (keyVal === `↓`) ? 0 :
                                (keyVal === `←`) ? Math.max(0, selectionStart - 1) :
                                (keyVal === `→`) ? Math.min(parseInt(textLength), parseInt(selectionStart) + 1) :
          focusedInput.selectionStart = caretPosition;
          focusedInput.selectionEnd = caretPosition;
          //buggy...dunno why...
        }
      }
      else {
        //send Input to MPC
        if (keyVal === `⌂`) {
          AnchorHandler(1);
        }
        else {
          keyDownKeyHandler(keyVal);
          /*
          const rtosKeyId = (keyVal === `↑`) ? `11` :
                            (keyVal === `↓`) ? `10` :
                            (keyVal === `←`) ? `8` :
                            (keyVal === `→`) ? `12` :
                            (keyVal === `⏎`) ? `13` :
                            undefined;
          const responsePromise = fetchJSON(`${keyInputUrl}${rtosKeyId}`);
          */
        }
      }
    }
    else if (keyVal === `↹`) {
      document.activeElement.blur();
    }
    else if (keyVal === `№`) {
      oskMouseupEventHandler(ev);
      const layout = (key.closest(`.osk`).getAttribute(`layout`).match(/num/i)) ? `default` : `num`;
      appendOSK(undefined, layout);
    }
    else if (keyVal === `⇫`) {
      const capsLock = osk.toggleAttribute(`caps-lock`);
      key.style.backgroundColor = (capsLock) ? `rgb(208, 208, 215)` : ``;
      key.style.borderStyle = (capsLock) ? `inset` : ``;
      
      const shift = osk.matches(`[shift]`); 
      osk.querySelectorAll(`input[type=button]`).forEach(btn => {
        btn.value = ((capsLock | shift) && !btn.matches(`[value=ß]`)) ? btn.value.toUpperCase() : btn.value.toLowerCase();
      });
    }
    else if (keyVal === `⇧`) {
      const shift = osk.toggleAttribute(`shift`);
      key.style.backgroundColor = (shift) ? `rgb(208, 208, 215)` : ``;
      key.style.borderStyle = (shift) ? `inset` : ``;

      const capsLock = osk.matches(`[caps-lock]`); 
      osk.querySelectorAll(`input[type=button]`).forEach(btn => {
        btn.value = ((capsLock | shift) && !btn.matches(`[value=ß]`)) ? btn.value.toUpperCase() : btn.value.toLowerCase();
      });
    }
    else if (focusedInput) {
      const {selectionStart, selectionEnd} = focusedInput;
      const preSelection = focusedInput.value.slice(0, selectionStart);
      const selection = focusedInput.value.slice(selectionStart, selectionEnd);
      const pastSelection = focusedInput.value.slice(selectionEnd);
      if (keyVal === `⌫`) {
        focusedInput.value = (selection) ? preSelection.concat(pastSelection) : preSelection.slice(0, -1).concat(pastSelection);
        focusedInput.selectionStart = (selection) ? selectionStart : Math.max(0, selectionStart - 1);
      }
      else if (keyVal === `␡`) {
        focusedInput.value = (selection) ? preSelection.concat(pastSelection) : preSelection.concat(pastSelection.slice(1));
        focusedInput.selectionStart = selectionStart;
      }
      else {
        //ordenary character Key; whitespace included
        //uncheck ShiftKey
        osk.removeAttribute(`shift`);
        const shiftKey = osk.querySelector(`input[type=button][value=⇧]`);
        if (shiftKey) {
          shiftKey.style.backgroundColor = ``;
          shiftKey.style.borderStyle = ``;
        }

        //return to lowerCase if not caps-lock
        if (!osk.matches(`[caps-lock]`)) {
          osk.querySelectorAll(`input[type=button]`).forEach(btn => btn.value = btn.value.toLowerCase());
        }
        //input to focusedInput
        focusedInput.value = preSelection.concat((keyVal === `␠`) ? ` ` : keyVal).concat(pastSelection);
        focusedInput.selectionStart = selectionStart + 1;
      }
      focusedInput.selectionEnd = focusedInput.selectionStart;
      //workaround pinInputEventHandler(): inputEvent doesn't trigger on oskInput...
      if (focusedInput.value.length === parseInt(focusedInput.getAttribute(`maxlength`))) {
        document.querySelector(`.modalFooterConfirmBtn`).focus();
      }
    }
  };

  return osk;
}

function constrain(_in, _min = Number.NEGATIVE_INFINITY, _max = Number.POSITIVE_INFINITY) {
  const min = Math.min(parseFloat(_min), parseFloat(_max));
  const max = Math.max(parseFloat(_min), parseFloat(_max));
  return Math.max(Math.min(parseFloat(_in), max), min);
}


function hideElemementById(id) {
   const el = document.querySelector(`#${id}`);
   if (el) {
    el.classList.add(`hidden`);
   }
   return el;
}

function showElemementById(id) {
  const el = document.querySelector(`#${id}`);
  if (el) {
   el.classList.remove(`hidden`);
  }
  return el;
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


function hexToBinaryString(val) {
  const byteCount = val.replace(`0x`, ``).length / 2;
  const bitCount = 8 * byteCount;
  // >>> ensures highest bit isn’t interpreted as a sign
  return (val >>> 0).toString(2).padStart(bitCount, '0');
}

//string.replace does not work with the week-year calendar. Because the data contain only 1 and 0. The built-in function won't work
// we need a new replace function, where we can replace a character at particular postion. 
//Another point, in Javascript are string immutable, we can't change it "on the go". Best practices is create a new string and assign the changed content to it.
String.prototype.replaceAt = function(startIndex, replacement, numberOfCharacter){
  return this.substr(0, startIndex) + replacement + this.substr(startIndex + numberOfCharacter);
}
