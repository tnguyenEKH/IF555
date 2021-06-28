/********************* URL SETTINGS *********************/
var dataUrl = 'http://172.16.0.102/JSONADD/GET?p=2&Var=all';
var kalenderUrl = 'http://172.16.0.102/JSONADD/GET?p=3&Var=all';
var benachrichtigungsUrl = 'http://172.16.0.102/JSONADD/GET?p=4&Var=sel&V064';
var getSteuerungNameUrl = 'http://172.16.0.102/JSONADD/GET?p=4&Var=sel&V065';
var uploadSkriptUrl = 'http://172.16.0.101/Data/upload.php';
var menuLink = 'http://172.16.0.102/JSONADD/PUT?V004=';
var TastURL = 'http://172.16.0.102/JSONADD/PUT?V010=';
var textInputUrl = 'http://172.16.0.102/JSONADD/PUT?V007=';
var QHDataFile = 'http://172.16.0.101/Data/2001.bin';

const HASH_FILE = '../SD_DATA/hash.txt';
var Projektname = '';

var projektnummer ="";
var numberOfDataTrack;
var visuAutoReload;
var fernbedienungAutoReload;
var benachrichtigungAutoReload;

var zyklus;               // ZUM SUCHEN <<< 
var einmalholen;          // ZUM SUCHEN <<< 
var zykzaehler;           // ZUM SUCHEN <<<
var tastzaehler;          // ZUM SUCHEN <<< 
var tastkey;              // ZUM SUCHEN <<< 
var tastcode;             // ZUM SUCHEN <<< 
var tastkeylength;        // ZUM SUCHEN <<< 
var tastascii;            // ZUM SUCHEN <<< 
var stat1;                // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
var stat2;                // 1: normale Ausgabe rot ab x > 20 
var stat3;                // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
var stat4;                // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
var statTastzahl;         // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zahleneingabe zu machen 
var statTastzeich;        // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
var stat14haktiv;        // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 
var mousex;               // 1: xPosition der Maus im Canvas
var mousey;               // 1: yPosition der Maus im Canvas
var allQHDataRecords  = [];

var activeTabID = "fernbedienung";


var Displaycanvas = document.getElementById("DisplayCanvas");    // Canvas global einrichten
    Displaycanvas.style.display = "block";                   // Canvas global einrichten
	var ctx = Displaycanvas.getContext('2d');                    // Canvas global einrichten
	var parent = document.getElementById('fernbedienungDisplay');
	//var parent = document.getElementsByClassName('hauptDisplay')[0];
	DisplayCanvas.width = parent.offsetWidth;
	DisplayCanvas.height = parent.offsetHeight;
var toclipboard = new Boolean("false");               // Communikation Klick->Clipboard
var statmouseweek = new Boolean("false");             // Maus befindet sich im Wochenkalenderfenster 

const bedien_pdf = new PDF_file('../SD_DATA/Bedien.pdf', 'bedien');
const slp_pdf = new PDF_file('../SD_DATA/SLP.pdf', 'slp');

/*********************URL Dekodieren und erzeugen ********/


$(document).ready(function () {
  /*Initialize table, layout, static variable....*/
	projektnummer = readFromTextFile(QHHeaderFile).substr(0,5);
	Projektname = JSON.parse(getData(getSteuerungNameUrl).trim())['V065'];
	QHDataFile = "http://172.16.0.101/Data/" + projektnummer.substr(1) + ".bin";
  
  /***********Layout************/
	// Table wird nicht mehr verwendet, da die Darstellung auf dem Canvas zum Einsatz kommt
	//tableBuilder(22);

	
	  /***********Operating******************/
  //function innerhalb setInterval soll keine Parameter und Rückgabewerten besitzen
	fernbedienungAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50);  /*  alle 50ms starten aber dann auf Zähler schauen <<< */
    updateBenachrichtigung();
    benachrichtigungAutoReload = setInterval(updateBenachrichtigung, 1000);		// Aktivieren der Aktualiserung der Benachrichtigung
	
  /**********Visualization*/
	initVisu();
  
  
  /*********Data evaluation********/
	//jw startQH();
	readQHFromFile(QHDataFile);
	numberOfDataTrack = parseInt(loadDataTrackNumber(QHHeaderFile)) + 10;

  


	zyklus=40;             // <<< 
	zykzaehler=10;         // <<<
	einmalholen=7;         // <<<
	
	/*******************************/
	fernbedienungAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50); // Aktivieren  der Datenabholung der Fernbedienung 
	benachrichtigungAutoReload = setInterval (updateBenachrichtigung, 5000);		 // Aktivieren der paralellen Fernbedienung
	
	callReader(bedien_pdf);
	callReader(slp_pdf);
});

