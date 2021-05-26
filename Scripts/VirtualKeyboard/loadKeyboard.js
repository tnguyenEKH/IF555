let Keyboard = window.SimpleKeyboard.default;

let keyboard = new Keyboard({
  onKeyPress: button => onKeyPress(button)
});

function onKeyPress(button) {
  tastascii=0;
  tastkey = button;
  tastkeylength = tastkey.length;
  tastcode = button.charCodeAt(0);
  if (tastkeylength < 2) {         /* ein einzelnes Zeichen  */
    tastascii=tastkey.charCodeAt(0);
  }
  else {
    switch (tastcode) {
 
    case 123:  //  ENTER
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
  /*
	// Get active tab [0 = Fernbedienung; 2 = QH-Tab]
	tablinks = document.getElementsByClassName("tablink");
	for (i = 0; i < tablinks.length; i++) {
		if (tablinks[i].className.includes("active")) {
			var activeTabID = i;
			i = tablinks.length;			
		}
	}
	*/
  
  if (tastascii > 0)  {
	if (activeTabID == "fernbedienung") {				//Fernbedienung aktiv
		var TastURLId = TastURL + tastascii;
		var data = getData(TastURLId);					//osk-input -> MPC
	}
	
	if (activeTabID == "datenauswertung") {				//QH-Tab aktiv		
		if (document.activeElement.id.length > 0) {		//Focus in InputFeld halten
			focusedInput = document.activeElement;
		}

		if (isNaN(tastkey)) {
			if (tastkey.includes('bksp')) {				//backspace Handling
				focusedInput.value = focusedInput.value.slice(0, -1);
				//focusedInput.setRangeText('');
			}
			if (tastkey.includes('enter')) {			//Enter Handling
				YScaleMenuConfirm();
			}
		}
		else {			//in ScaleMenue nur Zahleneingaben zulassen
			focusedInput.value += tastkey;
		}
		
	
	}
	
  }
  if (zykzaehler > einmalholen) {
    zykzaehler=einmalholen;
    tastzaehler=0;
  }
  else  {
//  zykzaehler=zykzaehler+1;
    tastzaehler=einmalholen;
  }

  /*handle shift*/
  if (button === "{shift}" || button === "{shiftleft}" || button === "{shiftright}") handleShift();
  
  /*handle numlock*/
  if (button === "{numlock}") handleNumlock();
}

function handleShift() {
  let currentLayout = keyboard.options.layoutName;
  let shiftToggle = currentLayout === "default" ? "shift" : "default";

  keyboard.setOptions({
    layoutName: shiftToggle
  });
}

function handleNumlock() {
  let currentLayout = keyboard.options.layoutName;
  let numToggle = currentLayout === "default" ? "numlock" : "default";

  keyboard.setOptions({
    layoutName: numToggle
  });
}

function setNumlock() {
  keyboard.setOptions({
    layoutName: "numlock"
  });
}

function resetNumlock() {
  keyboard.setOptions({
    layoutName: "default"
  });
}