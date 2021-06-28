let Keyboard = window.SimpleKeyboard.default;

let keyboard = new Keyboard({
	onKeyPress: button => onKeyPress(button)
});

function onKeyPress(button) {
	//console.log(button);
	//console.log(button.length);
	
	if (button.includes('shift')) handleShift();
	if (button.includes('numlock')) handleNumlock();
	
	
	if (activeTabID == 'fernbedienung') {								//Fernbedienung aktiv
		tastascii = 0;
		
		if (button.length > 1) {		
			if (button.includes('bksp')) tastascii = 8;
			if (button.includes('space')) tastascii = 32;
			if (button.includes('enter')) tastascii = 13;
			if (button.includes('esc')) tastascii = 27;
			if (button.includes('strg')) tastascii = 17;
			if (button.includes('tab')) tastascii = 9;	
		}
		else {
			tastascii = button.charCodeAt(0);
		}
	
		if (tastascii != 0) var data = getData(TastURL + tastascii);	//osk-input -> MPC
		
		if (zykzaehler > einmalholen) {
			zykzaehler=einmalholen;
			tastzaehler=0;
		}
		else {
		//  zykzaehler=zykzaehler+1;
			tastzaehler=einmalholen;
		}
	}
	
	
	if (activeTabID != 'fernbedienung'/*== "datenauswertung"*/) {								//QH-Tab aktiv		
		if (document.activeElement.id.length > 0) {						//Focus in InputFeld halten
			focusedInput = document.activeElement;
		}

		if (isNaN(button)) {
			if (button == '-' || button == '.' || button == ',')
				focusedInput.value += button;							//Sign & Fraction Handling
			
			if (button.includes('enter')) ConfirmModalMenu();			//Enter Handling
			
			if (button.includes('esc')) location.href = '#';			//Esc Handling
			
			if (button.includes('bksp')) {								//Backspace Handling
				focusedInput.value = focusedInput.value.slice(0, -1);
				//focusedInput.setRangeText('');
			}
		}
		else {															//in ScaleMenue nur Zahleneingaben zulassen
			focusedInput.value += button;
		}
		
	
	}
	
	
	//console.log(button);
	//console.log(button.length);
	
  
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