/************Get all JSON from dataURL*************************************/
function getData(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false); // false for synchronous request because RTOS webserver does not return results on an asynchron request
    xhr.send();
    if (xhr.response == "{\"result\":\"OK\"}\r\n") {
        xhr.open("GET", dataUrl, false);
        xhr.send();
        return xhr.response
    }
    else {
        return xhr.response;
    }
}
/*Read Textfile aus dem Ordner */
function readFromTextFile(fileName) {
  var xhr = new XMLHttpRequest();
  xhr.overrideMimeType('text/plain; charset=Windows-1252')
  xhr.open("GET", fileName, false);
  if (fileName != QHSettingFile)
  {
	    xhr.setRequestHeader('Cache-Control', 'no-cache');
  }
  //exception handling
  try
  {
    xhr.send();
  }
  catch (e)
  {
    return null;
  }
  if (xhr.status == 500 || xhr.status == 404 || (xhr.status == 0 && xhr.responseText == ""))
    return null;
  else
  return xhr.responseText;
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
      record.Projektnumer = projektnummer;
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


function sendData(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", url, false);
    xhr.send();
    //console.log(xhr.responseText);
}


/**
 * Return a string representing n as a 32-bit unsigned integer,
 * in binary notation.
 */
function b32(n) {
  // >>> ensures highest bit isn’t interpreted as a sign
  return (n >>> 0).toString(2).padStart(32, '0');
}



function refreshTextAreaWithoutParameterLocal() {

  var jsonData;
  
    if (tastzaehler > 0) {                  // <<< 
      tastzaehler=tastzaehler-1;
      if (tastzaehler < 1) {
        zykzaehler=0;
      } 
    }
    if (zykzaehler > 1) {
      zykzaehler=zykzaehler-1;
    }
    else {                                   // <<< 
      if (tastzaehler < 2) {                             
        tastzaehler=0;
      } 
      jsonData = getData(dataUrl);
      data = JSON.parse(jsonData);
      var table = document.getElementById('displayTable');
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
      stat1=str.charAt(0);          // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
      stat2=str.charAt(1);          // 1: normale Ausgabe rot ab x > 20 
      stat3=str.charAt(2);          // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
      stat4=str.charAt(3);          // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
      statTastzahl=str.charAt(30);  // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" ode "T" eine Zahleneingabe 
      statTastzeich=str.charAt(31); // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
      stat14haktiv=str.charAt(29);  // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 
  
   // stat4 = '0';
   // stat3 = '1';
   // data['v033'] = str ;    /* Testausgabe  */
   // data['v059'] = str ;    /* Testausgabe  */

      //status 4:  Wochenkalender in CANVAS anzeigen    600 * 350                             
      // zykzaehler=zyklus; 
      if (stat4 == '1') {
        zykzaehler=zyklus;
        jsonData = getData(kalenderUrl);
        data = JSON.parse(jsonData);

        // Texttabelle verschwinden lassen, CANVAS darstellen
 //   	var table = document.getElementById("displayTable");
 //   	table.style.display = "none";
    //	var canvas = document.getElementById("testCanvas");
    //	Displaycanvas.style.display = "block";
    //	var ctx = Displaycanvas.getContext('2d');
    //  ctx.width = 800;
    //  ctx.height = 500;
      	ctx.fillStyle = "#E0E0E0";
        ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);
     //	ctx.clearRect(0, 0, Displaycanvas.width, Displaycanvas.height);
   
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


    //  JButton enter = new JButton("Enter");
    //  document.getElementById('buttonId').onclick = test;
    //  var button = document.createElement("button");
    //  button.innerHTML = "Do Something";

    //  var Eingabe;
    //  Eingabe = window.prompt("Welche Datei soll geoeffnet werden?","Dateiname mit Pfad");
    //  window.open(Eingabe);


    //  ctx.setLineDash([2, 5]);
    //  ctx.lineWidth = 1;
    //  ctx.strokeStyle = "#000000";
    //  ctx.beginPath();           // gestrichelte Linie 01:00
    //  ctx.moveTo(82, 90);
    //  ctx.lineTo(82, 305);
    //  ctx.stroke(); 
 
    //  ctx.beginPath();           // gestrichelte Linie 23:00
    //  ctx.moveTo(736, 90);
    //  ctx.lineTo(736, 305);
    //  ctx.stroke(); 
 



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
          timeweek();
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
        if (stat1 == '1') {
        	ctx.fillStyle = "#D0D0D0";
          ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
          zykzaehler=zyklus;
          xpos= 1;   
          ypos= 1;   
          ctx.font = "bold 26px Courier New";
          ctx.fillStyle = "#000000";  
          for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
            variableName = "v0" + i;
    
            ypos=ypos+30;
            xpos=1;
            if (i == y) {                                             //  Zeile in der die rote Stelle ist

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
                xpos=xpos+16;
              }

            }
            else {                //  Zeile ohne rot
              for (k = 0; k < 46; k++) {                               // alle 46 Zeichen der Zeile abarbeiten
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
                xpos=xpos+16;
              } 
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
          //status 2:  Anzeigemenue rechte Displayhaelfte rot (ab POS(x>18))
          if (stat2 == '1'){
          	ctx.fillStyle = "#D0D0D0";
            ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);          // damit wird der CANVAS-Inhalt geloescht
            zykzaehler=zyklus;
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
              jsonData = getData(kalenderUrl);
              data = JSON.parse(jsonData);
              x = data['v061'] -1; /*spalte, wo die texte anfang "rot" sein soll*/
              y = data['v062']+37;    /*Zeile, wo die Texte rot markiert werden muss*/
              z = data['v063'];   /*Anzahl der Zeichen, die rot markiert werden soll*/
            	ctx.fillStyle = "#D0D0D0";
              ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
              zykzaehler=zyklus;
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



function refreshTextAreaWithParameter(data) {
  data = JSON.parse(data);
    if (tastzaehler > 0) {                  // <<< 
      tastzaehler=tastzaehler-1;
      if (tastzaehler < 1) {
        zykzaehler=0;
      } 
    }
    if (zykzaehler > 1) {
      zykzaehler=zykzaehler-1;
    }
    else {                                   // <<< 
      if (tastzaehler < 2) {                             
        tastzaehler=0;
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
      stat1=str.charAt(0);          // 1: normale Ausgabe rot ab x,y fuer z Zeichen 
      stat2=str.charAt(1);          // 1: normale Ausgabe rot ab x > 20 
      stat3=str.charAt(2);          // 1: Ausgabe auf grossen Bildschirm (80*22 rot ab x,y fuer z Zeichen) 
      stat4=str.charAt(3);          // 1: Ausgabe Wochenkalender in grafischer Form auf CANVAS Element                     
      statTastzahl=str.charAt(30);  // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" ode "T" eine Zahleneingabe 
      statTastzeich=str.charAt(31); // 1: aktuelles Menue bietet die Moeglichkeit ueber Eingabe von "t" oder "T" eine Zeichenkette einzugeben 
      stat14haktiv=str.charAt(29);  // 1: Merlin ist beschaeftigt die Datei "viertdat.txt" zu erstellen 
  
      //status 4:  Wochenkalender in CANVAS anzeigen    600 * 350                             
      // zykzaehler=zyklus; 
      if (stat4 == '1') {
        zykzaehler=zyklus;
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
        xpos=xpos+180;
        ypos=ypos+ 0;
        ctx.fillText(textToReplace, xpos, ypos); 

        textToReplace = data['v040'].substring(42, 57)    //  Zustand zum Zeitpunkt    auslesen aus 3. Zeile grosses Display x 42-57
        xpos=xpos+180;
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
        ctx.fillText("0                             6                             12                            18                            24", xpos, ypos); 
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

        textToReplace = data['v056'].substring( 2, 40)    //  AKTION:   auslesen aus 19. Zeile grosses Display x 2-40           
        xpos=30;
        ypos=330;
        index = textToReplace.indexOf("anschauen");       // bei Aktion "anschauen" Darstellung schwarz
        if (index > 2) {
          ctx.fillStyle = "#000000";  
        }
        else {                                            // andere Aktion -> Darstellung rot
          ctx.fillStyle = "#C31D64";	/*EKH rot*/  
        }
        ctx.fillText(textToReplace, xpos, ypos); 

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
        if (stat1 == '1') {
        	ctx.fillStyle = "#D0D0D0";
          ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
          zykzaehler=zyklus;
          xpos= 1;   
          ypos= 1;   
          ctx.font = "bold 26px Courier New";
          ctx.fillStyle = "#000000";  
          for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
            variableName = "v0" + i;
    
            ypos=ypos+30;
            xpos=1;
            if (i == y) {                                             //  Zeile in der die rote Stelle ist

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
                else {                                                //  /= 127  dann Zeichen hinschreiben
                  if ((k > x-1) && (k < x+z)) {                       //  liegt im Bereich rote Darstellung ?
                    ctx.fillStyle = "#C31D64";	/*EKH rot*/                        //  dann rot
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
            else {                //  Zeile ohne rot
              for (k = 0; k < 46; k++) {                               // alle 46 Zeichen der Zeile abarbeiten
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
                xpos=xpos+16;
              } 
            }
          }
          if (toclipboard) {
            var texttoclip="";
            for (i = 16; i < 34; i++) {                                 // alle 18 Zeilen abarbeiten
              variableName = "v0" + i;
              textToReplace = data[variableName]
              texttoclip=texttoclip.concat(textToReplace,String.fromCharCode(13, 10));
            }
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
          //status 2:  Anzeigemenue rechte Displayhaelfte rot (ab POS(x>18))
          if (stat2 == '1'){
          	ctx.fillStyle = "#D0D0D0";
            ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);          // damit wird der CANVAS-Inhalt geloescht
            zykzaehler=zyklus;
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
              jsonData = getData(kalenderUrl);
              data = JSON.parse(jsonData);
              x = data['v061'] -1; /*spalte, wo die texte anfang "rot" sein soll*/
              y = data['v062']+37;    /*Zeile, wo die Texte rot markiert werden muss*/
              z = data['v063'];   /*Anzahl der Zeichen, die rot markiert werden soll*/
            	ctx.fillStyle = "#D0D0D0";
              ctx.fillRect(0, 0, Displaycanvas.width, Displaycanvas.height);            // damit wird der CANVAS-Inhalt geloescht
              zykzaehler=zyklus;
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
                        ctx.fillStyle = "#C31D64";	/*EKH rot*/                        //  dann rot
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
      } 
  }  
}


/*----------------------------------------------------------------------------------------------------------------------------------------
.read menu.txt from /RD02/menue.txt (alias /DATA/menue.txt)
  .Text will be parsed in an array by (\r)
  .first element of array is the project number
  .sidebarHtml: the whole html code of sidebar and will be initialized with "Hauptmenue" item
  .from 2nd element the html code of sidebar will be generated base on:
    .menuID : this was used for clickable Sidebar menu
    .menuPosition: decide if item on Main oder Sub-Menu "2,0" will be Main menu, "3,1" is the next level sub-menu and so on
    .menuPositionNextItem: this determine which html tag (ul, li, div) of previous menu will be close to prepare for the next menu.
  .try block will process the array till the penultimate item
  .catch block work for the last item, where the menuPositionNextItem is null.

.javascript does not support overloaded function, hence must 2 functions createMenuItem() and createMenuItemPosition20() be implemented.

.TODO: The conditional statements are not yet complete, hence we have 8 possible menuPosition and menuPositionNextItem
  this statement can be change if we change the design of sidebar Menu (html, javascript, css) or reverse engineering a completed Model.
*/
function menuBuilder() {
  var menuID;
  var menuPosition;
  var menuPositionNextItem;
  var menuName;
  var menuText = readFromTextFile("/DATA/menue.txt");
  var menuID = "";
  var menuTextInArray = menuText.split('\r'); 
	  projektnummer = menuTextInArray[0];
  var sidebar = document.getElementById("sidebar");
  //sidebarHtml declare and init with "root" menu Item
  var sidebarHtml = "<ul><li><a id=\"1\" href=\"#\" onclick=\"AnchorHandler(id)\"><span class=\"menu-text\">Hauptmenue</span></a></li>"
  for (var i = 2; i < menuTextInArray.length-1; i++) {
    //split() return an Array, split(separator)[0] return the first element of the array after split was done. Array index starts at zero.
    menuID = menuTextInArray[i].split(':')[0].trim();
    menuPosition = menuTextInArray[i].split(':')[1].trim().substring(0, 3);
    menuName = menuTextInArray[i].split(':')[1].trim().substring(4);
    try
    {
      menuPositionNextItem = menuTextInArray[i+1].split(':')[1].trim().substring(0, 3);
    
      if (menuPosition == "2,1")
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
      }
      else if(menuPosition == "2,0")  
      {
        sidebarHtml += createMenuItemPosition20("sidebar-dropdown", menuID, menuName, "sidebar-submenu");
      }
      else if ((menuPosition == "3,1") & (menuPositionNextItem == "3,1"))
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
      }
      else if ((menuPosition == "3,1") & (menuPositionNextItem == "2,0"))
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
        sidebarHtml += "</ul></div></li>";
      }
      else if ((menuPosition == "3,1") & (menuPositionNextItem == "3,0"))
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
      }
      else if (menuPosition == "3,0")
      {
        sidebarHtml += createMenuItemPosition20("sidebar-2nddropdown", menuID, menuName, "sidebar-2ndsubmenu");
      }
      else if ((menuPosition == "4,1") & (menuPositionNextItem == "4,1"))
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
      }
      else if ((menuPosition == "4,1") & (menuPositionNextItem == "2,0"))
      {
        sidebarHtml += createMenuItem("", menuID, menuName);      
        sidebarHtml += "</ul></div></li></ul></div></li>";
      }
      else if ((menuPosition == "4,1") & (menuPositionNextItem == "3,0"))   
      {
        sidebarHtml += createMenuItem("", menuID, menuName);      
        sidebarHtml += "</ul></div></li>";
      }
      else if ((menuPosition == "4,1") & (menuPositionNextItem == "3,1"))     
      {
        sidebarHtml += createMenuItem("", menuID, menuName) + "</ul></div></li>"; 
      }
      else if (menuPosition == "4,0")
      {
        sidebarHtml += createMenuItemPosition20("sidebar-3rddropdown", menuID, menuName, "sidebar-3rdsubmenu");
      }
      else if (menuPosition == "5,1")
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
      }
      else if ((menuPosition == "5,1") & (menuPositionNextItem == "4,1"))   
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
        sidebarHtml += "</ul></div></li>";
      }
      else if ((menuPosition == "3,1") & (menuPositionNextItem == "2,1"))   
      {
        sidebarHtml += createMenuItem("", menuID, menuName);
        sidebarHtml += "</ul></div></li>";
      }
    }
    catch
    {
      sidebarHtml += "</ul></div></li>"
      sidebarHtml += createMenuItem("", menuID, menuName);
      sidebarHtml += "</ul>";
    }
  }
  sidebar.innerHTML = sidebarHtml;
}

function createMenuItem(liElementClass, menuID, menuName)
{
  return "<li" + liElementClass + "><a id=\"" + menuID + "\" href=\"#\" onclick=\"AnchorHandler(id)\"><span class=\"menu-text\">" + menuName + "</span></a></li>";
}

function createMenuItemPosition20 ( liElementClass, menuID, menuName, divElementClass){
  return "<li class=\"" + liElementClass + "\"><a id=\"" + menuID + "\" href=\"#\" onclick=\"AnchorHandler(id)\"><span class=\"menu-text\">" + menuName + "</span></a><div class=\"" +divElementClass + "\"><ul>";
}
/* function createMenuItemPosition30 ( liElementClass, menuID, menuName, divElementClass){
  return "<ul><li class=\"" + liElementClass + "\"><a id=\"" + menuID + "\" href=\"#\" onclick=\"AnchorHandler(id)\"><span class=\"menu-text\">" + menuName + "</span></a><div class=\"" +divElementClass + "\"><ul>";
} */

 /*--------------------------------------------------------------------------------------------------------------------------------
Topbar navigation
canceling setInterval call when item "Anlagenüberwachung" was not selected
*/
function topBarNavigationHanlder(id) {

  if (id == "anlagenueberwachung") {
    nIntervID = setInterval(simVideoStream, 1000);
  }
  else {
    clearInterval(nIntervID);
  }
}


//Tabelle für die Darstellung der Texte
function tableBuilder(rowEntries) {

  var displayPanel = document.getElementById('displayPanel');
  var table = document.createElement('table');
  table.id = 'displayTable';
  var tableBody = document.createElement('tbody');
  var totalRows = 16 + rowEntries;
  for (var i = 16; i < totalRows; i++) {
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    tr.appendChild(td);
    tableBody.appendChild(tr);
  }

  table.appendChild(tableBody);
  displayPanel.appendChild(table);
}


/*****************Hanler für Tab Click******************/
function tabIdHanlder(evt, id)
{
    var i, tabcontent, tablinks, divBenachrichtigung;
	activeTabID = id;
    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) { 
        tabcontent[i].style.display = "none";
    }
     // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    // Show the current tab, and add an "active" class to the button that opened the tab
    var neutabID = id + "Display";
    document.getElementById(neutabID).style.display = "block";
    evt.currentTarget.className += " active";

  //die Visualisierung bzw. 1/4h Datenauswertung starten, wenn der entsprechende Tab angeklickt wird
    if (id == "visualisierung") {
		setNumlock();							//osk-layout auf Numpad wechseln
        startVisu();
		visuAutoReload = setInterval(ReloadData, 2000); //Lade Visudaten alle 2 Sekunden
    }
	if (id != "visualisierung") {
		clearInterval(visuAutoReload); // Deaktivieren der Abholung der Visudaten 
	}
	if (id == "fernbedienung") {
		resetNumlock();							//osk-Numpad-layout zurücksetzen
		fernbedienungAutoReload = setInterval(refreshTextAreaWithoutParameterLocal, 50); // Aktivieren  der Datenabholung der Fernbedienung 
		benachrichtigungAutoReload = setInterval (updateBenachrichtigung, 5000);		// Aktivieren der paralellen Fernbedienung
		
	}	
	if (id != "fernbedienung") {
		clearInterval(fernbedienungAutoReload); // Deaktivieren  der Datenabholung der Fernbedienung 
		clearInterval(benachrichtigungAutoReload);
	}
    if (id == "datenauswertung") {
		location.href = '#';					//sicherstellen dass YScaleModal geschlossen ist
		setNumlock();							//osk-layout auf Numpad wechseln
		startQH();								//Daten in Diagramm ausrichten
    }
	
  
  /*wegen des kleine Display  wird div#benachrichtigung nur angezeit, wenn das Modul fernbedienung aktiv ist
    für  visu und 1/4h daten wird das ausgeblendet
    */
  if(id != "fernbedienung") 
  {
    hideElemementById("benachrichtigung");
	
  }
  else{
    showElemementById("benachrichtigung");
  }

  if (id == "bedienungsAnleitung") {
	//bedien_pdf.getDoc();
	//callReader(bedien_pdf);//'../SD_DATA/Bedien.pdf', 'bedien');
  }

  if (id == "verdrahtungsplan") {
	//callReader(slp_pdf);
  }

}


function hideElemementById(id)
{
   var selectedElement = document.getElementById(id); 
   selectedElement.style.display = "none";
  
}

function showElemementById(id)
{
   var selectedElement = document.getElementById(id); 
   selectedElement.style.display = "block";
  
}

/********Update status**************/
function updateBenachrichtigung (){
	var displayElement = document.getElementById('benachrichtigungText');
	var jsonData = getData(benachrichtigungsUrl);
	var data =  JSON.parse(jsonData);
	var message = 'Heizzentrale ' + Projektname + '.	Fernbedienung aktiv durch: ' + '<span style="color:#C31D64">' + data['V064'].trim() + '</span>';
	displayElement.innerHTML = message;
}



/*****************Hanler für Menulink Click******************/
function AnchorHandler(id) {
  var menuLinkId = menuLink + id;
  var data = getData(menuLinkId);
  refreshTextAreaWithoutParameterLocal(data);  
}



/*****************Hanler für Button Click ******************/
function EthernetButtonHanlder(id) {      /* <<< */
  
  if (id.includes("btnVirtualKeyboard")) {
	  var osk = document.getElementById("osk");
	  if (osk.style.display == "none") {
		  showElemementById("osk");
	  }
	  else {
		  hideElemementById("osk");		  
	  }
  }
  
  if (id == "btnHome")	AnchorHandler(1);

  if (id == "btnUp") 	var Tast='11';
  if (id == "btnDown")	var Tast='10';
  if (id == "btnLeft")	var Tast='8';
  if (id == "btnRight") var Tast='12';
  if (id == "btnEnter") var Tast='13';
  

  var TastURLId = TastURL + Tast;
  var data = getData(TastURLId);
  if (zykzaehler > einmalholen) {
    zykzaehler=einmalholen;
    tastzaehler=0;
  }
  else {
//  zykzaehler=zykzaehler+1;
    tastzaehler=einmalholen;
  }

  document.getElementById("btnEnter").focus();

//  if (Tast == '116') {
//    if (statTastzahl == '1') {
//      Eingabefeld fuer eine Zahl darstellen (Touchblock,...)
//      nach Eingabe:  'http://172.16.0.102/JSONADD/PUT?V003=Zahl';
//    }
//    if (statTastzeich == '1') {
//      Eingabefeld fuer eine Zeichenkette darstellen (Touchblock,...)
//      nach Eingabe:  'http://172.16.0.102/JSONADD/PUT?V009=Zeichenkette';
//    }
//  }

}

$(function () {

  $('.list-group-item').on('click', function () {
    $('.glyphicon', this)
      .toggleClass('glyphicon-chevron-right')
      .toggleClass('glyphicon-chevron-down');
  });

});

/**********Keyboard stroke********/
$(document).keydown(function (event) {
	if (activeTabID == 'fernbedienung') {								//Fernbedienung aktiv
		//set focus on "#displayPanel" when a key was pressed. This prevent scroll effect, when the sidebar overflow
		var displayPanel = document.getElementById('displayPanel');
		displayPanel.focus();
		
		tastascii=0;
		tastkey = event.key;
		tastkeylength = tastkey.length;
		tastcode = event.keyCode;
		if (tastkeylength < 2) {         /* ein einzelnes Zeichen  */
			tastascii=tastkey.charCodeAt(0);
		}
		else {
			switch (tastcode) {
				case 37:  //  LEFT 
				  tastascii=8;
				  break;
				case 38:  //  UP 
				  tastascii=11;
				  break;
				case 39:  //  RIGTH
				  tastascii=12;
				  break;
				case 40:  //  DOWN
				  tastascii=10;
				  break;
				case 13:  //  ENTER
				  tastascii=13;
				  break;

				case 27:  //  ESC
				  tastascii=27;
				  break;
				case 17:  //  STRG
				  tastascii=17;
				  break; 

				default:
			}
		}
		
		if (tastascii > 0) {
			var TastURLId = TastURL + tastascii;
			var data = getData(TastURLId);
		}
		
		if (zykzaehler > einmalholen) {
			zykzaehler=einmalholen;
			tastzaehler=0;
		}
		else  {
			//  zykzaehler=zykzaehler+1;
			tastzaehler=einmalholen;
		}


		// if (tastascii == 116  || tastascii == 84) {
		//  if (statTastzahl == '1') {
		//  openInputModal();
		//      Eingabefeld fuer eine Zahl darstellen (Touchblock,...)
		//      nach Eingabe:  'http://172.16.0.102/JSONADD/PUT?V003=Zahl';
		//  }
		//    if (statTastzeich == '1') {
		//      Eingabefeld fuer eine Zeichenkette darstellen (Touchblock,...)
		//      nach Eingabe:  'http://172.16.0.102/JSONADD/PUT?V009=Zeichenkette';
		//    }
		//  }
		// }
	}
	if (activeTabID == "datenauswertung") {								//QH-Tab aktiv
		
		if (event.key.includes('Enter')) ConfirmModalMenu();			//Enter Handling	
		if (event.key.includes('Esc')) location.href = '#';				//Esc Handling
	}

	});


// Mausposition bei Click auf das CANVAS ermitteln (x austeilen auf Zeichenbreite, y aufteieln auf Zeilenhoehe)
// und als xy Position an die MPC uebermitteln (z.B:  x=20 y=10 -> uebermitteln 1000+y + 100*x -> 3010 )
Displaycanvas.addEventListener("click", function (evt) {
  var rect = Displaycanvas.getBoundingClientRect();

  if (stat4 == '1' && statmouseweek) {    //status 4:  Wochenkalender in CANVAS und Maus im Wochenfeld 
    var x= evt.clientX - rect.left;
    var y= evt.clientY - rect.top;
    var ypos = Math.round((y-76)/30)-1;
    var xpos = Math.round((x-50)/5);
    var maus = Math.round(4001+ypos*144+xpos) 
    var TastURLId = TastURL + maus;
    var data = getData(TastURLId);
  }
  else {
    var x= evt.clientX - rect.left;
    var y= 8 + evt.clientY - rect.top;
  
    var xr = Math.round(x/16)   //   /16 Zeichenbreite
    var yr = Math.round(y/30)   //   /30 Zeilenhoehe
  //  alert(xr + ',' + yr);
    var maus = Math.round(1000+yr*100+xr) 
    var TastURLId = TastURL + maus;
    var data = getData(TastURLId);
  }

  if (zykzaehler > einmalholen) {
    zykzaehler=einmalholen;
    tastzaehler=0;
  }
  else  {
//  zykzaehler=zykzaehler+1;
    tastzaehler=einmalholen;
  }

  if (xr > 54 && yr < 3) {
    toclipboard=true;
  }

//if (xr > 39 && yr < 2) {
//  document.getElementById("wochkalender").style.visibility = "visible";
//}
  
}, false);


function timeweek () {
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


Displaycanvas.addEventListener('mousemove', function (evt) {
  var rect = Displaycanvas.getBoundingClientRect();
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
      timeweek();
    }
  }

}, false);


//----------------------------------------------------------------------------------------------
// show input modal window when "t" or "T" was pressed
/*
function openInputModal()
{
  var modal = document.getElementById("inputModal");
  modal.style.display = "block";
  alert("T key was pressed");
}

/*
function ConfirmSaveValue()
{
  var value = $("#inputValue").val();
  textInputUrl += value; 
  sendData(textInputUrl);
}*/


/*************Hilfsfunktionen------------------*/

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

//clear table when swicht between the normal menu and lager menu (heizkreizkalender))
function clearDisplayTable (){
  var table = document.getElementById('displayTable');
  for (var i=0; i<22; i++){
    table.rows[i].innerHTML = "";
  }
}


//string.replace does not work with the week-year calendar. Because the data contain only 1 and 0. The built-in function won't work
// we need a new replace function, where we can replace a character at particular postion. 
//Another point, in Javascript are string immutable, we can't change it "on the go". Best practices is create a new string and assign the changed content to it.
String.prototype.replaceAt = function(startIndex, replacement, numberOfCharacter){
  return this.substr(0, startIndex) + replacement + this.substr(startIndex + numberOfCharacter);
}
